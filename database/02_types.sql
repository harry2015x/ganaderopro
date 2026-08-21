-- =====================================================================
-- GanaderoPro | Database Foundation
-- File: 02_types.sql
-- Purpose: Define the shared ENUM types used across GanaderoPro tables.
--          Types live in the "core" schema because they will be
--          referenced by tables in multiple domain schemas later on
--          (ganado, sanidad, reproduccion, costos, inventario).
--
-- Safety notes:
--   - Postgres has no native "CREATE TYPE IF NOT EXISTS". Each type
--     below is wrapped in a DO block that checks pg_type first, so
--     re-running this file is safe and will never raise a duplicate
--     type error.
--   - This file does NOT create any table and does NOT reference the
--     "sanidad" schema's (not-yet-created) tables.
--   - Meant to be reviewed and executed manually (e.g. Supabase SQL
--     editor). It is not run automatically by this task.
--   - Requires 01_schemas.sql to have been run first (needs core schema
--     to exist).
-- =====================================================================

-- ---------------------------------------------------------------------
-- core.estado_registro
-- Generic lifecycle status, reusable by almost any table that needs a
-- soft state (active/inactive/archived) instead of hard deletes.
-- ---------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'estado_registro' AND n.nspname = 'core'
  ) THEN
    CREATE TYPE core.estado_registro AS ENUM (
      'activo',
      'inactivo',
      'archivado',
      'eliminado'
    );
  END IF;
END $$;
COMMENT ON TYPE core.estado_registro IS
  'Generic lifecycle status for records that support soft-delete/archiving instead of hard deletes.';

-- ---------------------------------------------------------------------
-- core.tipo_producto_sanitario
-- Classifies sanitary/health products (vaccines, antibiotics, etc.)
-- Will be used later by inventario and sanidad tables.
-- ---------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'tipo_producto_sanitario' AND n.nspname = 'core'
  ) THEN
    CREATE TYPE core.tipo_producto_sanitario AS ENUM (
      'vacuna',
      'antibiotico',
      'antiparasitario',
      'vitamina',
      'hormona',
      'desinfectante',
      'otro'
    );
  END IF;
END $$;
COMMENT ON TYPE core.tipo_producto_sanitario IS
  'Classification of sanitary/health products used in treatments and inventory (vaccines, antibiotics, etc.).';

-- ---------------------------------------------------------------------
-- core.estado_tratamiento
-- Status of an individual health treatment applied to an animal.
-- ---------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'estado_tratamiento' AND n.nspname = 'core'
  ) THEN
    CREATE TYPE core.estado_tratamiento AS ENUM (
      'pendiente',
      'en_curso',
      'completado',
      'cancelado'
    );
  END IF;
END $$;
COMMENT ON TYPE core.estado_tratamiento IS
  'Status of an individual health treatment applied to an animal.';

-- ---------------------------------------------------------------------
-- core.tipo_movimiento_inventario
-- Kind of stock movement recorded in the inventario schema.
-- ---------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'tipo_movimiento_inventario' AND n.nspname = 'core'
  ) THEN
    CREATE TYPE core.tipo_movimiento_inventario AS ENUM (
      'entrada',
      'salida',
      'ajuste',
      'transferencia'
    );
  END IF;
END $$;
COMMENT ON TYPE core.tipo_movimiento_inventario IS
  'Kind of stock movement recorded for inventory items (entrada, salida, ajuste, transferencia).';

-- ---------------------------------------------------------------------
-- core.estado_campana
-- Status of a health/vaccination campaign (a batch of treatments).
-- ---------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'estado_campana' AND n.nspname = 'core'
  ) THEN
    CREATE TYPE core.estado_campana AS ENUM (
      'planificada',
      'activa',
      'finalizada',
      'cancelada'
    );
  END IF;
END $$;
COMMENT ON TYPE core.estado_campana IS
  'Status of a health/vaccination campaign grouping multiple treatments.';