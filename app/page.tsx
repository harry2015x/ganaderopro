"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";
import AuthGuard from "../components/AuthGuard";

export default function Home() {

  const router = useRouter();
const [cargando, setCargando] = useState(true);
  const [totalAnimales, setTotalAnimales] = useState(0);
  const [totalPesajes, setTotalPesajes] = useState(0);
  const [ultimoPeso, setUltimoPeso] = useState(0);
  const [pesoPromedio, setPesoPromedio] = useState(0);
  
  useEffect(() => {
    verificarSesion();
  }, []);
  
  async function verificarSesion() {
  
    const {
      data: { session },
    } = await supabase.auth.getSession();
  
    if (!session) {
      router.push("/login");
      return;
    }
  
    cargarDashboard();
    setCargando(false);
  }

  async function cargarDashboard() {

    const { count: animalesCount } = await supabase
      .from("animales")
      .select("*", { count: "exact", head: true });

      const { data: todosPesajes } = await supabase
      .from("Pesaje")
      .select("peso");
    
    const { data: ultimoRegistro } = await supabase
      .from("Pesaje")
      .select("peso")
      .order("id", { ascending: false })
      .limit(1)
      .single();

    const { count: pesajesCount } = await supabase
      .from("Pesaje")
      .select("*", { count: "exact", head: true });

    setTotalAnimales(animalesCount || 0);
    setTotalPesajes(pesajesCount || 0);
    setUltimoPeso(ultimoRegistro?.peso || 0);

    if (todosPesajes && todosPesajes.length > 0) {
      const suma = todosPesajes.reduce(
        (acc, item) => acc + item.peso,
        0
      );
    
      setPesoPromedio(
        Number((suma / todosPesajes.length).toFixed(1))
      );
    }
  }

  if (cargando) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <h1 className="text-2xl font-bold text-green-700">
          Cargando...
        </h1>
      </div>
    );
  }

  return (
    <AuthGuard>
    <main className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 p-6 md:p-10">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="flex items-center gap-4 mb-2">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-green-600 to-emerald-700 shadow-lg shadow-green-900/20 text-3xl">
            🐄
          </div>
          <div>
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-green-800 to-emerald-600 bg-clip-text text-transparent">
              GanaderoPro1
            </h1>
          </div>
        </div>

        <p className="mt-3 text-lg text-gray-600 max-w-2xl">
          Sistema de gestión ganadera para la Orinoquía
        </p>

        {/* Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-10">

          {/* Inventario */}
          <div className="group relative bg-white/80 backdrop-blur-sm p-6 rounded-2xl shadow-md shadow-gray-200/50 ring-1 ring-gray-100 hover:shadow-xl hover:shadow-green-900/10 hover:-translate-y-1 transition-all duration-300">
            <div className="absolute top-0 left-0 h-1.5 w-full rounded-t-2xl bg-gradient-to-r from-green-500 to-emerald-500" />
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-green-700">
                Inventario
              </h2>
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-100 text-green-700 text-lg">
                🐂
              </span>
            </div>

            <p className="mt-3 text-sm text-gray-500">
              Total animales registrados
            </p>

            <p className="text-4xl font-bold mt-3 text-gray-800">
              {totalAnimales}
            </p>
          </div>

          {/* Promedio */}
          <div className="group relative bg-white/80 backdrop-blur-sm p-6 rounded-2xl shadow-md shadow-gray-200/50 ring-1 ring-gray-100 hover:shadow-xl hover:shadow-purple-900/10 hover:-translate-y-1 transition-all duration-300">
            <div className="absolute top-0 left-0 h-1.5 w-full rounded-t-2xl bg-gradient-to-r from-purple-500 to-fuchsia-500" />
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-purple-700">
                Promedio
              </h2>
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-100 text-purple-700 text-lg">
                ⚖️
              </span>
            </div>

            <p className="mt-3 text-sm text-gray-500">
              Peso promedio
            </p>

            <p className="text-4xl font-bold mt-3 text-gray-800">
              {pesoPromedio} <span className="text-xl font-semibold text-gray-400">kg</span>
            </p>
          </div>

          {/* Último Peso */}
          <div className="group relative bg-white/80 backdrop-blur-sm p-6 rounded-2xl shadow-md shadow-gray-200/50 ring-1 ring-gray-100 hover:shadow-xl hover:shadow-blue-900/10 hover:-translate-y-1 transition-all duration-300">
            <div className="absolute top-0 left-0 h-1.5 w-full rounded-t-2xl bg-gradient-to-r from-blue-500 to-cyan-500" />
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-blue-700">
                Último Peso
              </h2>
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-700 text-lg">
                📊
              </span>
            </div>

            <p className="mt-3 text-sm text-gray-500">
              Último registro
            </p>

            <p className="text-4xl font-bold mt-3 text-gray-800">
              {ultimoPeso} <span className="text-xl font-semibold text-gray-400">kg</span>
            </p>
          </div>

          {/* Pesajes */}
          <div className="group relative bg-white/80 backdrop-blur-sm p-6 rounded-2xl shadow-md shadow-gray-200/50 ring-1 ring-gray-100 hover:shadow-xl hover:shadow-orange-900/10 hover:-translate-y-1 transition-all duration-300">
            <div className="absolute top-0 left-0 h-1.5 w-full rounded-t-2xl bg-gradient-to-r from-orange-500 to-amber-500" />
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-orange-700">
                Pesajes
              </h2>
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-100 text-orange-700 text-lg">
                📋
              </span>
            </div>

            <p className="mt-3 text-sm text-gray-500">
              Total registrados
            </p>

            <p className="text-4xl font-bold mt-3 text-gray-800">
              {totalPesajes}
            </p>
          </div>

        </div>
      </div>
      </main>
  </AuthGuard>
);

}