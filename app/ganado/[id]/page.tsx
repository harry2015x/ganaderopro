"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import AuthGuard from "@/components/AuthGuard";
import { supabase } from "@/lib/supabase";

type Animal = {
    id: number;
    arete: string;
    nombre: string;
    raza: string;
    peso: number;
    sexo?: string;
    fecha_nacimiento?: string;
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
    console.error(error);
  } else {
    console.log(data);
    setAnimal(data);
  }

  setLoading(false);
}

useEffect(() => {
    cargarAnimal();
  }, []);

  if (loading) {
    return (
      <AuthGuard>
        <main className="min-h-screen flex items-center justify-center">
          <h2 className="text-2xl font-semibold text-green-700">
            Cargando información del animal...
          </h2>
        </main>
      </AuthGuard>
    );
  }
  return (
    <AuthGuard>
      <main className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 p-6">
  
        <div className="max-w-7xl mx-auto">
  
          <h1 className="text-4xl font-extrabold text-green-800 mb-8">
            🐂 Ficha del Animal
          </h1>
  
          {/* TODO el resto de tu diseño */}
  
        </div>
  
      </main>
    </AuthGuard>
  );
}

function Card({
  titulo,
  valor,
}: {
  titulo: string;
  valor: string;
}) {
  return (
    <div className="rounded-2xl border bg-green-50 p-5">

      <p className="text-sm text-gray-500">

        {titulo}

      </p>

      <p className="text-xl font-bold text-green-800 mt-2">

        {valor}

      </p>

    </div>
  );
}