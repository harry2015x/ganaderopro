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
        <div className="bg-white/95 backdrop-blur-sm px-4 py-3 rounded-xl shadow-lg ring-1 ring-gray-100 min-w-[160px]">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">
            {label}
          </p>
          <div className="space-y-1">
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
      <div className="max-w-6xl mx-auto">

        <Link
          href="/"
          className="inline-flex items-center gap-2 text-green-700 hover:text-green-900 font-medium mb-6 transition-colors"
        >
          ← Volver al Dashboard
        </Link>

        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight bg-gradient-to-r from-green-800 to-emerald-600 bg-clip-text text-transparent flex items-center gap-3">
            📈 Evolución de Peso
          </h1>
          <p className="text-gray-500 mt-1">
            Tendencia de peso por animal a lo largo del tiempo
          </p>
        </div>

        <div className="bg-white/90 backdrop-blur-sm p-6 md:p-8 rounded-2xl shadow-lg ring-1 ring-gray-100">

          {datos.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-gray-400">
              <span className="text-4xl mb-3">📭</span>
              <p>No hay datos de pesajes para graficar todavía.</p>
            </div>
          ) : (
            <>
              {/* Selector de animales */}
              {nombresAnimales.length > 1 && (
                <div className="flex flex-wrap gap-2 mb-6">
                  {nombresAnimales.map((nombre, i) => {
                    const oculto = animalesOcultos.includes(nombre);
                    const color = COLORES[i % COLORES.length];
                    return (
                      <button
                        key={nombre}
                        onClick={() => toggleAnimal(nombre)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${
                          oculto
                            ? "border-gray-200 text-gray-400 bg-gray-50"
                            : "border-transparent text-white shadow-sm"
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

                  {nombresAnimales.length > 1 && (
                    <Legend
                      wrapperStyle={{ fontSize: 13, paddingTop: 16 }}
                      iconType="circle"
                    />
                  )}

                  {nombresAnimales.map((nombre, i) =>
                    animalesOcultos.includes(nombre) ? null : (
                      <Line
                        key={nombre}
                        type="monotone"
                        dataKey={nombre}
                        name={nombre}
                        stroke={COLORES[i % COLORES.length]}
                        strokeWidth={3}
                        dot={{
                          r: 4,
                          fill: COLORES[i % COLORES.length],
                          strokeWidth: 2,
                          stroke: "#fff",
                        }}
                        activeDot={{ r: 7, strokeWidth: 2, stroke: "#fff" }}
                        connectNulls
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