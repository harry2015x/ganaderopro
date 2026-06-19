"use client";

import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";

export default function PesajesPage() {
  const [animalId, setAnimalId] = useState("");
  const [fecha, setFecha] = useState("");
  const [peso, setPeso] = useState("");

  const [animales, setAnimales] = useState<any[]>([]);
  const [pesajes, setPesajes] = useState<any[]>([]);

  console.log("ESTADO ANIMALES:", animales);

  useEffect(() => {
    cargarAnimales();
    cargarPesajes();
  }, []);

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
    if (!animalId || !fecha || !peso) {
      alert("Debe completar todos los campos");
      return;
    }

    const { error } = await supabase
      .from("Pesaje")
      .insert([
        {
          animal_id: Number(animalId),
          fecha,
          peso: Number(peso),
        },
      ]);

    if (error) {
      alert(error.message);
      return;
    }

    await cargarPesajes();

    alert("Pesaje guardado correctamente");

    setAnimalId("");
    setFecha("");
    setPeso("");
  }

  return (
    <main className="p-10">
      <h1 className="text-4xl font-bold text-green-700 mb-6">
        Control de Pesajes
      </h1>

      <div className="bg-white p-6 rounded-lg shadow border max-w-5xl">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <select
            value={animalId}
            onChange={(e) => setAnimalId(e.target.value)}
            className="border p-3 rounded"
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

          <input
            type="date"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            className="border p-3 rounded"
          />

          <input
            type="number"
            placeholder="Peso Kg"
            value={peso}
            onChange={(e) => setPeso(e.target.value)}
            className="border p-3 rounded"
          />
        </div>

        <button
          onClick={guardarPesaje}
          className="mt-4 bg-green-700 text-white px-6 py-3 rounded"
        >
          Guardar Pesaje
        </button>
      </div>

      <div className="mt-8">
        <h2 className="text-2xl font-bold text-green-700 mb-4">
          Historial de Pesajes
        </h2>

        <table className="w-full border border-gray-300">
          <thead>
            <tr className="bg-green-700 text-white">
            <th className="border p-3">Animal</th>
              <th className="border p-3">Fecha</th>
              <th className="border p-3">Peso</th>
            </tr>
          </thead>

          <tbody>
            {pesajes.map((pesaje) => (
              <tr key={pesaje.id}>
               <td className="border p-3">
  {pesaje.animales?.arete} - {pesaje.animales?.nombre}
</td>

                <td className="border p-3">
                  {pesaje.fecha}
                </td>

                <td className="border p-3">
                  {pesaje.peso} kg
                </td>
              </tr>
            ))}

            {pesajes.length === 0 && (
              <tr>
                <td
                  colSpan={3}
                  className="border p-3 text-center"
                >
                  No hay pesajes registrados
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}