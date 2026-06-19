"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";
import Link from "next/link";

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

// Paleta para diferenciar animales en la gráfica (solo presentación)
const COLORES = [
  "#16a34a", // verde
  "#2563eb", // azul
  "#ea580c", // naranja
  "#9333ea", // morado
  "#dc2626", // rojo
  "#0891b2", // cian
  "#ca8a04", // amarillo oscuro
  "#db2777", // rosado
];

const LIMITE_LEYENDA = 12; // por encima de esto, el selector basta y la leyenda nativa estorba

export default function GraficasPage() {

  const [datos, setDatos] = useState<any[]>([]);
  const [animalesOcultos, setAnimalesOcultos] = useState<string[]>([]);

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

  // Pivoteo de los datos: una fila por fecha, una columna por animal.
  // No cambia el origen de los datos, solo la forma en que se grafican.
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

  function toggleAnimal(nombre: string) {
    setAnimalesOcultos((prev) =>
      prev.includes(nombre)
        ? prev.filter((n) => n !== nombre)
        : [...prev, nombre]
    );
  }

  function CustomTooltip({ active, payload, label }: any) {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white/95 backdrop-blur-md px-4 py-3 rounded-2xl shadow-xl ring-1 ring-gray-100 min-w-[180px]">
          <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 mb-2 pb-2 border-b border-gray-100">
            📅 {label}
          </p>
          <div className="space-y-1.5">
            {payload.map((entry: any) => (
              <div
                key={entry.dataKey}
                className="flex items-center justify-between gap-4 text-sm"
              >
                <span className="flex items-center gap-1.5 text-gray-600">
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: entry.color }}
                  />
                  {entry.dataKey}
                </span>
                <span className="font-semibold text-gray-800">
                  {entry.value} kg
                </span>
              </div>
            ))}
          </div>
        </div>
      );
    }
    return null;
  }

  return (
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
            Tendencia de peso por animal a lo largo del tiempo
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

        {/* Card principal de la gráfica */}
        <div className="bg-white/70 backdrop-blur-md p-6 md:p-9 rounded-3xl shadow-xl shadow-gray-200/40 ring-1 ring-white/60">

          {datos.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-gray-400">
              <span className="text-4xl mb-3">📭</span>
              <p>No hay datos de pesajes para graficar todavía.</p>
            </div>
          ) : (
            <>
              {/* Selector de animales — con scroll para escalar a muchos animales */}
              {nombresAnimales.length > 1 && (
                <div className="flex flex-wrap gap-2 mb-8 max-h-32 overflow-y-auto pr-1">
                  {nombresAnimales.map((nombre, i) => {
                    const oculto = animalesOcultos.includes(nombre);
                    const color = COLORES[i % COLORES.length];
                    return (
                      <button
                        key={nombre}
                        onClick={() => toggleAnimal(nombre)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border transition-all duration-200 ${
                          oculto
                            ? "border-gray-200 text-gray-400 bg-gray-50 hover:bg-gray-100"
                            : "border-transparent text-white shadow-sm hover:shadow-md hover:-translate-y-0.5"
                        }`}
                        style={
                          oculto
                            ? undefined
                            : { backgroundColor: color }
                        }
                      >
                        <span
                          className="h-2 w-2 rounded-full"
                          style={{
                            backgroundColor: oculto ? "#d1d5db" : "#fff",
                          }}
                        />
                        {nombre}
                      </button>
                    );
                  })}
                </div>
              )}

              <ResponsiveContainer width="100%" height={500}>
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
                    label={{
                      value: "kg",
                      angle: -90,
                      position: "insideLeft",
                      fill: "#9ca3af",
                      fontSize: 12,
                    }}
                  />

                  <Tooltip content={<CustomTooltip />} />

                  {/* Línea de referencia: peso promedio general */}
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

                  {nombresAnimales.length > 1 &&
                    nombresAnimales.length <= LIMITE_LEYENDA && (
                      <Legend
                        wrapperStyle={{ fontSize: 13, paddingTop: 20 }}
                        iconType="circle"
                      />
                    )}

                  {nombresAnimales.map((nombre, i) =>
                    animalesOcultos.includes(nombre) ? null : (
                      <Line
                        key={nombre}
                        type="linear"
                        dataKey={nombre}
                        name={nombre}
                        stroke={COLORES[i % COLORES.length]}
                        strokeWidth={3}
                        dot={{
                          r: 6,
                          fill: COLORES[i % COLORES.length],
                          strokeWidth: 2,
                          stroke: "#fff",
                        }}
                        activeDot={{ r: 8, strokeWidth: 2, stroke: "#fff" }}
                        connectNulls
                        isAnimationActive={nombresAnimales.length <= 30}
                      />
                    )
                  )}

                </LineChart>
              </ResponsiveContainer>
            </>
          )}

        </div>

      </div>
    </main>
  );
}