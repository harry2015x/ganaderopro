"use client";

import { useState } from "react";

export default function PesajesPage() {

  const [animalId, setAnimalId] = useState("");
  const [fecha, setFecha] = useState("");
  const [peso, setPeso] = useState("");

  return (
    <main className="p-10">

      <h1 className="text-4xl font-bold text-green-700 mb-6">
        Control de Pesajes
      </h1>

      <div className="bg-white p-6 rounded-lg shadow border max-w-3xl">

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

          <select
            value={animalId}
            onChange={(e) => setAnimalId(e.target.value)}
            className="border p-3 rounded"
          >
            <option value="">
              Seleccione Animal
            </option>
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
          className="mt-4 bg-green-700 text-white px-6 py-3 rounded"
        >
          Guardar Pesaje
        </button>

      </div>

    </main>
  );
}