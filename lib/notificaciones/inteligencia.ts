import { Notificacion } from "@/types";

/* ================================================================
   MOTOR DE INTELIGENCIA DE NOTIFICACIONES — GanaderoPro
   ----------------------------------------------------------------
   Este módulo NUNCA genera alertas desde cero ni consulta la base
   de datos. Su única responsabilidad es PROCESAR las notificaciones
   ya generadas por los demás módulos (pesajes, animales, etc.) para
   producir notificaciones derivadas: sobrecargas, agrupaciones,
   resúmenes y estado general del sistema.

   Flujo respetado:
     módulos  -> generan notificaciones
     inteligencia.ts (este archivo) -> procesa y prioriza
     NotificationCenter -> solo muestra, no procesa nada

   Reglas implementadas:
     - pending_weighings (regla original, mejorada)
     - critical_overload / high_overload / medium_overload
     - same_animal_multiple_alerts
     - duplicate_notifications / merge_similar_alerts / collapse_repeated_alerts
     - daily_summary / weekly_summary
     - system_health (system_status_ok / warning / critical)
     - priority_engine (highest_priority_first ... sort_by_date)
     - recommend_action / severity_scaling
     - ignore_invalid_notifications / ignore_empty_notifications
     - future_ready_for: vacunas, reproducción, costos, inventario
     - stale_alert_escalation (envejecimiento de alertas sin atender)
     - trend_detection (tendencia semana contra semana anterior)
     - cross_type_correlation (mismo animal, alertas de distintas áreas)
     - bounded_deduplication_window (deduplicación con ventana de tiempo)
     - per_type_thresholds (umbrales de sobrecarga configurables por tipo)
     - traceability_metadata (origenIds en notificaciones derivadas)
     - data_integrity_diagnostics (aviso ante alto descarte de datos inválidos)
     - output_cap (límite de agrupaciones por animal + aviso de desborde)
     - perf: timestamp_cache / optimized_sort (optimizaciones internas)

   Notas de la versión productiva:
     - generarInteligencia() conserva exactamente su firma original.
     - Todas las reglas anteriores se mantienen sin cambio de
       comportamiento; las reglas nuevas son estrictamente aditivas.
     - generarIdSintetico() amplía su rango interno de distribución
       para reducir la probabilidad de colisión de IDs entre
       entidades distintas (animales, tipos, etc.) en explotaciones
       con muchos registros. Sigue siendo determinístico y sigue sin
       invadir el bloque reservado 900000-900999.
   ================================================================ */

// ----------------------------------------------------------------
// Tipos internos de soporte (no reemplazan ni modifican @/types)
// ----------------------------------------------------------------

type Prioridad = "critica" | "alta" | "media" | "baja";

const ORDEN_PRIORIDAD: Record<Prioridad, number> = {
  critica: 0,
  alta: 1,
  media: 2,
  baja: 3,
};

// Umbrales de cantidad de notificaciones pendientes para escalar severidad
// (valores globales, usados como fallback cuando un tipo no tiene
// configuración propia en UMBRALES_POR_TIPO).
const UMBRAL_CRITICO = 10;
const UMBRAL_ALTO = 5;
const UMBRAL_MEDIO = 3;

// per_type_thresholds: umbrales específicos por tipo de notificación.
// Si un tipo no aparece aquí, se usan los umbrales globales de arriba.
// Esto permite que un módulo futuro (ej. vacunas) tenga una
// sensibilidad de escalado distinta sin afectar a los demás tipos ni
// tocar la lógica de generarSobrecargasPorTipo.
// Nota: "pesaje" se deja igual a los umbrales globales a propósito,
// para no alterar el comportamiento existente.
const UMBRALES_POR_TIPO: Record<
  string,
  { medio: number; alto: number; critico: number }
> = {
  pesaje: { medio: UMBRAL_MEDIO, alto: UMBRAL_ALTO, critico: UMBRAL_CRITICO },
};

function obtenerUmbralesTipo(tipo: string): { medio: number; alto: number; critico: number } {
  return UMBRALES_POR_TIPO[tipo] ?? { medio: UMBRAL_MEDIO, alto: UMBRAL_ALTO, critico: UMBRAL_CRITICO };
}

// Ventanas de tiempo para los resúmenes
const MS_POR_DIA = 24 * 60 * 60 * 1000;
const DIAS_RESUMEN_SEMANAL = 7;

// bounded_deduplication_window: dos notificaciones "iguales" solo se
// colapsan como el mismo evento repetido si caen dentro de esta
// ventana entre sí. Fuera de la ventana se tratan como recurrencias
// independientes, para no diluir la señal de recurrencia real con
// eventos separados por meses.
const VENTANA_DEDUPLICACION_DIAS = 30;

// stale_alert_escalation: horas sin leer a partir de las cuales una
// notificación se considera "envejecida", según su prioridad
// original. Cuanto más severa la prioridad, menos tiempo se tolera.
const UMBRAL_ENVEJECIMIENTO_HORAS: Record<Prioridad, number> = {
  critica: 24,
  alta: 48,
  media: 96,
  baja: 168,
};

// trend_detection: ventana de comparación (semana actual vs semana
// anterior) y porcentaje de cambio mínimo para considerarlo relevante.
const DIAS_VENTANA_TENDENCIA = 7;
const UMBRAL_CAMBIO_TENDENCIA = 50; // porcentaje

// output_cap: máximo de notificaciones sintéticas de "animal con
// múltiples alertas" que se devuelven, para no saturar la UI en
// explotaciones con muchos animales.
const MAX_AGRUPACIONES_POR_ANIMAL = 50;

// data_integrity_diagnostics: porcentaje de notificaciones
// descartadas por inválidas a partir del cual se avisa de un posible
// problema upstream en algún módulo generador.
const UMBRAL_DIAGNOSTICO_INVALIDAS = 20; // porcentaje

// Bloque de IDs reservado para notificaciones de sistema fijas
// (evita colisión con los IDs generados por hash, que empiezan en 901000)
const ID_SOBRECARGA_PESAJE = 900000; // Compatibilidad con la regla original
const ID_RESUMEN_DIARIO = 900300;
const ID_RESUMEN_SEMANAL = 900301;
const ID_ESTADO_SISTEMA = 900302;
const ID_DIAGNOSTICO_INTEGRIDAD = 900303;
const ID_DESBORDE_AGRUPACIONES = 900304;

// Etiquetas legibles por tipo de notificación. Los tipos que aún no
// existen en el sistema (vacuna, reproduccion, costo, inventario)
// quedan listos para cuando esos módulos empiecen a emitir alertas,
// sin necesidad de tocar este archivo.
const ETIQUETAS_TIPO: Record<
  string,
  { plural: string; urlSugerida: string; icono: string }
> = {
  pesaje: { plural: "pesajes pendientes", urlSugerida: "/pesajes", icono: "⚖️" },
  sistema: { plural: "alertas de sistema", urlSugerida: "/", icono: "🧠" },
  animal: { plural: "alertas de animales", urlSugerida: "/ganado", icono: "🐄" },
  vacuna: { plural: "vacunas pendientes", urlSugerida: "/vacunas", icono: "💉" },
  reproduccion: {
    plural: "eventos reproductivos pendientes",
    urlSugerida: "/reproduccion",
    icono: "🐣",
  },
  costo: { plural: "registros de costos pendientes", urlSugerida: "/costos", icono: "💰" },
  inventario: {
    plural: "alertas de inventario",
    urlSugerida: "/inventario",
    icono: "📦",
  },
};

function obtenerEtiquetaTipo(tipo: string) {
  return (
    ETIQUETAS_TIPO[tipo] ?? {
      plural: `notificaciones de tipo "${tipo}"`,
      urlSugerida: "/",
      icono: "🔔",
    }
  );
}

// ----------------------------------------------------------------
// Utilidades de validación y normalización
// ----------------------------------------------------------------

// ignore_invalid_notifications / ignore_empty_notifications
function esNotificacionValida(n: Notificacion | null | undefined): n is Notificacion {
  if (!n) return false;
  if (n.id === undefined || n.id === null) return false;
  if (typeof n.tipo !== "string" || n.tipo.trim() === "") return false;
  if (typeof n.fecha !== "string" || Number.isNaN(new Date(n.fecha).getTime())) return false;

  const tieneContenido =
    (typeof n.titulo === "string" && n.titulo.trim() !== "") ||
    (typeof n.descripcion === "string" && n.descripcion.trim() !== "");

  return tieneContenido;
}

function normalizarPrioridad(valor: unknown): Prioridad {
  if (valor === "critica" || valor === "alta" || valor === "media" || valor === "baja") {
    return valor;
  }
  return "media";
}

function prioridadMasSevera(actual: Prioridad, candidata: Prioridad): Prioridad {
  return ORDEN_PRIORIDAD[candidata] < ORDEN_PRIORIDAD[actual] ? candidata : actual;
}

// Genera un ID numérico determinístico a partir de un texto, evitando
// colisiones con los IDs reales (que vienen de la base de datos) y con
// el bloque reservado 900000-900999. Usa un hash FNV-1a de 32 bits
// sobre un rango amplio (901000 .. 9801000) para minimizar la
// probabilidad de colisión entre entidades distintas (animales,
// tipos, etc.) en explotaciones con muchos registros.
function generarIdSintetico(semilla: string): number {
  let hash = 0x811c9dc5; // offset basis FNV-1a
  for (let i = 0; i < semilla.length; i++) {
    hash ^= semilla.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193); // FNV prime
  }
  return 901000 + (Math.abs(hash) % 8900000);
}

// Intenta identificar a qué animal pertenece una notificación, ya sea
// por un campo directo (animalId/arete) o extrayéndolo de la URL.
// Nunca inventa un identificador: si no hay evidencia, retorna null.
// Nota: depende implícitamente de la convención de URL "/ganado/:id"
// usada por otros módulos; si esa convención cambia, esta función
// simplemente deja de encontrar coincidencias (falla en silencio).
function extraerIdAnimal(n: Notificacion): string | null {
  const extendida = n as unknown as {
    animalId?: string | number;
    arete?: string;
  };

  const candidato = extendida.animalId ?? extendida.arete;
  if (candidato !== undefined && candidato !== null && String(candidato).trim() !== "") {
    return String(candidato);
  }

  if (typeof n.url === "string") {
    const coincidencia = n.url.match(/\/ganado\/([^/?#]+)/);
    if (coincidencia) return coincidencia[1];
  }

  return null;
}

function obtenerFechaMasReciente(fechas: string[]): string {
  const validas = fechas.filter((f) => !Number.isNaN(new Date(f).getTime()));
  if (validas.length === 0) return new Date().toISOString();

  return validas.sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0];
}

// ----------------------------------------------------------------
// Cache de timestamps (optimización de rendimiento)
// ----------------------------------------------------------------
// Varias reglas necesitan el timestamp numérico de la misma
// notificación (deduplicación, sobrecargas, envejecimiento,
// tendencia, resúmenes, estado del sistema, orden final...). En vez
// de volver a parsear la misma fecha con `new Date(...).getTime()`
// una y otra vez, se calcula una sola vez por lote y se reutiliza.

function crearCacheTimestamps(notificaciones: Notificacion[]): Map<Notificacion, number> {
  const cache = new Map<Notificacion, number>();
  notificaciones.forEach((n) => {
    const tiempo = new Date(n.fecha).getTime();
    cache.set(n, Number.isNaN(tiempo) ? 0 : tiempo);
  });
  return cache;
}

function obtenerTimestamp(n: Notificacion, cache: Map<Notificacion, number>): number {
  const valor = cache.get(n);
  return valor !== undefined ? valor : new Date(n.fecha).getTime();
}

// ----------------------------------------------------------------
// Deduplicación y colapso de alertas repetidas
// duplicate_notifications / merge_similar_alerts /
// collapse_repeated_alerts / limit_repeated_messages /
// bounded_deduplication_window
// ----------------------------------------------------------------

function obtenerClaveDuplicado(n: Notificacion): string {
  const animal = extraerIdAnimal(n) ?? "";
  const titulo = (n.titulo ?? "").trim().toLowerCase();
  const descripcion = (n.descripcion ?? "").trim().toLowerCase();
  return `${n.tipo}|${animal}|${titulo}|${descripcion}`;
}

function deduplicarNotificaciones(
  notificaciones: Notificacion[],
  cache: Map<Notificacion, number>
): Notificacion[] {
  const grupos = new Map<string, Notificacion[]>();

  notificaciones.forEach((n) => {
    const clave = obtenerClaveDuplicado(n);
    const existentes = grupos.get(clave);
    if (existentes) {
      existentes.push(n);
    } else {
      grupos.set(clave, [n]);
    }
  });

  const resultado: Notificacion[] = [];
  const ventanaMs = VENTANA_DEDUPLICACION_DIAS * MS_POR_DIA;

  Array.from(grupos.values()).forEach((grupo) => {
    if (grupo.length === 1) {
      resultado.push(grupo[0]);
      return;
    }

    // bounded_deduplication_window: dentro de un mismo grupo "igual",
    // solo se colapsan como un único evento repetido las
    // notificaciones que caen dentro de la ventana de tiempo entre sí.
    // Si el mismo mensaje reaparece meses después, se trata como una
    // recurrencia nueva e independiente.
    const ordenadoPorFecha = [...grupo].sort(
      (a, b) => obtenerTimestamp(b, cache) - obtenerTimestamp(a, cache)
    );

    const subgrupos: Notificacion[][] = [];
    ordenadoPorFecha.forEach((n) => {
      const ultimoSubgrupo = subgrupos[subgrupos.length - 1];
      if (
        ultimoSubgrupo &&
        obtenerTimestamp(ultimoSubgrupo[0], cache) - obtenerTimestamp(n, cache) <= ventanaMs
      ) {
        ultimoSubgrupo.push(n);
      } else {
        subgrupos.push([n]);
      }
    });

    subgrupos.forEach((sub) => {
      if (sub.length === 1) {
        resultado.push(sub[0]);
        return;
      }

      const masReciente = sub[0]; // el subgrupo ya viene ordenado descendente
      const prioridadColapsada = sub.reduce<Prioridad>(
        (acc, actual) => prioridadMasSevera(acc, normalizarPrioridad(actual.prioridad)),
        "baja"
      );

      resultado.push({
        ...masReciente,
        prioridad: prioridadColapsada,
        descripcion: `${masReciente.descripcion} (se repitió ${sub.length} veces)`,
      });
    });
  });

  return resultado;
}

// ----------------------------------------------------------------
// Sobrecargas por tipo de notificación
// pending_weighings / critical_overload / high_overload /
// medium_overload / severity_scaling / automatic_prioritization /
// per_type_thresholds / traceability_metadata
// future_ready_for: vacunas, reproduccion, costos, inventario
// ----------------------------------------------------------------

function generarSobrecargasPorTipo(notificaciones: Notificacion[]): Notificacion[] {
  const porTipo = new Map<string, Notificacion[]>();

  notificaciones.forEach((n) => {
    const lista = porTipo.get(n.tipo);
    if (lista) lista.push(n);
    else porTipo.set(n.tipo, [n]);
  });

  const sobrecargas: Notificacion[] = [];

  Array.from(porTipo.entries()).forEach(([tipo, lista]) => {
    // Solo se consideran "pendientes" las notificaciones aún no leídas
    const pendientes = lista.filter((n) => n.leida !== true);
    const cantidad = pendientes.length;

    // per_type_thresholds: cada tipo puede tener su propia
    // sensibilidad de escalado; si no está configurado, se usan los
    // umbrales globales (comportamiento idéntico al original).
    const umbrales = obtenerUmbralesTipo(tipo);

    if (cantidad < umbrales.medio) return;

    let prioridad: Prioridad = "media";
    if (cantidad >= umbrales.critico) prioridad = "critica";
    else if (cantidad >= umbrales.alto) prioridad = "alta";

    const etiqueta = obtenerEtiquetaTipo(tipo);
    const fecha = obtenerFechaMasReciente(pendientes.map((n) => n.fecha));

    // La sobrecarga de pesajes conserva su ID original por compatibilidad
    const id = tipo === "pesaje" ? ID_SOBRECARGA_PESAJE : generarIdSintetico(`sobrecarga-${tipo}`);

    sobrecargas.push({
      id,
      titulo: prioridad === "critica" ? "Atención urgente" : "Atención",
      descripcion: `Hay ${cantidad} ${etiqueta.plural}.`,
      tipo: "sistema",
      prioridad,
      fecha,
      leida: false,
      accion: `Revisar ${etiqueta.plural}`,
      url: etiqueta.urlSugerida,
      icono: prioridad === "critica" ? "🚨" : etiqueta.icono,
      // traceability_metadata: permite reconstruir desde la UI cuáles
      // notificaciones originales componen esta sobrecarga.
      origenIds: pendientes.map((n) => n.id),
    } as Notificacion);
  });

  return sobrecargas;
}

// ----------------------------------------------------------------
// Agrupación de alertas por animal
// same_animal_multiple_alerts / cross_type_correlation /
// output_cap / traceability_metadata
// ----------------------------------------------------------------

function generarAgrupacionesPorAnimal(
  notificaciones: Notificacion[],
  ahora: number
): Notificacion[] {
  const porAnimal = new Map<string, Notificacion[]>();

  notificaciones.forEach((n) => {
    // Solo interesan las alertas todavía activas: una alerta ya leída
    // no debería inflar el conteo de "alertas activas" de un animal
    // (consistente con el resto de reglas de este motor).
    if (n.leida === true) return;

    const idAnimal = extraerIdAnimal(n);
    if (!idAnimal) return;

    const lista = porAnimal.get(idAnimal);
    if (lista) lista.push(n);
    else porAnimal.set(idAnimal, [n]);
  });

  const agrupaciones: Notificacion[] = [];

  Array.from(porAnimal.entries()).forEach(([idAnimal, alertas]) => {
    if (alertas.length < 2) return;

    let prioridad = alertas.reduce<Prioridad>(
      (acc, actual) => prioridadMasSevera(acc, normalizarPrioridad(actual.prioridad)),
      "baja"
    );

    // cross_type_correlation: alertas de dominios distintos sobre el
    // mismo animal (ej. pesaje + vacuna) suelen indicar un riesgo
    // mayor que varias alertas repetidas de un mismo dominio.
    const tiposDistintos = Array.from(new Set(alertas.map((a) => a.tipo)));
    const esMultidominio = tiposDistintos.length > 1;
    if (esMultidominio) {
      prioridad = prioridadMasSevera(prioridad, "alta");
    }

    const fecha = obtenerFechaMasReciente(alertas.map((a) => a.fecha));

    agrupaciones.push({
      id: generarIdSintetico(`animal-${idAnimal}`),
      titulo: esMultidominio ? "Animal con alertas en múltiples áreas" : "Animal con múltiples alertas",
      descripcion: esMultidominio
        ? `El animal ${idAnimal} tiene ${alertas.length} alertas activas en ${tiposDistintos.length} áreas distintas (${tiposDistintos.join(", ")}), lo que sugiere revisión prioritaria.`
        : `El animal ${idAnimal} tiene ${alertas.length} alertas activas que requieren revisión.`,
      tipo: "sistema",
      prioridad,
      fecha,
      leida: false,
      accion: "Ver historial del animal",
      url: `/ganado/${idAnimal}`,
      icono: esMultidominio ? "⚠️" : "🐄",
      // traceability_metadata
      origenIds: alertas.map((a) => a.id),
    } as Notificacion);
  });

  // output_cap: se limita la cantidad de agrupaciones devueltas para
  // no saturar la UI en explotaciones con muchos animales. Se
  // conservan las más severas y se avisa del resto en un solo mensaje.
  if (agrupaciones.length <= MAX_AGRUPACIONES_POR_ANIMAL) {
    return agrupaciones;
  }

  const ordenadas = [...agrupaciones].sort(
    (a, b) =>
      ORDEN_PRIORIDAD[normalizarPrioridad(a.prioridad)] -
      ORDEN_PRIORIDAD[normalizarPrioridad(b.prioridad)]
  );

  const visibles = ordenadas.slice(0, MAX_AGRUPACIONES_POR_ANIMAL);
  const restantes = ordenadas.length - visibles.length;

  visibles.push({
    id: ID_DESBORDE_AGRUPACIONES,
    titulo: "Más animales con alertas múltiples",
    descripcion: `Hay ${restantes} animal(es) adicionales con múltiples alertas activas no mostrados aquí. Consulta el listado completo de ganado.`,
    tipo: "sistema",
    prioridad: "media",
    fecha: new Date(ahora).toISOString(),
    leida: false,
    accion: "Ver listado de ganado",
    url: "/ganado",
    icono: "➕",
  } as Notificacion);

  return visibles;
}

// ----------------------------------------------------------------
// Envejecimiento de alertas sin atender
// stale_alert_escalation
// ----------------------------------------------------------------
// A diferencia de las sobrecargas (que miran el VOLUMEN de
// pendientes), esta regla mira el TIEMPO que llevan sin atenderse.
// Una sola alerta crítica olvidada durante días puede ser tan
// importante como varias alertas nuevas de baja prioridad.

function esNotificacionEnvejecida(
  n: Notificacion,
  ahora: number,
  cache: Map<Notificacion, number>
): boolean {
  if (n.leida === true) return false;

  const prioridad = normalizarPrioridad(n.prioridad);
  const limiteHoras = UMBRAL_ENVEJECIMIENTO_HORAS[prioridad];
  const horasTranscurridas = (ahora - obtenerTimestamp(n, cache)) / (60 * 60 * 1000);

  return horasTranscurridas >= limiteHoras;
}

function generarAlertasEnvejecimiento(
  notificaciones: Notificacion[],
  ahora: number,
  cache: Map<Notificacion, number>
): Notificacion[] {
  const envejecidas = notificaciones.filter((n) => esNotificacionEnvejecida(n, ahora, cache));
  if (envejecidas.length === 0) return [];

  const porTipo = new Map<string, Notificacion[]>();
  envejecidas.forEach((n) => {
    const lista = porTipo.get(n.tipo);
    if (lista) lista.push(n);
    else porTipo.set(n.tipo, [n]);
  });

  const alertas: Notificacion[] = [];

  Array.from(porTipo.entries()).forEach(([tipo, lista]) => {
    const etiqueta = obtenerEtiquetaTipo(tipo);
    const hayCriticas = lista.some((n) => normalizarPrioridad(n.prioridad) === "critica");
    const fecha = obtenerFechaMasReciente(lista.map((n) => n.fecha));

    alertas.push({
      id: generarIdSintetico(`envejecida-${tipo}`),
      titulo: "Alertas sin atender",
      descripcion: `Hay ${lista.length} ${etiqueta.plural} sin atender desde hace más del tiempo recomendado.`,
      tipo: "sistema",
      prioridad: hayCriticas ? "critica" : "alta",
      fecha,
      leida: false,
      accion: `Revisar ${etiqueta.plural}`,
      url: etiqueta.urlSugerida,
      icono: "⏳",
      // traceability_metadata
      origenIds: lista.map((n) => n.id),
    } as Notificacion);
  });

  return alertas;
}

// ----------------------------------------------------------------
// Detección de tendencia
// trend_detection
// ----------------------------------------------------------------
// Compara el volumen de notificaciones de los últimos 7 días contra
// los 7 días inmediatamente anteriores. No requiere estado externo:
// toda la información ya viene en el array recibido en esta misma
// ejecución. Opera sobre el conjunto ya deduplicado, para medir
// tendencia de eventos distintos y no de ruido repetido.

function generarDeteccionTendencia(
  notificaciones: Notificacion[],
  ahora: number,
  cache: Map<Notificacion, number>
): Notificacion[] {
  const ventana = DIAS_VENTANA_TENDENCIA * MS_POR_DIA;
  const inicioActual = ahora - ventana;
  const inicioAnterior = ahora - ventana * 2;

  const porTipoActual = new Map<string, number>();
  const porTipoAnterior = new Map<string, number>();

  notificaciones.forEach((n) => {
    const t = obtenerTimestamp(n, cache);
    if (t >= inicioActual && t <= ahora) {
      porTipoActual.set(n.tipo, (porTipoActual.get(n.tipo) ?? 0) + 1);
    } else if (t >= inicioAnterior && t < inicioActual) {
      porTipoAnterior.set(n.tipo, (porTipoAnterior.get(n.tipo) ?? 0) + 1);
    }
  });

  const tendencias: Notificacion[] = [];

  Array.from(porTipoActual.entries()).forEach(([tipo, cantidadActual]) => {
    const cantidadAnterior = porTipoAnterior.get(tipo) ?? 0;

    // Sin base de comparación no se puede hablar de tendencia real
    if (cantidadAnterior === 0) return;

    const cambio = ((cantidadActual - cantidadAnterior) / cantidadAnterior) * 100;
    if (Math.abs(cambio) < UMBRAL_CAMBIO_TENDENCIA) return;

    const etiqueta = obtenerEtiquetaTipo(tipo);
    const subiendo = cambio > 0;

    tendencias.push({
      id: generarIdSintetico(`tendencia-${tipo}`),
      titulo: subiendo ? "Tendencia al alza" : "Tendencia a la baja",
      descripcion: `${etiqueta.plural}: ${cantidadActual} esta semana vs ${cantidadAnterior} la semana anterior (${subiendo ? "+" : ""}${cambio.toFixed(0)}%).`,
      tipo: "sistema",
      prioridad: subiendo ? "alta" : "baja",
      fecha: new Date(ahora).toISOString(),
      leida: false,
      accion: `Revisar ${etiqueta.plural}`,
      url: etiqueta.urlSugerida,
      icono: subiendo ? "📈" : "📉",
    } as Notificacion);
  });

  return tendencias;
}

// ----------------------------------------------------------------
// Resúmenes periódicos
// daily_summary / weekly_summary
// ----------------------------------------------------------------

function generarResumenDiario(
  notificaciones: Notificacion[],
  ahora: number,
  cache: Map<Notificacion, number>
): Notificacion | null {
  const deHoy = notificaciones.filter((n) => ahora - obtenerTimestamp(n, cache) <= MS_POR_DIA);

  if (deHoy.length === 0) return null;

  const sinLeer = deHoy.filter((n) => n.leida !== true).length;
  const criticas = deHoy.filter((n) => normalizarPrioridad(n.prioridad) === "critica").length;
  const altas = deHoy.filter((n) => normalizarPrioridad(n.prioridad) === "alta").length;

  const partes = [`${deHoy.length} notificaciones en las últimas 24 horas`];
  if (sinLeer > 0) partes.push(`${sinLeer} sin leer`);
  if (criticas > 0) partes.push(`${criticas} críticas`);
  if (altas > 0) partes.push(`${altas} de alta prioridad`);

  const prioridad: Prioridad = criticas > 0 ? "critica" : altas > 0 ? "alta" : "baja";

  return {
    id: ID_RESUMEN_DIARIO,
    titulo: "Resumen diario",
    descripcion: `${partes.join(", ")}.`,
    tipo: "sistema",
    prioridad,
    fecha: new Date(ahora).toISOString(),
    leida: false,
    accion: "Ver todas las notificaciones",
    url: "/",
    icono: "📋",
  } as Notificacion;
}

function generarResumenSemanal(
  notificaciones: Notificacion[],
  ahora: number,
  cache: Map<Notificacion, number>
): Notificacion | null {
  const ventana = DIAS_RESUMEN_SEMANAL * MS_POR_DIA;

  const deLaSemana = notificaciones.filter((n) => ahora - obtenerTimestamp(n, cache) <= ventana);

  if (deLaSemana.length === 0) return null;

  const porTipo = new Map<string, number>();
  deLaSemana.forEach((n) => {
    porTipo.set(n.tipo, (porTipo.get(n.tipo) ?? 0) + 1);
  });

  const detalle = Array.from(porTipo.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([tipo, cantidad]) => `${cantidad} de ${obtenerEtiquetaTipo(tipo).plural}`)
    .join(", ");

  const criticas = deLaSemana.filter(
    (n) => normalizarPrioridad(n.prioridad) === "critica"
  ).length;

  return {
    id: ID_RESUMEN_SEMANAL,
    titulo: "Resumen semanal",
    descripcion: `Últimos ${DIAS_RESUMEN_SEMANAL} días: ${deLaSemana.length} notificaciones (${detalle}).`,
    tipo: "sistema",
    prioridad: criticas > 0 ? "critica" : "media",
    fecha: new Date(ahora).toISOString(),
    leida: false,
    accion: "Ver historial de notificaciones",
    url: "/",
    icono: "🗓️",
  } as Notificacion;
}

// ----------------------------------------------------------------
// Diagnóstico de integridad de datos
// data_integrity_diagnostics
// ----------------------------------------------------------------
// No cambia la regla original de descartar inválidas/vacías: solo
// avisa cuando el volumen de descarte es alto, como señal de que
// algún módulo upstream podría estar emitiendo datos incompletos.

function generarDiagnosticoIntegridad(
  descartadas: number,
  total: number,
  porcentaje: number,
  ahora: number
): Notificacion | null {
  if (total === 0 || descartadas === 0 || porcentaje < UMBRAL_DIAGNOSTICO_INVALIDAS) return null;

  return {
    id: ID_DIAGNOSTICO_INTEGRIDAD,
    titulo: "Revisar calidad de datos",
    descripcion: `Se descartaron ${descartadas} de ${total} notificaciones recibidas (${porcentaje.toFixed(0)}%) por datos incompletos o inválidos. Esto puede indicar un problema en alguno de los módulos que las genera.`,
    tipo: "sistema",
    prioridad: "media",
    fecha: new Date(ahora).toISOString(),
    leida: false,
    accion: "Contactar soporte técnico",
    url: "/",
    icono: "🧪",
  } as Notificacion;
}

// ----------------------------------------------------------------
// Estado general del sistema
// system_health / system_status_ok / system_status_warning /
// system_status_critical
// ----------------------------------------------------------------

function generarEstadoSistema(
  notificaciones: Notificacion[],
  huboEnvejecidasCriticas: boolean,
  ahora: number
): Notificacion {
  const pendientes = notificaciones.filter((n) => n.leida !== true);
  const criticas = pendientes.filter((n) => normalizarPrioridad(n.prioridad) === "critica").length;
  const altas = pendientes.filter((n) => normalizarPrioridad(n.prioridad) === "alta").length;

  let estado: "Normal" | "Advertencia" | "Crítico" = "Normal";
  let prioridad: Prioridad = "baja";
  let mensaje = "El sistema opera con normalidad, sin alertas relevantes pendientes.";
  let icono = "✅";

  if (criticas > 0 || huboEnvejecidasCriticas) {
    estado = "Crítico";
    prioridad = "critica";
    mensaje =
      criticas > 0
        ? `Estado crítico: ${criticas} alerta(s) crítica(s) sin atender.`
        : "Estado crítico: hay alertas críticas que llevan demasiado tiempo sin atenderse.";
    icono = "🔴";
  } else if (altas >= UMBRAL_ALTO) {
    estado = "Advertencia";
    prioridad = "alta";
    mensaje = `Advertencia: ${altas} alertas de alta prioridad acumuladas.`;
    icono = "🟠";
  }

  return {
    id: ID_ESTADO_SISTEMA,
    titulo: `Estado del sistema: ${estado}`,
    descripcion: mensaje,
    tipo: "sistema",
    prioridad,
    fecha: new Date(ahora).toISOString(),
    leida: false,
    accion: estado === "Normal" ? "Ver notificaciones" : "Revisar alertas pendientes",
    url: "/",
    icono,
  } as Notificacion;
}

// ----------------------------------------------------------------
// Motor de priorización
// priority_engine / highest_priority_first / critical_before_high /
// high_before_medium / medium_before_low / sort_by_priority / sort_by_date
// ----------------------------------------------------------------

function ordenarPorPrioridadYFecha(
  notificaciones: Notificacion[],
  cache: Map<Notificacion, number>
): Notificacion[] {
  // Optimización: se precalcula una sola vez la clave de orden
  // (prioridad + timestamp) por notificación, en vez de volver a
  // parsear la fecha en cada comparación del sort.
  const conClave = notificaciones.map((n) => ({
    n,
    prioridad: ORDEN_PRIORIDAD[normalizarPrioridad(n.prioridad)],
    tiempo: obtenerTimestamp(n, cache),
  }));

  conClave.sort((a, b) => {
    if (a.prioridad !== b.prioridad) return a.prioridad - b.prioridad;
    return b.tiempo - a.tiempo;
  });

  return conClave.map((item) => item.n);
}

// ----------------------------------------------------------------
// Punto de entrada público — misma firma que la versión original
// ----------------------------------------------------------------

export async function generarInteligencia(
  notificaciones: Notificacion[]
): Promise<Notificacion[]> {
  // Blindaje ante entradas inválidas: nunca se inventan notificaciones
  // ni se consulta la base de datos; solo se procesa lo recibido.
  if (!Array.isArray(notificaciones) || notificaciones.length === 0) {
    return [];
  }

  const ahora = Date.now();
  const totalRecibidas = notificaciones.length;

  // 1. Se descartan notificaciones inválidas o vacías
  const validas = notificaciones.filter(esNotificacionValida);
  if (validas.length === 0) return [];

  // data_integrity_diagnostics: cuántas se descartaron y qué
  // porcentaje representan sobre el total recibido.
  const descartadas = totalRecibidas - validas.length;
  const porcentajeDescartadas = (descartadas / totalRecibidas) * 100;

  // perf: cache de timestamps compartido por el resto de las reglas,
  // para no volver a parsear la misma fecha decenas de veces.
  const cacheValidas = crearCacheTimestamps(validas);

  // 2. Se colapsan duplicados y alertas repetidas (respetando la
  //    ventana de tiempo de bounded_deduplication_window)
  const sinDuplicados = deduplicarNotificaciones(validas, cacheValidas);

  // El colapso de duplicados puede producir notificaciones nuevas
  // (spread de la más reciente), así que se recalcula el cache sobre
  // el conjunto ya deduplicado para que el resto de reglas lo reutilice.
  const cache = crearCacheTimestamps(sinDuplicados);

  const inteligentes: Notificacion[] = [];

  // 3. Sobrecargas por tipo (incluye la regla original de pesajes,
  //    ahora con escalado de severidad: media / alta / crítica, y
  //    umbrales configurables por tipo)
  inteligentes.push(...generarSobrecargasPorTipo(sinDuplicados));

  // 4. Animales con múltiples alertas activas (incluye correlación
  //    cruzada entre tipos y límite de resultados)
  inteligentes.push(...generarAgrupacionesPorAnimal(sinDuplicados, ahora));

  // 5. Resumen diario
  const resumenDiario = generarResumenDiario(sinDuplicados, ahora, cache);
  if (resumenDiario) inteligentes.push(resumenDiario);

  // 6. Resumen semanal
  const resumenSemanal = generarResumenSemanal(sinDuplicados, ahora, cache);
  if (resumenSemanal) inteligentes.push(resumenSemanal);

  // 7. Envejecimiento: alertas sin atender por demasiado tiempo
  const envejecimiento = generarAlertasEnvejecimiento(sinDuplicados, ahora, cache);
  inteligentes.push(...envejecimiento);
  const huboEnvejecidasCriticas = envejecimiento.some((n) => n.prioridad === "critica");

  // 8. Tendencia: semana actual contra semana anterior
  inteligentes.push(...generarDeteccionTendencia(sinDuplicados, ahora, cache));

  // 9. Diagnóstico de integridad de datos (solo si el descarte es alto)
  const diagnostico = generarDiagnosticoIntegridad(descartadas, totalRecibidas, porcentajeDescartadas, ahora);
  if (diagnostico) inteligentes.push(diagnostico);

  // 10. Estado general del sistema (considera también el envejecimiento)
  inteligentes.push(generarEstadoSistema(sinDuplicados, huboEnvejecidasCriticas, ahora));

  // 11. Orden final: crítica > alta > media > baja, y más reciente primero
  return ordenarPorPrioridadYFecha(inteligentes, cache);
}