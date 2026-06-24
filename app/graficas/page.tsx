"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";
import AuthGuard from "../../components/AuthGuard";
import Link from "next/link";
import { registrarAuditoria } from "../../lib/auditoria";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts";

// Paleta para diferenciar animales en el comparador (solo presentación)
const COLORES = [
  "#16a34a", // verde
  "#2563eb", // azul
  "#ea580c", // naranja
  "#9333ea", // morado
  "#dc2626", // rojo
  "#0891b2", // cian
];

const MAX_COMPARAR = 6; // por encima de esto los colores dejan de distinguirse bien
const FILAS_POR_PAGINA = 10;

export default function GraficasPage() {

  const [datos, setDatos] = useState<any[]>([]);
  const [animalesComparar, setAnimalesComparar] = useState<string[]>([]);
  const [busquedaComparar, setBusquedaComparar] = useState("");
  const [busquedaTabla, setBusquedaTabla] = useState("");
  const [orden, setOrden] = useState<{ campo: "nombre" | "ultimoPeso" | "tendencia"; dir: "asc" | "desc" }>({
    campo: "nombre",
    dir: "asc",
  });
  const [pagina, setPagina] = useState(1);

  useEffect(() => {
    cargarGrafica();
  }, []);


  

  async function cargarGrafica() {

    const { data, error } = await supabase
      .from("Pesaje")
      .select(`
        fecha,
        peso,
        animales!Pesaje_animal_id_fkey (
          nombre
        )
      `)
      .order("fecha");

    if (error) {
      console.log(error);
      return;
    }

    const formateado =
      data?.map((item: any) => ({
        fecha: item.fecha,
        peso: item.peso,
        animal: item.animales?.nombre,
      })) || [];

    setDatos(formateado);

    const usuarioGuardado =
    localStorage.getItem("usuario");
  
  if (usuarioGuardado) {
  
    const usuario =
      JSON.parse(usuarioGuardado);
  
    await registrarAuditoria(
      usuario.id,
      usuario.nombre,
      "VER_GRAFICAS",
      "GRAFICAS",
      "Usuario consultó reportes estadísticos"
    );
  }
  }



  // Lista única de animales presentes en los datos (solo presentación)
  const nombresAnimales = useMemo(() => {
    const set = new Set<string>();
    datos.forEach((d) => {
      if (d.animal) set.add(d.animal);
    });
    return Array.from(set);
  }, [datos]);

  // Estadísticas generales para las tarjetas de resumen.
  // Se calculan a partir de los mismos `datos` ya cargados, sin nuevas consultas.
  const resumen = useMemo(() => {
    if (datos.length === 0) {
      return {
        totalAnimales: 0,
        pesoPromedio: 0,
        pesoMaximo: 0,
        pesoMinimo: 0,
        ultimaFecha: null as string | null,
      };
    }

    const pesos = datos.map((d) => Number(d.peso));
    const suma = pesos.reduce((acc, p) => acc + p, 0);
    const fechas = datos.map((d) => d.fecha).sort();

    return {
      totalAnimales: nombresAnimales.length,
      pesoPromedio: Number((suma / pesos.length).toFixed(1)),
      pesoMaximo: Math.max(...pesos),
      pesoMinimo: Math.min(...pesos),
      ultimaFecha: fechas[fechas.length - 1],
    };
  }, [datos, nombresAnimales]);

  // Línea general: promedio del hato por fecha (no por animal).
  // Siempre visible, sin importar cuántos animales haya.
  const promedioPorFecha = useMemo(() => {
    const porFecha = new Map<string, number[]>();

    datos.forEach((d) => {
      if (!porFecha.has(d.fecha)) porFecha.set(d.fecha, []);
      porFecha.get(d.fecha)!.push(Number(d.peso));
    });

    return Array.from(porFecha.entries())
      .map(([fecha, pesos]) => ({
        fecha,
        promedio: Number(
          (pesos.reduce((a, b) => a + b, 0) / pesos.length).toFixed(1)
        ),
      }))
      .sort((a, b) => a.fecha.localeCompare(b.fecha));
  }, [datos]);

  // Pivoteo de los datos: una fila por fecha, una columna por animal.
  // Se usa solo para el comparador (animales elegidos manualmente).
  const datosPivot = useMemo(() => {
    const porFecha = new Map<string, any>();

    datos.forEach((d) => {
      if (!porFecha.has(d.fecha)) {
        porFecha.set(d.fecha, { fecha: d.fecha });
      }
      const fila = porFecha.get(d.fecha);
      fila[d.animal ?? "Sin nombre"] = d.peso;
    });

    return Array.from(porFecha.values()).sort((a, b) =>
      a.fecha.localeCompare(b.fecha)
    );
  }, [datos]);

  // Resumen por animal: último peso + tendencia (sube/baja/igual) para la tabla.
  const resumenPorAnimal = useMemo(() => {
    const porAnimal = new Map<string, { fecha: string; peso: number }[]>();

    datos.forEach((d) => {
      const nombre = d.animal ?? "Sin nombre";
      if (!porAnimal.has(nombre)) porAnimal.set(nombre, []);
      porAnimal.get(nombre)!.push({ fecha: d.fecha, peso: Number(d.peso) });
    });

    return Array.from(porAnimal.entries()).map(([nombre, registros]) => {
      const ordenados = [...registros].sort((a, b) =>
        a.fecha.localeCompare(b.fecha)
      );
      const ultimo = ordenados[ordenados.length - 1];
      const anterior = ordenados[ordenados.length - 2];
      const tendencia = anterior ? ultimo.peso - anterior.peso : 0;

      return {
        nombre,
        ultimoPeso: ultimo.peso,
        ultimaFecha: ultimo.fecha,
        tendencia,
        totalRegistros: ordenados.length,
      };
    });
  }, [datos]);

  const filaPorAnimal = useMemo(
    () =>
      resumenPorAnimal
        .filter((a) =>
          a.nombre.toLowerCase().includes(busquedaTabla.toLowerCase())
        )
        .sort((a, b) => {
          const dir = orden.dir === "asc" ? 1 : -1;
          if (orden.campo === "nombre") return a.nombre.localeCompare(b.nombre) * dir;
          if (orden.campo === "ultimoPeso") return (a.ultimoPeso - b.ultimoPeso) * dir;
          return (a.tendencia - b.tendencia) * dir;
        }),
    [resumenPorAnimal, busquedaTabla, orden]
  );

  const totalPaginas = Math.max(1, Math.ceil(filaPorAnimal.length / FILAS_POR_PAGINA));
  const filasPagina = filaPorAnimal.slice(
    (pagina - 1) * FILAS_POR_PAGINA,
    pagina * FILAS_POR_PAGINA
  );

  // Sugerencias del buscador del comparador: excluye los ya elegidos
  const sugerenciasComparar = useMemo(() => {
    if (!busquedaComparar) return [];
    return nombresAnimales
      .filter(
        (n) =>
          !animalesComparar.includes(n) &&
          n.toLowerCase().includes(busquedaComparar.toLowerCase())
      )
      .slice(0, 6);
  }, [busquedaComparar, nombresAnimales, animalesComparar]);

  function agregarComparar(nombre: string) {
    if (animalesComparar.length >= MAX_COMPARAR) return;
    setAnimalesComparar((prev) => [...prev, nombre]);
    setBusquedaComparar("");
  }

  function quitarComparar(nombre: string) {
    setAnimalesComparar((prev) => prev.filter((n) => n !== nombre));
  }

  function cambiarOrden(campo: "nombre" | "ultimoPeso" | "tendencia") {
    setOrden((prev) =>
      prev.campo === campo
        ? { campo, dir: prev.dir === "asc" ? "desc" : "asc" }
        : { campo, dir: "asc" }
    );
    setPagina(1);
  }

  function CustomTooltipGeneral({ active, payload, label }: any) {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white/95 backdrop-blur-md px-4 py-3 rounded-2xl shadow-xl ring-1 ring-gray-100 min-w-[160px]">
          <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 mb-1">
            📅 {label}
          </p>
          <p className="text-lg font-bold text-gray-800">
            {payload[0].value} <span className="text-sm font-medium text-gray-400">kg promedio</span>
          </p>
        </div>
      );
    }
    return null;
  }

  function CustomTooltipComparar({ active, payload, label }: any) {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white/95 backdrop-blur-md px-4 py-3 rounded-2xl shadow-xl ring-1 ring-gray-100 min-w-[180px]">
          <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 mb-2 pb-2 border-b border-gray-100">
            📅 {label}
          </p>
          <div className="space-y-1.5">
            {payload.map((entry: any) => (
              <div key={entry.dataKey} className="flex items-center justify-between gap-4 text-sm">
                <span className="flex items-center gap-1.5 text-gray-600">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: entry.color }} />
                  {entry.dataKey}
                </span>
                <span className="font-semibold text-gray-800">{entry.value} kg</span>
              </div>
            ))}
          </div>
        </div>
      );
    }
    return null;
  }

  return (
    <AuthGuard>
    <main className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 p-6 md:p-10">
      <div className="max-w-7xl mx-auto">

        <Link
          href="/"
          className="inline-flex items-center gap-2 text-green-700 hover:text-green-900 font-medium mb-6 transition-colors duration-200"
        >
          ← Volver al Dashboard
        </Link>

        <div className="mb-10">
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight bg-gradient-to-r from-green-800 to-emerald-600 bg-clip-text text-transparent flex items-center gap-3">
            📈 Evolución de Peso
          </h1>
          <p className="text-gray-500 mt-1">
            Tendencia general del hato y comparación por animal
          </p>
        </div>

        {/* Tarjetas de resumen */}
        {datos.length > 0 && (
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-5 mb-10">

            <div className="group relative bg-white/70 backdrop-blur-md p-5 rounded-2xl shadow-md shadow-gray-200/50 ring-1 ring-white/60 hover:shadow-xl hover:shadow-green-900/10 hover:-translate-y-1 transition-all duration-300">
              <div className="absolute top-0 left-0 h-1.5 w-full rounded-t-2xl bg-gradient-to-r from-green-500 to-emerald-500" />
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-green-700">
                  Animales con registros
                </h3>
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-green-100 text-green-700 text-base shrink-0">
                  🐄
                </span>
              </div>
              <p className="text-3xl font-bold mt-3 text-gray-800">
                {resumen.totalAnimales}
              </p>
            </div>

            <div className="group relative bg-white/70 backdrop-blur-md p-5 rounded-2xl shadow-md shadow-gray-200/50 ring-1 ring-white/60 hover:shadow-xl hover:shadow-blue-900/10 hover:-translate-y-1 transition-all duration-300">
              <div className="absolute top-0 left-0 h-1.5 w-full rounded-t-2xl bg-gradient-to-r from-blue-500 to-cyan-500" />
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-blue-700">
                  Peso promedio
                </h3>
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-100 text-blue-700 text-base shrink-0">
                  ⚖️
                </span>
              </div>
              <p className="text-3xl font-bold mt-3 text-gray-800">
                {resumen.pesoPromedio} <span className="text-lg font-semibold text-gray-400">kg</span>
              </p>
            </div>

            <div className="group relative bg-white/70 backdrop-blur-md p-5 rounded-2xl shadow-md shadow-gray-200/50 ring-1 ring-white/60 hover:shadow-xl hover:shadow-orange-900/10 hover:-translate-y-1 transition-all duration-300">
              <div className="absolute top-0 left-0 h-1.5 w-full rounded-t-2xl bg-gradient-to-r from-orange-500 to-amber-500" />
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-orange-700">
                  Peso máximo
                </h3>
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-100 text-orange-700 text-base shrink-0">
                  📈
                </span>
              </div>
              <p className="text-3xl font-bold mt-3 text-gray-800">
                {resumen.pesoMaximo} <span className="text-lg font-semibold text-gray-400">kg</span>
              </p>
            </div>

            <div className="group relative bg-white/70 backdrop-blur-md p-5 rounded-2xl shadow-md shadow-gray-200/50 ring-1 ring-white/60 hover:shadow-xl hover:shadow-red-900/10 hover:-translate-y-1 transition-all duration-300">
              <div className="absolute top-0 left-0 h-1.5 w-full rounded-t-2xl bg-gradient-to-r from-red-500 to-rose-500" />
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-red-700">
                  Peso mínimo
                </h3>
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-100 text-red-700 text-base shrink-0">
                  📉
                </span>
              </div>
              <p className="text-3xl font-bold mt-3 text-gray-800">
                {resumen.pesoMinimo} <span className="text-lg font-semibold text-gray-400">kg</span>
              </p>
            </div>

            <div className="group relative bg-white/70 backdrop-blur-md p-5 rounded-2xl shadow-md shadow-gray-200/50 ring-1 ring-white/60 hover:shadow-xl hover:shadow-purple-900/10 hover:-translate-y-1 transition-all duration-300 col-span-2 lg:col-span-1">
              <div className="absolute top-0 left-0 h-1.5 w-full rounded-t-2xl bg-gradient-to-r from-purple-500 to-fuchsia-500" />
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-purple-700">
                  Última actualización
                </h3>
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-100 text-purple-700 text-base shrink-0">
                  🕒
                </span>
              </div>
              <p className="text-2xl font-bold mt-3 text-gray-800">
                {resumen.ultimaFecha ?? "—"}
              </p>
            </div>

          </div>
        )}

        {datos.length === 0 ? (
          <div className="bg-white/70 backdrop-blur-md rounded-3xl shadow-xl shadow-gray-200/40 ring-1 ring-white/60 flex flex-col items-center justify-center py-24 text-gray-400">
            <span className="text-4xl mb-3">📭</span>
            <p>No hay datos de pesajes para graficar todavía.</p>
          </div>
        ) : (
          <>
            {/* Tendencia general del hato — siempre 1 sola línea, sin importar cuántos animales haya */}
            <div className="bg-white/70 backdrop-blur-md p-6 md:p-9 rounded-3xl shadow-xl shadow-gray-200/40 ring-1 ring-white/60 mb-8">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-lg font-bold text-gray-800">Tendencia general del hato</h2>
                  <p className="text-sm text-gray-500">Peso promedio de todos los animales por fecha</p>
                </div>
                <span className="hidden sm:flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-emerald-700 bg-emerald-100 px-3 py-1.5 rounded-full">
                  {resumen.totalAnimales} animales
                </span>
              </div>

              <ResponsiveContainer width="100%" height={320}>
                <LineChart data={promedioPorFecha} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                  <XAxis
                    dataKey="fecha"
                    tick={{ fill: "#6b7280", fontSize: 12 }}
                    axisLine={{ stroke: "#e5e7eb" }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: "#6b7280", fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                    width={50}
                    label={{ value: "kg", angle: -90, position: "insideLeft", fill: "#9ca3af", fontSize: 12 }}
                  />
                  <Tooltip content={<CustomTooltipGeneral />} />
                  <Line
                    type="linear"
                    dataKey="promedio"
                    stroke="#16a34a"
                    strokeWidth={3}
                    dot={{ r: 5, fill: "#16a34a", strokeWidth: 2, stroke: "#fff" }}
                    activeDot={{ r: 7, strokeWidth: 2, stroke: "#fff" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Comparador: elige hasta MAX_COMPARAR animales para cruzar */}
            <div className="bg-white/70 backdrop-blur-md p-6 md:p-9 rounded-3xl shadow-xl shadow-gray-200/40 ring-1 ring-white/60 mb-8">
              <div className="mb-5">
                <h2 className="text-lg font-bold text-gray-800">Comparar animales</h2>
                <p className="text-sm text-gray-500">
                  Busca y agrega hasta {MAX_COMPARAR} animales para ver su evolución lado a lado
                </p>
              </div>

              {/* Buscador */}
              <div className="relative mb-4 max-w-md">
                <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                  🔍
                </span>
                <input
                  type="text"
                  placeholder={
                    animalesComparar.length >= MAX_COMPARAR
                      ? `Máximo ${MAX_COMPARAR} animales a la vez`
                      : "Buscar animal para comparar..."
                  }
                  value={busquedaComparar}
                  onChange={(e) => setBusquedaComparar(e.target.value)}
                  disabled={animalesComparar.length >= MAX_COMPARAR}
                  className="w-full border border-gray-200 bg-white/80 pl-11 pr-4 py-2.5 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all disabled:bg-gray-50 disabled:text-gray-400"
                />

                {sugerenciasComparar.length > 0 && (
                  <div className="absolute z-10 mt-2 w-full bg-white rounded-xl shadow-lg ring-1 ring-gray-100 overflow-hidden">
                    {sugerenciasComparar.map((nombre) => (
                      <button
                        key={nombre}
                        onClick={() => agregarComparar(nombre)}
                        className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-green-50 transition-colors"
                      >
                        🐄 {nombre}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Chips de animales elegidos */}
              {animalesComparar.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-6">
                  {animalesComparar.map((nombre, i) => (
                    <span
                      key={nombre}
                      className="inline-flex items-center gap-2 pl-3 pr-2 py-1.5 rounded-full text-sm font-medium text-white shadow-sm"
                      style={{ backgroundColor: COLORES[i % COLORES.length] }}
                    >
                      {nombre}
                      <button
                        onClick={() => quitarComparar(nombre)}
                        className="h-4 w-4 flex items-center justify-center rounded-full bg-white/25 hover:bg-white/40 transition-colors text-xs leading-none"
                        aria-label={`Quitar ${nombre}`}
                      >
                        ✕
                      </button>
                    </span>
                  ))}
                </div>
              )}

              {animalesComparar.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-gray-400 border-2 border-dashed border-gray-200 rounded-2xl">
                  <span className="text-3xl mb-2">🔍</span>
                  <p className="text-sm">Busca un animal arriba para empezar a comparar</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={datosPivot} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                    <XAxis
                      dataKey="fecha"
                      tick={{ fill: "#6b7280", fontSize: 12 }}
                      axisLine={{ stroke: "#e5e7eb" }}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fill: "#6b7280", fontSize: 12 }}
                      axisLine={false}
                      tickLine={false}
                      width={50}
                      label={{ value: "kg", angle: -90, position: "insideLeft", fill: "#9ca3af", fontSize: 12 }}
                    />
                    <Tooltip content={<CustomTooltipComparar />} />
                    <ReferenceLine
                      y={resumen.pesoPromedio}
                      stroke="#9ca3af"
                      strokeDasharray="6 4"
                      strokeWidth={1.5}
                      label={{
                        value: `Promedio: ${resumen.pesoPromedio} kg`,
                        position: "insideTopRight",
                        fill: "#6b7280",
                        fontSize: 11,
                        fontWeight: 600,
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: 13, paddingTop: 16 }} iconType="circle" />
                    {animalesComparar.map((nombre, i) => (
                      <Line
                        key={nombre}
                        type="linear"
                        dataKey={nombre}
                        name={nombre}
                        stroke={COLORES[i % COLORES.length]}
                        strokeWidth={3}
                        dot={{ r: 6, fill: COLORES[i % COLORES.length], strokeWidth: 2, stroke: "#fff" }}
                        activeDot={{ r: 8, strokeWidth: 2, stroke: "#fff" }}
                        connectNulls
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Tabla de animales: escala a 100+ con búsqueda, orden y paginación */}
            <div className="bg-white/70 backdrop-blur-md rounded-3xl shadow-xl shadow-gray-200/40 ring-1 ring-white/60 overflow-hidden">
              <div className="p-6 md:p-8 pb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h2 className="text-lg font-bold text-gray-800">Todos los animales</h2>
                  <p className="text-sm text-gray-500">
                    {filaPorAnimal.length} {filaPorAnimal.length === 1 ? "animal" : "animales"} registrados
                  </p>
                </div>

                <div className="relative w-full sm:w-64">
                  <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                    🔍
                  </span>
                  <input
                    type="text"
                    placeholder="Buscar animal..."
                    value={busquedaTabla}
                    onChange={(e) => {
                      setBusquedaTabla(e.target.value);
                      setPagina(1);
                    }}
                    className="w-full border border-gray-200 bg-white/80 pl-9 pr-3 py-2 rounded-xl text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                  />
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-gradient-to-r from-green-700 to-emerald-700 text-white">
                      <th
                        className="p-4 font-semibold text-sm uppercase tracking-wide cursor-pointer select-none hover:bg-white/10 transition-colors"
                        onClick={() => cambiarOrden("nombre")}
                      >
                        Animal {orden.campo === "nombre" && (orden.dir === "asc" ? "↑" : "↓")}
                      </th>
                      <th
                        className="p-4 font-semibold text-sm uppercase tracking-wide cursor-pointer select-none hover:bg-white/10 transition-colors"
                        onClick={() => cambiarOrden("ultimoPeso")}
                      >
                        Último peso {orden.campo === "ultimoPeso" && (orden.dir === "asc" ? "↑" : "↓")}
                      </th>
                      <th
                        className="p-4 font-semibold text-sm uppercase tracking-wide cursor-pointer select-none hover:bg-white/10 transition-colors"
                        onClick={() => cambiarOrden("tendencia")}
                      >
                        Tendencia {orden.campo === "tendencia" && (orden.dir === "asc" ? "↑" : "↓")}
                      </th>
                      <th className="p-4 font-semibold text-sm uppercase tracking-wide">Fecha</th>
                      <th className="p-4 font-semibold text-sm uppercase tracking-wide text-center">Comparar</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-gray-100">
                    {filasPagina.map((animal) => {
                      const yaElegido = animalesComparar.includes(animal.nombre);
                      return (
                        <tr key={animal.nombre} className="hover:bg-green-50/60 transition-colors">
                          <td className="p-4 font-medium text-gray-800">{animal.nombre}</td>
                          <td className="p-4 text-gray-800 font-semibold">{animal.ultimoPeso} kg</td>
                          <td className="p-4">
                            {animal.tendencia === 0 ? (
                              <span className="text-gray-400 text-sm">— sin cambio</span>
                            ) : animal.tendencia > 0 ? (
                              <span className="inline-flex items-center gap-1 text-green-700 text-sm font-semibold">
                                ↑ +{animal.tendencia.toFixed(1)} kg
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-red-600 text-sm font-semibold">
                                ↓ {animal.tendencia.toFixed(1)} kg
                              </span>
                            )}
                          </td>
                          <td className="p-4 text-gray-500 text-sm">{animal.ultimaFecha}</td>
                          <td className="p-4 text-center">
                            <button
                              onClick={() =>
                                yaElegido ? quitarComparar(animal.nombre) : agregarComparar(animal.nombre)
                              }
                              disabled={!yaElegido && animalesComparar.length >= MAX_COMPARAR}
                              className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${
                                yaElegido
                                  ? "bg-red-100 text-red-700 hover:bg-red-200"
                                  : "bg-green-100 text-green-700 hover:bg-green-200 disabled:opacity-40 disabled:cursor-not-allowed"
                              }`}
                            >
                              {yaElegido ? "Quitar" : "+ Agregar"}
                            </button>
                          </td>
                        </tr>
                      );
                    })}

                    {filasPagina.length === 0 && (
                      <tr>
                        <td colSpan={5} className="p-10 text-center text-gray-400">
                          No se encontraron animales{busquedaTabla ? ` para "${busquedaTabla}"` : ""}.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Paginación */}
              {totalPaginas > 1 && (
                <div className="flex items-center justify-between px-6 md:px-8 py-4 border-t border-gray-100">
                  <p className="text-sm text-gray-500">
                    Página {pagina} de {totalPaginas}
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setPagina((p) => Math.max(1, p - 1))}
                      disabled={pagina === 1}
                      className="px-3 py-1.5 rounded-lg text-sm font-medium border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      ← Anterior
                    </button>
                    <button
                      onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
                      disabled={pagina === totalPaginas}
                      className="px-3 py-1.5 rounded-lg text-sm font-medium border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      Siguiente →
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}

      </div>
    </main>
    </AuthGuard>
  );
}