"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import AuthGuard from "@/components/AuthGuard";
import { supabase } from "@/lib/supabase";
import Card from "@/components/ganado/Card";

type Animal = {
  id: number;
  arete: string;
  nombre: string;
  raza: string;
  peso: number;
  sexo: string | null;
  fecha_nacimiento: string | null;
};

export default function AnimalDetallePage() {
  const params = useParams();

  const [animal, setAnimal] = useState<Animal | null>(null);
  const [loading, setLoading] = useState(true);

  async function cargarAnimal() {
    const { data, error } = await supabase
      .from("animales")
      .select("*")
      .eq("id", params.id)
      .single();

    if (error) {
      console.error("Error al cargar el animal:", error);
    } else {
      setAnimal(data);
    }

    setLoading(false);
  }

  useEffect(() => {
    cargarAnimal();
  }, []);

  function formatearFecha(fecha: string | null) {
    if (!fecha) return "No registrada";

    const f = new Date(fecha);

    return f.toLocaleDateString("es-CO", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }

  if (loading) {
    return (
      <AuthGuard>
        <main className="min-h-screen flex items-center justify-center bg-green-50">
          <h2 className="text-2xl font-bold text-green-700">
            Cargando información...
          </h2>
        </main>
      </AuthGuard>
    );
  }

  if (!animal) {
    return (
      <AuthGuard>
        <main className="min-h-screen flex items-center justify-center bg-red-50">
          <h2 className="text-2xl font-bold text-red-600">
            No se encontró el animal.
          </h2>
        </main>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <main className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 py-8 px-4">
  
        <div className="max-w-6xl mx-auto">
  
          <Link
            href="/ganado"
            className="inline-flex items-center gap-2 text-green-700 hover:text-green-900 font-semibold mb-8"
          >
            ← Volver al inventario
          </Link>
  
          <div className="bg-white rounded-3xl shadow-xl overflow-hidden">
  
            {/* Encabezado */}
  
            <div className="bg-gradient-to-r from-green-700 to-emerald-600 text-white p-10">
  
              <div className="flex flex-col md:flex-row md:items-center gap-6">
  
                <div className="w-32 h-32 rounded-full bg-white/20 flex items-center justify-center text-6xl">
  
                  🐂
  
                </div>
  
                <div>
  
                  <h1 className="text-4xl font-extrabold">
  
                    {animal.nombre}
  
                  </h1>
  
                  <p className="text-xl mt-2">
  
                    Arete #{animal.arete}
  
                  </p>
  
                </div>
  
              </div>
  
            </div>
  
            {/* Tarjetas */}
  
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 p-8">
  
              <Card
                titulo="Peso"
                valor={`${animal.peso} kg`}
              />
  
              <Card
                titulo="Sexo"
                valor={animal.sexo ?? "Sin registro"}
              />
  
              <Card
                titulo="Raza"
                valor={animal.raza}
              />
  
              <Card
                titulo="Fecha de nacimiento"
                valor={formatearFecha(animal.fecha_nacimiento)}
              />
  
            </div>
  
            {/* Información */}
  
            <div className="px-8 pb-8">
  
              <div className="rounded-2xl border border-green-100 bg-green-50 p-6">
  
                <h2 className="text-2xl font-bold text-green-800 mb-4">
  
                  Información General
  
                </h2>
  
                <div className="grid md:grid-cols-2 gap-5">
  
                  <div>
  
                    <p className="text-gray-500 text-sm">
  
                      Nombre
  
                    </p>
  
                    <p className="font-semibold text-lg">
  
                      {animal.nombre}
  
                    </p>
  
                  </div>
  
                  <div>
  
                    <p className="text-gray-500 text-sm">
  
                      Arete
  
                    </p>
  
                    <p className="font-semibold text-lg">
  
                      {animal.arete}
  
                    </p>
  
                  </div>
  
                  <div>
  
                    <p className="text-gray-500 text-sm">
  
                      Sexo
  
                    </p>
  
                    <p className="font-semibold text-lg">
  
                      {animal.sexo ?? "Sin registro"}
  
                    </p>
  
                  </div>
  
                  <div>
  
                    <p className="text-gray-500 text-sm">
  
                      Raza
  
                    </p>
  
                    <p className="font-semibold text-lg">
  
                      {animal.raza}
  
                    </p>
  
                  </div>
  
                  <div>
  
                    <p className="text-gray-500 text-sm">
  
                      Peso
  
                    </p>
  
                    <p className="font-semibold text-lg">
  
                      {animal.peso} kg
  
                    </p>
  
                  </div>
  
                  <div>
  
                    <p className="text-gray-500 text-sm">
  
                      Fecha de nacimiento
  
                    </p>
  
                    <p className="font-semibold text-lg">
  
                      {formatearFecha(animal.fecha_nacimiento)}
  
                    </p>
  
                  </div>
  
                </div>
  
              </div>
  
            </div>
  
          </div>
  
        </div>
  
      </main>
    </AuthGuard>
  );
}

