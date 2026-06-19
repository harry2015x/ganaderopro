"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export default function Home() {

  const [totalAnimales, setTotalAnimales] = useState(0);
  const [totalPesajes, setTotalPesajes] = useState(0);
  const [ultimoPeso, setUltimoPeso] = useState(0);
  const [pesoPromedio, setPesoPromedio] = useState(0);
  
  useEffect(() => {
    cargarDashboard();
  }, []);

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

  return (
    <main className="min-h-screen bg-green-50 p-10">
      <h1 className="text-5xl font-bold text-green-800">
        🐄 GanaderoPro1
      </h1>

      <p className="mt-4 text-xl text-gray-700">
        Sistema de gestión ganadera para la Orinoquía
      </p>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-10">

        <div className="bg-white p-6 rounded-xl shadow">
          <h2 className="text-2xl font-bold text-green-700">
            Inventario
          </h2>

          <p className="mt-2">
            Total animales registrados
          </p>

          <p className="text-4xl font-bold mt-4">
  {totalAnimales}
</p>
        </div>

        <div className="bg-white p-6 rounded-xl shadow">
  <h2 className="text-2xl font-bold text-purple-700">
    Promedio
  </h2>

  <p className="mt-2">
    Peso promedio
  </p>

  <p className="text-4xl font-bold mt-4">
    {pesoPromedio} kg
  </p>
</div>

        <div className="bg-white p-6 rounded-xl shadow">
          <h2 className="text-2xl font-bold text-blue-700">
          Último Peso

          </h2>

          <p className="mt-2">
          Último registro
          </p>

          <p className="text-4xl font-bold mt-4">
          {ultimoPeso} kg
          </p>
        </div>

        <div className="bg-white p-6 rounded-xl shadow">
          <h2 className="text-2xl font-bold text-orange-600">
            Pesajes
          </h2>

          <p className="mt-2">
          Total registrados
          </p>

          <p className="text-4xl font-bold mt-4">
  {totalPesajes}
</p>
 </div>

      </div>
    </main>
  );
}