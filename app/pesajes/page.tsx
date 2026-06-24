"use client";

import { useState, useEffect, useCallback, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { supabase } from "../../lib/supabase";
import { obtenerRolUsuario } from "../../lib/auth";
import AuthGuard from "../../components/AuthGuard";
import Link from "next/link";
import { registrarAuditoria } from "../../lib/auditoria";

// ─── Tipos ────────────────────────────────────────────────────────
interface Animal {
  id: number;
  nombre: string;
  arete: string;
}

// AnimalRelacion: lo que devuelve Supabase en un join many-to-one.
// El cliente JS v2 devuelve el objeto relacionado (no array) o null.
interface AnimalRelacion {
  id: number;
  nombre: string;
  arete: string;
}

interface Pesaje {
  id: number;
  animal_id: number;
  peso: number;
  fecha: string;
  // null cuando el FK existe pero el registro relacionado no se encontró
  // undefined cuando no se incluyó en la consulta
  animales: AnimalRelacion | null;
}

// Tipo crudo que devuelve Supabase antes de normalizar
type PesajeRow = {
  id: number;
  animal_id: number;
  peso: number;
  fecha: string;
  animales: AnimalRelacion | AnimalRelacion[] | null;
};

// ─── Skeleton ─────────────────────────────────────────────────────
function Skeleton({ className }: { className?: string }) {
  return (
    <div className={`animate-pulse bg-gray-200 rounded-xl ${className ?? ""}`} />
  );
}

// ─── Tooltip personalizado Recharts ──────────────────────────────
interface TooltipProps {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string;
}

function CustomTooltip({ active, payload, label }: TooltipProps) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-green-200 rounded-xl p-3 shadow-lg text-sm">
        <p className="text-gray-500 mb-1">{label}</p>
        <p className="font-bold text-green-700">{payload[0].value} kg</p>
      </div>
    );
  }
  return null;
}

// ─── Toast ────────────────────────────────────────────────────────
function Toast({
  mensaje,
  tipo,
  onClose,
}: {
  mensaje: string;
  tipo: "exito" | "error";
  onClose: () => void;
}) {
  const esError = tipo === "error";
  return (
    <div
      className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-2xl px-5 py-3.5 shadow-xl text-sm font-medium transition-all
        ${esError
          ? "bg-red-50 border border-red-200 text-red-700"
          : "bg-green-50 border border-green-200 text-green-800"
        }`}
    >
      <span className="text-lg">{esError ? "⚠️" : "✅"}</span>
      {mensaje}
      <button onClick={onClose} className="ml-3 text-gray-400 hover:text-gray-600">
        ✕
      </button>
    </div>
  );
}

// ─── Componente interno (Suspense para useSearchParams) ───────────
function PesajesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // ── Estado original ────────────────────────────────────────────
  const [animalSeleccionado, setAnimalSeleccionado] = useState<string>("");
  const [animalId, setAnimalId] = useState("");
  const [fecha, setFecha] = useState("");
  const [peso, setPeso] = useState("");
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [rol, setRol] = useState<string | null>(null);
  const [animales, setAnimales] = useState<Animal[]>([]);
  const [pesajes, setPesajes] = useState<Pesaje[]>([]);

  // ── Estado nuevo ───────────────────────────────────────────────
  const [cargando, setCargando] = useState(true);
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");
  const [toast, setToast] = useState<{ mensaje: string; tipo: "exito" | "error" } | null>(null);
  const [exportando, setExportando] = useState(false);

  // ── Helper toast (reemplaza alert()) ──────────────────────────
  function mostrarToast(mensaje: string, tipo: "exito" | "error" = "exito") {
    setToast({ mensaje, tipo });
    setTimeout(() => setToast(null), 3500);
  }

  // ─────────────────────────────────────────────────────────────
  //  CORRECCIÓN 1: Leer ?animal= desde la URL con useSearchParams
  // ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const param = searchParams.get("animal");
    if (param) {
      setAnimalSeleccionado(param);
    }
  }, [searchParams]);

  // ─────────────────────────────────────────────────────────────
  //  Init: cargar animales y rol (igual que el original)
  // ─────────────────────────────────────────────────────────────
  useEffect(() => {
    cargarAnimales();
    cargarRol();
  }, []);

  async function cargarRol() {
    const rolUsuario = await obtenerRolUsuario();
    setRol(rolUsuario);
  }

  async function cargarAnimales() {
    const { data, error } = await supabase
      .from("animales")
      .select("*")
      .order("nombre");

    if (error) {
      console.log(error);
      return;
    }
    setAnimales(data || []);
  }

  // ─────────────────────────────────────────────────────────────
  //  CORRECCIÓN 2: cargarPesajes con filtro correcto por animal_id
  //  FK explícita preservada: animales!Pesaje_animal_id_fkey
  // ─────────────────────────────────────────────────────────────
  const cargarPesajes = useCallback(async () => {
    setCargando(true);

    let consulta = supabase
      .from("Pesaje")
      .select(`
        id,
        fecha,
        peso,
        animal_id,
        animales!Pesaje_animal_id_fkey (
          id,
          nombre,
          arete
        )
      `);

    // CORRECCIÓN: filtrar por animal_id cuando hay parámetro
    if (animalSeleccionado) {
      consulta = consulta.eq("animal_id", Number(animalSeleccionado));
    }

    // Filtros por fecha
    if (fechaDesde) consulta = consulta.gte("fecha", fechaDesde);
    if (fechaHasta) consulta = consulta.lte("fecha", fechaHasta);

    const { data, error } = await consulta.order("fecha", { ascending: true });

    if (error) {
      console.log(error);
      mostrarToast("Error al cargar pesajes.", "error");
    } else {
      // Normalizar: Supabase puede devolver animales como objeto, array o null.
      // Para un FK many-to-one siempre es objeto | null, pero normalizamos
      // defensivamente para cubrir configuraciones de FK no estándar.
      const normalizado: Pesaje[] = (data ?? []).map((row: PesajeRow) => ({
        id: row.id,
        animal_id: row.animal_id,
        peso: row.peso,
        fecha: row.fecha,
        animales: Array.isArray(row.animales)
          ? (row.animales[0] ?? null)
          : (row.animales ?? null),
      }));
      setPesajes(normalizado);
    }

    setCargando(false);
  }, [animalSeleccionado, fechaDesde, fechaHasta]);

  // CORRECCIÓN 3: llamar cargarPesajes desde useEffect (bug original)
  // Solo depende de cargarPesajes — que ya captura animalSeleccionado,
  // fechaDesde y fechaHasta en su propio useCallback.
  useEffect(() => {
    cargarPesajes();
  }, [cargarPesajes]);

  // ─────────────────────────────────────────────────────────────
  //  CORRECCIÓN 4: Estadísticas calculadas con useMemo
  //  Solo sobre los pesajes filtrados actuales
  // ─────────────────────────────────────────────────────────────
  const totalPesajes = pesajes.length;

  const pesoPromedio = useMemo(() =>
    pesajes.length > 0
      ? (pesajes.reduce((sum, p) => sum + Number(p.peso), 0) / pesajes.length).toFixed(1)
      : 0,
    [pesajes]
  );

  const pesoMaximo = useMemo(() =>
    pesajes.length > 0 ? Math.max(...pesajes.map((p) => Number(p.peso))) : 0,
    [pesajes]
  );

  const pesoMinimo = useMemo(() =>
    pesajes.length > 0 ? Math.min(...pesajes.map((p) => Number(p.peso))) : 0,
    [pesajes]
  );

  // ── Estadísticas individuales (animal seleccionado) ───────────
  const estadisticasAnimal = useMemo(() => {
    if (!animalSeleccionado || pesajes.length === 0) return null;

    const ordenados = [...pesajes].sort(
      (a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime()
    );

    const pesoInicial = ordenados[0]?.peso ?? null;
    const pesoActual = ordenados[ordenados.length - 1]?.peso ?? null;
    const ultimaFecha = ordenados[ordenados.length - 1]?.fecha ?? null;
    const animal = animales.find((a) => a.id === Number(animalSeleccionado));

    let gananciaTotalKg: number | null = null;
    let promedioDiarioKg: number | null = null;
    let variacionPct: number | null = null;

    if (pesoInicial !== null && pesoActual !== null) {
      gananciaTotalKg = Number((pesoActual - pesoInicial).toFixed(1));

      const diasTotal =
        (new Date(ultimaFecha!).getTime() - new Date(ordenados[0].fecha).getTime()) /
        (1000 * 60 * 60 * 24);

      if (diasTotal > 0) {
        promedioDiarioKg = Number((gananciaTotalKg / diasTotal).toFixed(3));
      }

      if (pesoInicial > 0) {
        variacionPct = Number(((gananciaTotalKg / pesoInicial) * 100).toFixed(1));
      }
    }

    return {
      nombre: animal?.nombre ?? pesajes[0]?.animales?.nombre ?? "—",
      arete: animal?.arete ?? pesajes[0]?.animales?.arete ?? "—",
      cantidadPesajes: pesajes.length,
      ultimaFecha,
      pesoInicial,
      pesoActual,
      gananciaTotalKg,
      promedioDiarioKg,
      variacionPct,
    };
  }, [pesajes, animalSeleccionado, animales]);

  // ── Datos para la gráfica ─────────────────────────────────────
  const datosGrafica = useMemo(() =>
    [...pesajes]
      .sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime())
      .map((p) => ({
        fecha: new Date(p.fecha + "T12:00:00").toLocaleDateString("es-CO", {
          day: "2-digit",
          month: "short",
        }),
        peso: Number(p.peso),
      })),
    [pesajes]
  );

  // ─────────────────────────────────────────────────────────────
  //  ORIGINAL: guardarPesaje con auditoría y roles preservados
  // ─────────────────────────────────────────────────────────────
  async function guardarPesaje() {
    if (editandoId && rol !== "admin") {
      mostrarToast("Solo el administrador puede editar pesajes", "error");
      return;
    }
    if (!animalId || !fecha || !peso) {
      mostrarToast("Debe completar todos los campos", "error");
      return;
    }

    let error;

    if (editandoId) {
      const resultado = await supabase
        .from("Pesaje")
        .update({
          animal_id: Number(animalId),
          fecha,
          peso: Number(peso),
        })
        .eq("id", editandoId);

      error = resultado.error;

      if (!resultado.error) {
        const usuarioGuardado = localStorage.getItem("usuario");
        if (usuarioGuardado) {
          const usuario = JSON.parse(usuarioGuardado);
          await registrarAuditoria(
            usuario.id,
            usuario.nombre,
            "EDITAR_PESAJE",
            "PESAJES",
            `Pesaje editado - ${peso} kg`
          );
        }
      }
    } else {
      const resultado = await supabase
        .from("Pesaje")
        .insert([
          {
            animal_id: Number(animalId),
            fecha,
            peso: Number(peso),
          },
        ]);

      error = resultado.error;

      if (!resultado.error) {
        const usuarioGuardado = localStorage.getItem("usuario");
        if (usuarioGuardado) {
          const usuario = JSON.parse(usuarioGuardado);
          await registrarAuditoria(
            usuario.id,
            usuario.nombre,
            "CREAR_PESAJE",
            "PESAJES",
            `Pesaje registrado - ${peso} kg`
          );
        }
      }
    }

    if (error) {
      mostrarToast(error.message, "error");
      return;
    }

    await cargarPesajes();
    mostrarToast(editandoId ? "Pesaje actualizado" : "Pesaje guardado correctamente");

    setAnimalId("");
    setFecha("");
    setPeso("");
    setEditandoId(null);
  }

  // ─────────────────────────────────────────────────────────────
  //  ORIGINAL: editarPesaje
  // ─────────────────────────────────────────────────────────────
  function editarPesaje(pesaje: Pesaje) {
    setEditandoId(pesaje.id);
    setAnimalId(String(pesaje.animal_id));
    setFecha(pesaje.fecha);
    setPeso(String(pesaje.peso));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // ─────────────────────────────────────────────────────────────
  //  ORIGINAL: eliminarPesaje con auditoría y rol preservados
  // ─────────────────────────────────────────────────────────────
  async function eliminarPesaje(id: number) {
    if (rol !== "admin") {
      mostrarToast("Solo el administrador puede eliminar pesajes", "error");
      return;
    }

    const confirmar = confirm("¿Desea eliminar este pesaje?");
    if (!confirmar) return;

    const { error } = await supabase.from("Pesaje").delete().eq("id", id);

    if (error) {
      mostrarToast(error.message, "error");
      return;
    }

    const usuarioGuardado = localStorage.getItem("usuario");
    if (usuarioGuardado) {
      const usuario = JSON.parse(usuarioGuardado);
      await registrarAuditoria(
        usuario.id,
        usuario.nombre,
        "ELIMINAR_PESAJE",
        "PESAJES",
        `Pesaje eliminado ID ${id}`
      );
    }

    await cargarPesajes();
    mostrarToast("Pesaje eliminado");
  }

  // ─────────────────────────────────────────────────────────────
  //  NUEVO: limpiar filtros
  // ─────────────────────────────────────────────────────────────
  function limpiarFiltros() {
    setAnimalSeleccionado("");
    setFechaDesde("");
    setFechaHasta("");
    router.push("/pesajes");
  }

  // ─────────────────────────────────────────────────────────────
  //  NUEVO: Exportar a Excel
  // ─────────────────────────────────────────────────────────────
  async function exportarExcel() {
    if (pesajes.length === 0) return;
    setExportando(true);
    try {
      const XLSX = await import("xlsx");
      const filas = pesajes.map((p) => ({
        Fecha: p.fecha,
        Animal: p.animales?.nombre ?? "",
        Arete: p.animales?.arete ?? "",
        "Peso (kg)": p.peso,
      }));
      const ws = XLSX.utils.json_to_sheet(filas);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Pesajes");
      const nombre = estadisticasAnimal
        ? `pesajes_${estadisticasAnimal.arete}_${new Date().toISOString().slice(0, 10)}.xlsx`
        : `pesajes_${new Date().toISOString().slice(0, 10)}.xlsx`;
      XLSX.writeFile(wb, nombre);
      mostrarToast("Excel exportado correctamente.");
    } catch {
      mostrarToast("Error al exportar a Excel.", "error");
    } finally {
      setExportando(false);
    }
  }

  // ─────────────────────────────────────────────────────────────
  //  NUEVO: Exportar a PDF
  // ─────────────────────────────────────────────────────────────
  async function exportarPDF() {
    if (pesajes.length === 0) return;
    setExportando(true);
    try {
      const { default: jsPDF } = await import("jspdf");
      const { default: autoTable } = await import("jspdf-autotable");
      const doc = new jsPDF();
      const hoy = new Date().toLocaleDateString("es-CO");

      doc.setFontSize(18);
      doc.setTextColor(22, 101, 52);
      doc.text("GanaderoPro — Historial de Pesajes", 14, 22);
      doc.setFontSize(11);
      doc.setTextColor(100);

      if (estadisticasAnimal) {
        doc.text(`Animal: ${estadisticasAnimal.nombre}`, 14, 32);
        doc.text(`Arete: ${estadisticasAnimal.arete}`, 14, 38);
        doc.text(`Fecha de reporte: ${hoy}`, 14, 44);
        doc.text(`Total pesajes: ${estadisticasAnimal.cantidadPesajes}`, 14, 50);
        if (estadisticasAnimal.pesoInicial !== null) {
          doc.text(`Peso inicial: ${estadisticasAnimal.pesoInicial} kg`, 110, 32);
          doc.text(`Peso actual: ${estadisticasAnimal.pesoActual} kg`, 110, 38);
          doc.text(`Ganancia total: ${estadisticasAnimal.gananciaTotalKg} kg`, 110, 44);
          doc.text(`Variación: ${estadisticasAnimal.variacionPct}%`, 110, 50);
        }
        doc.setDrawColor(22, 101, 52);
        doc.line(14, 55, 196, 55);
      } else {
        doc.text(`Reporte de todos los pesajes — ${hoy}`, 14, 32);
      }

      autoTable(doc, {
        startY: 60,
        head: [["Fecha", "Animal", "Arete", "Peso (kg)"]],
        body: pesajes.map((p) => [
          p.fecha,
          p.animales?.nombre ?? "",
          p.animales?.arete ?? "",
          `${p.peso} kg`,
        ]),
        styles: { fontSize: 9 },
        headStyles: { fillColor: [22, 101, 52] as [number, number, number] },
        alternateRowStyles: { fillColor: [240, 253, 244] as [number, number, number] },
      });

      const nombre = estadisticasAnimal
        ? `pesajes_${estadisticasAnimal.arete}_${new Date().toISOString().slice(0, 10)}.pdf`
        : `pesajes_${new Date().toISOString().slice(0, 10)}.pdf`;
      doc.save(nombre);
      mostrarToast("PDF exportado correctamente.");
    } catch {
      mostrarToast("Error al exportar. Verifica que jspdf y jspdf-autotable estén instalados.", "error");
    } finally {
      setExportando(false);
    }
  }

  // ── Helper fecha legible ──────────────────────────────────────
  function fmtFecha(iso: string) {
    return new Date(iso + "T12:00:00").toLocaleDateString("es-CO", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }

  // ─────────────────────────────────────────────────────────────
  //  RENDER
  // ─────────────────────────────────────────────────────────────
  return (
    <AuthGuard>
      <main className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 p-6 md:p-10">
        <div className="max-w-6xl mx-auto">

          {/* ── ORIGINAL: Volver al Dashboard ─────────────────── */}
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-green-700 hover:text-green-900 font-medium mb-6 transition-colors"
          >
            ← Volver al Dashboard
          </Link>

          {/* ── ORIGINAL: Header ──────────────────────────────── */}
          <div className="mb-6">
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight bg-gradient-to-r from-green-800 to-emerald-600 bg-clip-text text-transparent flex items-center gap-3">
              ⚖️ Control de Pesajes
            </h1>
            <p className="text-gray-500 mt-1">
              {estadisticasAnimal
                ? `${estadisticasAnimal.nombre} — Arete: ${estadisticasAnimal.arete}`
                : "Registra y monitorea el peso de tus animales"}
            </p>
          </div>

          {/* ── ORIGINAL: Formulario (rol preservado) ─────────── */}
          {rol !== "visualizador" && (
            <div className="bg-white/90 backdrop-blur-sm p-6 rounded-2xl shadow-lg ring-1 ring-gray-100">
              <h2 className="text-lg font-bold text-green-700 mb-4 flex items-center gap-2">
                {editandoId ? "✏️ Editar Pesaje" : "📝 Nuevo Pesaje"}
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">
                    Animal
                  </label>
                  <select
                    value={animalId}
                    onChange={(e) => setAnimalId(e.target.value)}
                    className="w-full border border-gray-200 p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                  >
                    <option value="">Seleccione Animal</option>
                    {animales.map((animal) => (
                      <option key={animal.id} value={animal.id}>
                        {animal.arete} - {animal.nombre}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">
                    Fecha
                  </label>
                  <input
                    type="date"
                    value={fecha}
                    onChange={(e) => setFecha(e.target.value)}
                    className="w-full border border-gray-200 p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">
                    Peso (Kg)
                  </label>
                  <input
                    type="number"
                    placeholder="Ej: 320"
                    value={peso}
                    onChange={(e) => setPeso(e.target.value)}
                    className="w-full border border-gray-200 p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-5">
                <button
                  onClick={guardarPesaje}
                  className="inline-flex items-center gap-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold px-6 py-3 rounded-xl shadow-md shadow-green-900/20 hover:shadow-lg hover:-translate-y-0.5 transition-all"
                >
                  {editandoId ? "💾 Actualizar Pesaje" : "➕ Guardar Pesaje"}
                </button>

                {editandoId && (
                  <button
                    onClick={() => {
                      setAnimalId("");
                      setFecha("");
                      setPeso("");
                      setEditandoId(null);
                    }}
                    className="px-6 py-3 rounded-xl font-semibold text-gray-600 hover:bg-gray-100 transition-colors"
                  >
                    Cancelar
                  </button>
                )}
              </div>
            </div>
          )}

          {/* ── NUEVO: Panel de filtros ────────────────────────── */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-md ring-1 ring-gray-100 p-5 mt-8">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-green-700 mb-4">
              Filtros
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

              {/* CORRECCIÓN 5: Select controlado — pre-selecciona desde URL */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Animal</label>
                <select
                  value={animalSeleccionado}
                  onChange={(e) => setAnimalSeleccionado(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-green-400 focus:outline-none"
                >
                  <option value="">Todos los animales</option>
                  {animales.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.arete} - {a.nombre}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Desde</label>
                <input
                  type="date"
                  value={fechaDesde}
                  onChange={(e) => setFechaDesde(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-green-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Hasta</label>
                <input
                  type="date"
                  value={fechaHasta}
                  onChange={(e) => setFechaHasta(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-green-400 focus:outline-none"
                />
              </div>

              <div className="flex items-end">
                <button
                  onClick={limpiarFiltros}
                  className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  🔄 Limpiar filtros
                </button>
              </div>
            </div>
          </div>

          {/* ── ORIGINAL: Tarjetas estadísticas (CORRECCIÓN: sobre pesajes filtrados) */}
          {cargando ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-8">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-32" />
              ))}
            </div>
          ) : animalSeleccionado && estadisticasAnimal ? (
            /* Tarjetas individuales cuando hay animal seleccionado */
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mt-8">
              <StatCard color="green" icon="📋" titulo="Pesajes" valor={String(estadisticasAnimal.cantidadPesajes)} sub="Registros totales" />
              <StatCard color="blue" icon="📉" titulo="Peso inicial" valor={estadisticasAnimal.pesoInicial !== null ? `${estadisticasAnimal.pesoInicial} kg` : "—"} sub="Primer registro" />
              <StatCard color="emerald" icon="📈" titulo="Peso actual" valor={estadisticasAnimal.pesoActual !== null ? `${estadisticasAnimal.pesoActual} kg` : "—"} sub="Último registro" />
              <StatCard
                color="purple"
                icon="🏋️"
                titulo="Ganancia"
                valor={estadisticasAnimal.gananciaTotalKg !== null ? `${estadisticasAnimal.gananciaTotalKg > 0 ? "+" : ""}${estadisticasAnimal.gananciaTotalKg} kg` : "—"}
                sub="Total desde inicio"
                positivo={estadisticasAnimal.gananciaTotalKg !== null && estadisticasAnimal.gananciaTotalKg > 0}
              />
              <StatCard
                color="orange"
                icon="📊"
                titulo="Variación"
                valor={estadisticasAnimal.variacionPct !== null ? `${estadisticasAnimal.variacionPct > 0 ? "+" : ""}${estadisticasAnimal.variacionPct}%` : "—"}
                sub="Porcentual total"
                positivo={estadisticasAnimal.variacionPct !== null && estadisticasAnimal.variacionPct > 0}
              />
            </div>
          ) : (
            /* ORIGINAL: Tarjetas globales exactas */
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-8">

              <div className="group relative bg-white/80 backdrop-blur-sm p-6 rounded-2xl shadow-md shadow-gray-200/50 ring-1 ring-gray-100 hover:shadow-xl hover:shadow-green-900/10 hover:-translate-y-1 transition-all duration-300">
                <div className="absolute top-0 left-0 h-1.5 w-full rounded-t-2xl bg-gradient-to-r from-green-500 to-emerald-500" />
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-green-700">Total Pesajes</h3>
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-100 text-green-700 text-lg">📋</span>
                </div>
                <p className="text-4xl font-bold mt-3 text-gray-800">{totalPesajes}</p>
              </div>

              <div className="group relative bg-white/80 backdrop-blur-sm p-6 rounded-2xl shadow-md shadow-gray-200/50 ring-1 ring-gray-100 hover:shadow-xl hover:shadow-blue-900/10 hover:-translate-y-1 transition-all duration-300">
                <div className="absolute top-0 left-0 h-1.5 w-full rounded-t-2xl bg-gradient-to-r from-blue-500 to-cyan-500" />
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-blue-700">Peso Promedio</h3>
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-700 text-lg">📊</span>
                </div>
                <p className="text-4xl font-bold mt-3 text-gray-800">{pesoPromedio} <span className="text-xl font-semibold text-gray-400">kg</span></p>
              </div>

              <div className="group relative bg-white/80 backdrop-blur-sm p-6 rounded-2xl shadow-md shadow-gray-200/50 ring-1 ring-gray-100 hover:shadow-xl hover:shadow-orange-900/10 hover:-translate-y-1 transition-all duration-300">
                <div className="absolute top-0 left-0 h-1.5 w-full rounded-t-2xl bg-gradient-to-r from-orange-500 to-amber-500" />
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-orange-700">Peso Máximo</h3>
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-100 text-orange-700 text-lg">📈</span>
                </div>
                <p className="text-4xl font-bold mt-3 text-gray-800">{pesoMaximo} <span className="text-xl font-semibold text-gray-400">kg</span></p>
              </div>

              <div className="group relative bg-white/80 backdrop-blur-sm p-6 rounded-2xl shadow-md shadow-gray-200/50 ring-1 ring-gray-100 hover:shadow-xl hover:shadow-red-900/10 hover:-translate-y-1 transition-all duration-300">
                <div className="absolute top-0 left-0 h-1.5 w-full rounded-t-2xl bg-gradient-to-r from-red-500 to-rose-500" />
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-red-700">Peso Mínimo</h3>
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-100 text-red-700 text-lg">📉</span>
                </div>
                <p className="text-4xl font-bold mt-3 text-gray-800">{pesoMinimo} <span className="text-xl font-semibold text-gray-400">kg</span></p>
              </div>
            </div>
          )}

          {/* ── NUEVO: Info adicional del animal ──────────────── */}
          {!cargando && animalSeleccionado && estadisticasAnimal && (
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl ring-1 ring-gray-100 shadow-md p-4 mt-4 flex flex-wrap gap-6 text-sm">
              <span className="text-gray-500">
                <span className="font-semibold text-gray-700">Último pesaje:</span>{" "}
                {estadisticasAnimal.ultimaFecha ? fmtFecha(estadisticasAnimal.ultimaFecha) : "—"}
              </span>
              {estadisticasAnimal.promedioDiarioKg !== null && (
                <span className="text-gray-500">
                  <span className="font-semibold text-gray-700">Ganancia promedio/día:</span>{" "}
                  {estadisticasAnimal.promedioDiarioKg} kg
                </span>
              )}
              <span className="text-gray-500">
                <span className="font-semibold text-gray-700">Total pesajes:</span>{" "}
                {estadisticasAnimal.cantidadPesajes}
              </span>
            </div>
          )}

          {/* ── NUEVO: Gráfica de evolución ────────────────────── */}
          {!cargando && animalSeleccionado && datosGrafica.length > 1 && (
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-md ring-1 ring-gray-100 p-6 mt-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-green-700 flex items-center gap-2">
                  📈 Evolución de Peso
                </h2>
                <span className="text-xs text-gray-400">{datosGrafica.length} registros</span>
              </div>
              <div className="h-56 md:h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={datosGrafica} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#d1fae5" />
                    <XAxis dataKey="fecha" tick={{ fontSize: 11, fill: "#6b7280" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: "#6b7280" }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `${v}kg`} />
                    <Tooltip content={<CustomTooltip />} />
                    {estadisticasAnimal?.pesoInicial && (
                      <ReferenceLine
                        y={estadisticasAnimal.pesoInicial}
                        stroke="#9ca3af"
                        strokeDasharray="4 4"
                        label={{ value: "Inicio", fontSize: 10, fill: "#9ca3af" }}
                      />
                    )}
                    <Line type="monotone" dataKey="peso" stroke="#16a34a" strokeWidth={2.5} dot={{ r: 4, fill: "#16a34a", strokeWidth: 0 }} activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* ── ORIGINAL: Historial de Pesajes (tabla exacta) ─── */}
          <div className="mt-10">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
              <h2 className="text-2xl font-bold text-green-700 flex items-center gap-2">
                📚 Historial de Pesajes
              </h2>

              {/* NUEVO: Botones exportar */}
              {!cargando && pesajes.length > 0 && (
                <div className="flex gap-2">
                  <button
                    onClick={exportarExcel}
                    disabled={exportando}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-green-200 bg-green-50 px-3 py-1.5 text-xs font-medium text-green-700 hover:bg-green-100 transition-colors disabled:opacity-50"
                  >
                    📊 Exportar Excel
                  </button>
                  <button
                    onClick={exportarPDF}
                    disabled={exportando}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100 transition-colors disabled:opacity-50"
                  >
                    📄 Exportar PDF
                  </button>
                </div>
              )}
            </div>

            <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-md ring-1 ring-gray-100 overflow-hidden">
              {cargando ? (
                <div className="p-6 space-y-3">
                  {[...Array(4)].map((_, i) => (
                    <Skeleton key={i} className="h-12" />
                  ))}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-gradient-to-r from-green-700 to-emerald-700 text-white">
                        <th className="p-4 font-semibold text-sm uppercase tracking-wide">Animal</th>
                        <th className="p-4 font-semibold text-sm uppercase tracking-wide">Fecha</th>
                        <th className="p-4 font-semibold text-sm uppercase tracking-wide">Peso</th>
                        <th className="p-4 font-semibold text-sm uppercase tracking-wide text-center">Acciones</th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-gray-100">
                      {pesajes.map((pesaje) => (
                        <tr key={pesaje.id} className="hover:bg-green-50/60 transition-colors">
                          <td className="p-4">
                            <span className="inline-flex items-center px-3 py-1 rounded-full bg-green-100 text-green-800 text-sm font-semibold">
                              {pesaje.animales?.arete} - {pesaje.animales?.nombre}
                            </span>
                          </td>
                          <td className="p-4 text-gray-600">📅 {pesaje.fecha}</td>
                          <td className="p-4 text-gray-800 font-semibold">{pesaje.peso} kg</td>
                          <td className="p-4">
                            <div className="flex items-center justify-center gap-2">
                              {rol === "admin" && (
                                <button
                                  onClick={() => editarPesaje(pesaje)}
                                  className="inline-flex items-center gap-1 bg-yellow-400 hover:bg-yellow-500 text-yellow-950 text-sm font-semibold px-3 py-1.5 rounded-lg shadow-sm transition-colors"
                                >
                                  ✏️ Editar
                                </button>
                              )}
                              {rol === "admin" && (
                                <button
                                  onClick={() => eliminarPesaje(pesaje.id)}
                                  className="inline-flex items-center gap-1 bg-red-500 hover:bg-red-600 text-white text-sm font-semibold px-3 py-1.5 rounded-lg shadow-sm transition-colors"
                                >
                                  🗑️ Eliminar
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}

                      {pesajes.length === 0 && (
                        <tr>
                          <td colSpan={4} className="p-10 text-center text-gray-400">
                            {animalSeleccionado
                              ? "⚖️ No existen pesajes registrados para este animal"
                              : "⚖️ No hay pesajes registrados"}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* ── NUEVO: Módulos futuros (estructura preparada) ─── */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-10 opacity-60">
            {[
              { icon: "💉", label: "Vacunación", desc: "Próximamente" },
              { icon: "🐄", label: "Reproducción", desc: "Próximamente" },
              { icon: "💰", label: "Costos", desc: "Próximamente" },
            ].map((m) => (
              <div
                key={m.label}
                className="bg-white/60 rounded-xl p-4 ring-1 ring-gray-100 flex items-center gap-3 cursor-not-allowed"
                title="Próximamente"
              >
                <span className="text-2xl">{m.icon}</span>
                <div>
                  <p className="font-semibold text-sm text-gray-700">{m.label}</p>
                  <p className="text-xs text-gray-400">{m.desc}</p>
                </div>
              </div>
            ))}
          </div>

        </div>
      </main>

      {/* ── NUEVO: Toast (reemplaza alert()) ──────────────────── */}
      {toast && (
        <Toast
          mensaje={toast.mensaje}
          tipo={toast.tipo}
          onClose={() => setToast(null)}
        />
      )}
    </AuthGuard>
  );
}

// ─── StatCard (solo para vista individual) ────────────────────────
function StatCard({
  color, icon, titulo, valor, sub, positivo,
}: {
  color: "green" | "blue" | "emerald" | "purple" | "orange";
  icon: string;
  titulo: string;
  valor: string;
  sub: string;
  positivo?: boolean;
}) {
  const g: Record<string, string> = {
    green: "from-green-500 to-emerald-500",
    blue: "from-blue-500 to-cyan-500",
    emerald: "from-emerald-500 to-teal-500",
    purple: "from-purple-500 to-fuchsia-500",
    orange: "from-orange-500 to-amber-500",
  };
  const t: Record<string, string> = {
    green: "text-green-700", blue: "text-blue-700",
    emerald: "text-emerald-700", purple: "text-purple-700", orange: "text-orange-700",
  };
  const f: Record<string, string> = {
    green: "bg-green-100 text-green-700", blue: "bg-blue-100 text-blue-700",
    emerald: "bg-emerald-100 text-emerald-700", purple: "bg-purple-100 text-purple-700",
    orange: "bg-orange-100 text-orange-700",
  };
  return (
    <div className="group relative bg-white/80 backdrop-blur-sm p-5 rounded-2xl shadow-md shadow-gray-200/50 ring-1 ring-gray-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
      <div className={`absolute top-0 left-0 h-1.5 w-full rounded-t-2xl bg-gradient-to-r ${g[color]}`} />
      <div className="flex items-center justify-between">
        <h3 className={`text-xs font-semibold uppercase tracking-wide ${t[color]}`}>{titulo}</h3>
        <span className={`flex h-9 w-9 items-center justify-center rounded-xl text-base ${f[color]}`}>{icon}</span>
      </div>
      <p className="mt-1 text-xs text-gray-400">{sub}</p>
      <p className={`text-3xl font-bold mt-2 ${positivo === undefined ? "text-gray-800" : positivo ? "text-green-600" : "text-red-500"}`}>
        {valor}
      </p>
    </div>
  );
}

// ─── Export con Suspense (requerido en Next.js 15) ────────────────
export default function PesajesPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-teal-50">
          <div className="text-center">
            <div className="text-4xl mb-3 animate-bounce">⚖️</div>
            <p className="text-green-700 font-semibold">Cargando Pesajes...</p>
          </div>
        </div>
      }
    >
      <PesajesContent />
    </Suspense>
  );
}
