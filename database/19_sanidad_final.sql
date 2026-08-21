-- =====================================================================
-- GanaderoPro | Sanidad
-- File: 19_sanidad_final.sql
-- Purpose:
--   Complete the remaining SANIDAD database infrastructure after
--   migrations 00-18 have already been executed successfully.
--
-- Includes:
--   1) Final inventory stock engine.
--   2) Explicit adjustment validation.
--   3) Transfer rejection until destination-aware transfers exist.
--   4) Append-only protection for inventory movements.
--   5) Protection against direct stock changes.
--   6) Supporting indexes.
--   7) Operational views for Sanidad.
--   8) Dashboard summary view.
--
-- IMPORTANT:
--   - Does NOT recreate existing tables.
--   - Does NOT modify public.animales.
--   - Does NOT migrate existing data.
--   - Does NOT recreate existing schemas/types.
--   - Reuses core.actualizar_updated_at().
--   - RLS is intentionally NOT enabled here because the project's
--     existing authentication/role mapping must be verified first.
-- =====================================================================


-- =====================================================================
-- 1. FINAL VALIDATION FOR INVENTORY MOVEMENTS
-- =====================================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'movimientos_inventario_cantidad_positiva'
          AND conrelid = 'sanidad.movimientos_inventario'::regclass
    ) THEN
        ALTER TABLE sanidad.movimientos_inventario
            ADD CONSTRAINT movimientos_inventario_cantidad_positiva
            CHECK (cantidad > 0);
    END IF;
END;
$$;

COMMENT ON CONSTRAINT movimientos_inventario_cantidad_positiva
ON sanidad.movimientos_inventario IS
    'La cantidad de un movimiento siempre debe ser positiva; la dirección se determina por tipo y ajuste_tipo.';


-- =====================================================================
-- 2. INVENTORY STOCK ENGINE
-- =====================================================================

CREATE OR REPLACE FUNCTION core.aplicar_movimiento_inventario()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    v_tipo text;
    v_delta numeric;
    v_stock_actual numeric;
BEGIN
    v_tipo := NEW.tipo::text;

    -- ---------------------------------------------------------------
    -- cantidad must always be positive
    -- ---------------------------------------------------------------

    IF NEW.cantidad IS NULL OR NEW.cantidad <= 0 THEN
        RAISE EXCEPTION
            'La cantidad del movimiento debe ser mayor a cero. Recibido: %.',
            NEW.cantidad;
    END IF;


    -- ---------------------------------------------------------------
    -- transferencias are not supported by the current data model
    -- ---------------------------------------------------------------

    IF v_tipo = 'transferencia' THEN
        RAISE EXCEPTION
            'Las transferencias de inventario todavía no están soportadas.';
    END IF;


    -- ---------------------------------------------------------------
    -- determine signed stock delta
    -- ---------------------------------------------------------------

    CASE v_tipo

        WHEN 'entrada' THEN
            v_delta := NEW.cantidad;

        WHEN 'salida' THEN
            v_delta := -NEW.cantidad;

        WHEN 'ajuste' THEN

            IF NEW.ajuste_tipo = 'aumento' THEN
                v_delta := NEW.cantidad;

            ELSIF NEW.ajuste_tipo = 'disminucion' THEN
                v_delta := -NEW.cantidad;

            ELSE
                RAISE EXCEPTION
                    'Un movimiento de tipo ajuste requiere ajuste_tipo = aumento o disminucion.';
            END IF;

        ELSE
            RAISE EXCEPTION
                'Tipo de movimiento de inventario no soportado: %.',
                v_tipo;

    END CASE;


    -- ---------------------------------------------------------------
    -- Positive delta
    -- ---------------------------------------------------------------

    IF v_delta > 0 THEN

        UPDATE sanidad.inventario_sanitario
        SET cantidad = cantidad + v_delta
        WHERE id = NEW.inventario_id;

        IF NOT FOUND THEN
            RAISE EXCEPTION
                'No existe el lote de inventario %. ',
                NEW.inventario_id;
        END IF;

        RETURN NEW;

    END IF;


    -- ---------------------------------------------------------------
    -- Negative delta
    -- Row lock guarantees safe concurrent stock operations.
    -- ---------------------------------------------------------------

    SELECT cantidad
    INTO v_stock_actual
    FROM sanidad.inventario_sanitario
    WHERE id = NEW.inventario_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION
            'No existe el lote de inventario %.',
            NEW.inventario_id;
    END IF;


    IF v_stock_actual < ABS(v_delta) THEN
        RAISE EXCEPTION
            'Stock insuficiente en el lote %. Disponible: %, requerido: %.',
            NEW.inventario_id,
            v_stock_actual,
            ABS(v_delta);
    END IF;


    UPDATE sanidad.inventario_sanitario
    SET cantidad = cantidad + v_delta
    WHERE id = NEW.inventario_id;


    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION core.aplicar_movimiento_inventario() IS
    'Actualiza automáticamente el stock sanitario de forma transaccional para entradas, salidas y ajustes direccionales. Rechaza transferencias y evita stock negativo.';


DROP TRIGGER IF EXISTS trg_movimientos_inventario_aplicar_stock
ON sanidad.movimientos_inventario;

CREATE TRIGGER trg_movimientos_inventario_aplicar_stock
AFTER INSERT ON sanidad.movimientos_inventario
FOR EACH ROW
EXECUTE FUNCTION core.aplicar_movimiento_inventario();


-- =====================================================================
-- 3. APPEND-ONLY PROTECTION
-- =====================================================================

CREATE OR REPLACE FUNCTION core.bloquear_cambios_movimientos_inventario()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    RAISE EXCEPTION
        'movimientos_inventario es un historial inmutable. Para corregir un movimiento, registre un movimiento compensatorio.';
END;
$$;

COMMENT ON FUNCTION core.bloquear_cambios_movimientos_inventario() IS
    'Impide modificar o eliminar movimientos del historial de inventario.';


DROP TRIGGER IF EXISTS trg_movimientos_inventario_no_update
ON sanidad.movimientos_inventario;

CREATE TRIGGER trg_movimientos_inventario_no_update
BEFORE UPDATE ON sanidad.movimientos_inventario
FOR EACH ROW
EXECUTE FUNCTION core.bloquear_cambios_movimientos_inventario();


DROP TRIGGER IF EXISTS trg_movimientos_inventario_no_delete
ON sanidad.movimientos_inventario;

CREATE TRIGGER trg_movimientos_inventario_no_delete
BEFORE DELETE ON sanidad.movimientos_inventario
FOR EACH ROW
EXECUTE FUNCTION core.bloquear_cambios_movimientos_inventario();


-- =====================================================================
-- 4. PROTECT DIRECT STOCK CHANGES
-- =====================================================================

CREATE OR REPLACE FUNCTION core.proteger_cantidad_inventario()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN

    IF NEW.cantidad IS DISTINCT FROM OLD.cantidad
       AND pg_trigger_depth() = 0 THEN

        RAISE EXCEPTION
            'La cantidad de inventario no puede modificarse directamente. Registre un movimiento de inventario.';

    END IF;

    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION core.proteger_cantidad_inventario() IS
    'Impide modificar directamente inventario_sanitario.cantidad desde la aplicación. El stock debe cambiar mediante movimientos.';


DROP TRIGGER IF EXISTS trg_inventario_sanitario_proteger_cantidad
ON sanidad.inventario_sanitario;

CREATE TRIGGER trg_inventario_sanitario_proteger_cantidad
BEFORE UPDATE ON sanidad.inventario_sanitario
FOR EACH ROW
EXECUTE FUNCTION core.proteger_cantidad_inventario();


-- =====================================================================
-- 5. SUPPORTING INDEXES
-- =====================================================================

CREATE INDEX IF NOT EXISTS idx_aplicaciones_sanitarias_proxima_fecha_estado
ON sanidad.aplicaciones_sanitarias (proxima_fecha, estado)
WHERE estado = 'activo'
  AND proxima_fecha IS NOT NULL;


CREATE INDEX IF NOT EXISTS idx_tratamientos_estado_fecha_fin
ON sanidad.tratamientos (estado, fecha_fin);


CREATE INDEX IF NOT EXISTS idx_enfermedades_estado_fecha_fin
ON sanidad.enfermedades (estado, fecha_fin);


CREATE INDEX IF NOT EXISTS idx_campana_animales_campana_estado
ON sanidad.campana_animales (campana_id, estado);


-- =====================================================================
-- 6. VIEW: UPCOMING SANITARY APPLICATIONS
-- =====================================================================

CREATE OR REPLACE VIEW sanidad.vw_proximas_aplicaciones AS
SELECT
    a.id AS aplicacion_id,
    a.animal_id,
    an.nombre AS animal_nombre,
    an.arete AS animal_arete,
    a.catalogo_id,
    c.nombre AS producto,
    c.tipo AS tipo_producto,
    a.fecha_aplicacion,
    a.proxima_fecha,
    (a.proxima_fecha - CURRENT_DATE) AS dias_restantes,
    a.veterinario_id,
    v.nombre AS veterinario,
    a.lote,
    a.dosis,
    a.responsable,
    a.observaciones
FROM sanidad.aplicaciones_sanitarias a
JOIN public.animales an
    ON an.id = a.animal_id
JOIN sanidad.catalogo_sanitario c
    ON c.id = a.catalogo_id
LEFT JOIN sanidad.veterinarios v
    ON v.id = a.veterinario_id
WHERE a.estado = 'activo'
  AND a.proxima_fecha IS NOT NULL
  AND a.proxima_fecha >= CURRENT_DATE;

COMMENT ON VIEW sanidad.vw_proximas_aplicaciones IS
    'Próximas aplicaciones sanitarias activas.';


-- =====================================================================
-- 7. VIEW: OVERDUE APPLICATIONS
-- =====================================================================

CREATE OR REPLACE VIEW sanidad.vw_aplicaciones_vencidas AS
SELECT
    a.id AS aplicacion_id,
    a.animal_id,
    an.nombre AS animal_nombre,
    an.arete AS animal_arete,
    a.catalogo_id,
    c.nombre AS producto,
    c.tipo AS tipo_producto,
    a.fecha_aplicacion,
    a.proxima_fecha,
    (CURRENT_DATE - a.proxima_fecha) AS dias_atraso,
    a.veterinario_id,
    v.nombre AS veterinario,
    a.lote,
    a.dosis,
    a.responsable,
    a.observaciones
FROM sanidad.aplicaciones_sanitarias a
JOIN public.animales an
    ON an.id = a.animal_id
JOIN sanidad.catalogo_sanitario c
    ON c.id = a.catalogo_id
LEFT JOIN sanidad.veterinarios v
    ON v.id = a.veterinario_id
WHERE a.estado = 'activo'
  AND a.proxima_fecha IS NOT NULL
  AND a.proxima_fecha < CURRENT_DATE;

COMMENT ON VIEW sanidad.vw_aplicaciones_vencidas IS
    'Aplicaciones sanitarias activas cuya próxima fecha ya venció.';


-- =====================================================================
-- 8. VIEW: ACTIVE TREATMENTS
-- =====================================================================

CREATE OR REPLACE VIEW sanidad.vw_tratamientos_activos AS
SELECT
    t.id AS tratamiento_id,
    e.id AS enfermedad_id,
    e.animal_id,
    an.nombre AS animal_nombre,
    an.arete AS animal_arete,
    e.nombre AS enfermedad,
    e.estado AS estado_enfermedad,
    t.catalogo_id,
    c.nombre AS producto,
    c.tipo AS tipo_producto,
    t.veterinario_id,
    v.nombre AS veterinario,
    t.fecha_inicio,
    t.fecha_fin,
    t.cada_horas,
    t.dosis,
    t.unidad_dosis,
    t.estado AS estado_tratamiento,
    t.observaciones
FROM sanidad.tratamientos t
JOIN sanidad.enfermedades e
    ON e.id = t.enfermedad_id
JOIN public.animales an
    ON an.id = e.animal_id
JOIN sanidad.catalogo_sanitario c
    ON c.id = t.catalogo_id
LEFT JOIN sanidad.veterinarios v
    ON v.id = t.veterinario_id
WHERE t.estado IN ('pendiente', 'en_curso');

COMMENT ON VIEW sanidad.vw_tratamientos_activos IS
    'Tratamientos pendientes o en curso con información del animal y producto.';


-- =====================================================================
-- 9. VIEW: ACTIVE DISEASES
-- =====================================================================

CREATE OR REPLACE VIEW sanidad.vw_enfermedades_activas AS
SELECT
    e.id AS enfermedad_id,
    e.animal_id,
    an.nombre AS animal_nombre,
    an.arete AS animal_arete,
    e.nombre AS enfermedad,
    e.fecha_inicio,
    e.fecha_fin,
    e.estado,
    e.diagnostico,
    e.observaciones,
    (CURRENT_DATE - e.fecha_inicio) AS dias_desde_inicio
FROM sanidad.enfermedades e
JOIN public.animales an
    ON an.id = e.animal_id
WHERE e.estado IN ('activa', 'cronica');

COMMENT ON VIEW sanidad.vw_enfermedades_activas IS
    'Enfermedades activas o crónicas del hato.';


-- =====================================================================
-- 10. VIEW: LOW STOCK
-- =====================================================================

CREATE OR REPLACE VIEW sanidad.vw_inventario_bajo AS
SELECT
    i.id AS inventario_id,
    i.catalogo_id,
    c.nombre AS producto,
    c.tipo AS tipo_producto,
    i.numero_lote,
    i.cantidad,
    i.fecha_vencimiento,
    i.costo_unitario,
    i.proveedor,
    i.ubicacion,
    i.estado
FROM sanidad.inventario_sanitario i
JOIN sanidad.catalogo_sanitario c
    ON c.id = i.catalogo_id
WHERE i.estado = 'activo'
  AND i.cantidad > 0
  AND i.cantidad <= 10;

COMMENT ON VIEW sanidad.vw_inventario_bajo IS
    'Lotes sanitarios activos con 10 unidades o menos de stock.';


-- =====================================================================
-- 11. VIEW: EXPIRING INVENTORY
-- =====================================================================

CREATE OR REPLACE VIEW sanidad.vw_inventario_por_vencer AS
SELECT
    i.id AS inventario_id,
    i.catalogo_id,
    c.nombre AS producto,
    c.tipo AS tipo_producto,
    i.numero_lote,
    i.cantidad,
    i.fecha_vencimiento,
    (i.fecha_vencimiento - CURRENT_DATE) AS dias_para_vencer,
    i.costo_unitario,
    i.proveedor,
    i.ubicacion,
    i.estado
FROM sanidad.inventario_sanitario i
JOIN sanidad.catalogo_sanitario c
    ON c.id = i.catalogo_id
WHERE i.estado = 'activo'
  AND i.cantidad > 0
  AND i.fecha_vencimiento IS NOT NULL
  AND i.fecha_vencimiento <= CURRENT_DATE + 30;

COMMENT ON VIEW sanidad.vw_inventario_por_vencer IS
    'Lotes activos con stock cuyo vencimiento ocurre dentro de 30 días o ya ocurrió.';


-- =====================================================================
-- 12. VIEW: CAMPAIGN COVERAGE
-- =====================================================================

CREATE OR REPLACE VIEW sanidad.vw_cobertura_campanas AS
SELECT
    c.id AS campana_id,
    c.nombre,
    c.tipo,
    c.fecha_inicio,
    c.fecha_fin,
    c.estado,
    COUNT(ca.id) AS total_animales,
    COUNT(ca.id) FILTER (WHERE ca.estado = 'aplicado') AS aplicados,
    COUNT(ca.id) FILTER (WHERE ca.estado = 'pendiente') AS pendientes,
    COUNT(ca.id) FILTER (WHERE ca.estado = 'no_aplicado') AS no_aplicados,
    COUNT(ca.id) FILTER (WHERE ca.estado = 'excluido') AS excluidos,
    CASE
        WHEN COUNT(ca.id) = 0 THEN 0::numeric
        ELSE ROUND(
            COUNT(ca.id) FILTER (WHERE ca.estado = 'aplicado')::numeric
            / COUNT(ca.id)::numeric * 100,
            2
        )
    END AS porcentaje_cobertura
FROM sanidad.campanas_sanitarias c
LEFT JOIN sanidad.campana_animales ca
    ON ca.campana_id = c.id
GROUP BY
    c.id,
    c.nombre,
    c.tipo,
    c.fecha_inicio,
    c.fecha_fin,
    c.estado;

COMMENT ON VIEW sanidad.vw_cobertura_campanas IS
    'Coverage summary for sanitary campaigns by participation status.';


-- =====================================================================
-- 13. DASHBOARD SUMMARY VIEW
-- =====================================================================

CREATE OR REPLACE VIEW sanidad.vw_dashboard_resumen AS
SELECT
    (SELECT COUNT(*) FROM public.animales)
        AS total_animales,

    (
        SELECT COUNT(*)
        FROM sanidad.aplicaciones_sanitarias
        WHERE estado = 'activo'
          AND proxima_fecha IS NOT NULL
          AND proxima_fecha >= CURRENT_DATE
          AND proxima_fecha <= CURRENT_DATE + 30
    ) AS aplicaciones_proximas_30_dias,

    (
        SELECT COUNT(*)
        FROM sanidad.aplicaciones_sanitarias
        WHERE estado = 'activo'
          AND proxima_fecha IS NOT NULL
          AND proxima_fecha < CURRENT_DATE
    ) AS aplicaciones_vencidas,

    (
        SELECT COUNT(*)
        FROM sanidad.tratamientos
        WHERE estado IN ('pendiente', 'en_curso')
    ) AS tratamientos_activos,

    (
        SELECT COUNT(*)
        FROM sanidad.enfermedades
        WHERE estado IN ('activa', 'cronica')
    ) AS enfermedades_activas,

    (
        SELECT COUNT(*)
        FROM sanidad.inventario_sanitario
        WHERE estado = 'activo'
          AND cantidad > 0
          AND cantidad <= 10
    ) AS lotes_stock_bajo,

    (
        SELECT COUNT(*)
        FROM sanidad.inventario_sanitario
        WHERE estado = 'activo'
          AND cantidad > 0
          AND fecha_vencimiento IS NOT NULL
          AND fecha_vencimiento <= CURRENT_DATE + 30
    ) AS lotes_por_vencer,

    (
        SELECT COUNT(*)
        FROM sanidad.campanas_sanitarias
        WHERE estado = 'activa'
    ) AS campanas_activas;

COMMENT ON VIEW sanidad.vw_dashboard_resumen IS
    'Single-row summary of the main sanitary KPIs.';


-- =====================================================================
-- 14. FINAL NOTES
-- =====================================================================

-- RLS intentionally excluded.
-- The existing GanaderoPro authentication/role mapping must be verified
-- before creating restrictive policies.
--
-- movements_inventario remains append-only.
-- Stock changes must occur through movements.
-- Transferencias remain unsupported until a destination-aware model exists.