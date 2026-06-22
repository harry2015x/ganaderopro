"use client";

import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import { obtenerRolUsuario } from "../../lib/auth";
import AuthGuard from "../../components/AuthGuard";
import Link from "next/link";

export default function PesajesPage() {
  const [animalId, setAnimalId] = useState("");
  const [fecha, setFecha] = useState("");
  const [peso, setPeso] = useState("");
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [rol, setRol] = useState<string | null>(null);



  const [animales, setAnimales] = useState<any[]>([]);
  const [pesajes, setPesajes] = useState<any[]>([]);

  const totalPesajes = pesajes.length;

const pesoPromedio =
  pesajes.length > 0
    ? (
        pesajes.reduce(
          (sum, p) => sum + Number(p.peso),
          0
        ) / pesajes.length
      ).toFixed(1)
    : 0;

const pesoMaximo =
  pesajes.length > 0
    ? Math.max(
        ...pesajes.map((p) => Number(p.peso))
      )
    : 0;

const pesoMinimo =
  pesajes.length > 0
    ? Math.min(
        ...pesajes.map((p) => Number(p.peso))
      )
    : 0;

  console.log("ESTADO ANIMALES:", animales);

  useEffect(() => {
    cargarAnimales();
    cargarPesajes();
    cargarRol();
  }, []);
  
  async function cargarRol() {
    const rolUsuario = await obtenerRolUsuario();
    setRol(rolUsuario);
  }

  function editarPesaje(pesaje: any) {
    setEditandoId(pesaje.id);
    setAnimalId(String(pesaje.animal_id));
    setFecha(pesaje.fecha);
    setPeso(String(pesaje.peso));
  }

  async function eliminarPesaje(id: number) {

    if (rol !== "admin") {
      alert("Solo el administrador puede eliminar pesajes");
      return;
    }

    const confirmar = confirm(
      "¿Desea eliminar este pesaje?"
    );
  
    if (!confirmar) return;
  
    const { error } = await supabase
      .from("Pesaje")
      .delete()
      .eq("id", id);
  
    if (error) {
      alert(error.message);
      return;
    }
  
    await cargarPesajes();
  
    alert("Pesaje eliminado");
  }

  async function cargarAnimales() {
    const { data, error } = await supabase
      .from("animales")
      .select("*")
      .order("nombre");

    console.log("ANIMALES:", data);
    console.log("ERROR ANIMALES:", error);

    if (error) {
      console.log(error);
      return;
    }

    setAnimales(data || []);
  }

  async function cargarPesajes() {
    const { data, error } = await supabase
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
      `)
      .order("fecha", { ascending: false });
  
    console.log(data);
    console.log(error);
  
    if (error) {
      console.log(error);
      return;
    }
  
    setPesajes(data || []);
  }

  async function guardarPesaje() {
    if (editandoId && rol !== "admin") {
      alert("Solo el administrador puede editar pesajes");
      return;
    }
    if (!animalId || !fecha || !peso) {
      alert("Debe completar todos los campos");
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
    }
  
    if (error) {
      alert(error.message);
      return;
    }
  
    await cargarPesajes();
  
    alert(
      editandoId
        ? "Pesaje actualizado"
        : "Pesaje guardado correctamente"
    );
  
    setAnimalId("");
    setFecha("");
    setPeso("");
    setEditandoId(null);
  }

  return (
    <AuthGuard>
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
            ⚖️ Control de Pesajes
          </h1>
          <p className="text-gray-500 mt-1">
            Registra y monitorea el peso de tus animales
          </p>
        </div>

      {/* Formulario */}
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
                <option value="">
                  Seleccione Animal
                </option>

                {animales.map((animal) => (
                  <option
                    key={animal.id}
                    value={animal.id}
                  >
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

        {/* Tarjetas de estadísticas */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-8">

          <div className="group relative bg-white/80 backdrop-blur-sm p-6 rounded-2xl shadow-md shadow-gray-200/50 ring-1 ring-gray-100 hover:shadow-xl hover:shadow-green-900/10 hover:-translate-y-1 transition-all duration-300">
            <div className="absolute top-0 left-0 h-1.5 w-full rounded-t-2xl bg-gradient-to-r from-green-500 to-emerald-500" />
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-green-700">
                Total Pesajes
              </h3>
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-100 text-green-700 text-lg">
                📋
              </span>
            </div>
            <p className="text-4xl font-bold mt-3 text-gray-800">
              {totalPesajes}
            </p>
          </div>

          <div className="group relative bg-white/80 backdrop-blur-sm p-6 rounded-2xl shadow-md shadow-gray-200/50 ring-1 ring-gray-100 hover:shadow-xl hover:shadow-blue-900/10 hover:-translate-y-1 transition-all duration-300">
            <div className="absolute top-0 left-0 h-1.5 w-full rounded-t-2xl bg-gradient-to-r from-blue-500 to-cyan-500" />
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-blue-700">
                Peso Promedio
              </h3>
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-700 text-lg">
                📊
              </span>
            </div>
            <p className="text-4xl font-bold mt-3 text-gray-800">
              {pesoPromedio} <span className="text-xl font-semibold text-gray-400">kg</span>
            </p>
          </div>

          <div className="group relative bg-white/80 backdrop-blur-sm p-6 rounded-2xl shadow-md shadow-gray-200/50 ring-1 ring-gray-100 hover:shadow-xl hover:shadow-orange-900/10 hover:-translate-y-1 transition-all duration-300">
            <div className="absolute top-0 left-0 h-1.5 w-full rounded-t-2xl bg-gradient-to-r from-orange-500 to-amber-500" />
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-orange-700">
                Peso Máximo
              </h3>
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-100 text-orange-700 text-lg">
                📈
              </span>
            </div>
            <p className="text-4xl font-bold mt-3 text-gray-800">
              {pesoMaximo} <span className="text-xl font-semibold text-gray-400">kg</span>
            </p>
          </div>

          <div className="group relative bg-white/80 backdrop-blur-sm p-6 rounded-2xl shadow-md shadow-gray-200/50 ring-1 ring-gray-100 hover:shadow-xl hover:shadow-red-900/10 hover:-translate-y-1 transition-all duration-300">
            <div className="absolute top-0 left-0 h-1.5 w-full rounded-t-2xl bg-gradient-to-r from-red-500 to-rose-500" />
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-red-700">
                Peso Mínimo
              </h3>
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-100 text-red-700 text-lg">
                📉
              </span>
            </div>
            <p className="text-4xl font-bold mt-3 text-gray-800">
              {pesoMinimo} <span className="text-xl font-semibold text-gray-400">kg</span>
            </p>
          </div>

        </div>

        {/* Historial */}
        <div className="mt-10">
          <h2 className="text-2xl font-bold text-green-700 mb-4 flex items-center gap-2">
            📚 Historial de Pesajes
          </h2>

          <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-md ring-1 ring-gray-100 overflow-hidden">
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

                      <td className="p-4 text-gray-600">
                        📅 {pesaje.fecha}
                      </td>

                      <td className="p-4 text-gray-800 font-semibold">
                        {pesaje.peso} kg
                      </td>

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
                      <td
                        colSpan={4}
                        className="p-10 text-center text-gray-400"
                      >
                        ⚖️ No hay pesajes registrados
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

      </div>
    </main>
    </AuthGuard>
  );
}