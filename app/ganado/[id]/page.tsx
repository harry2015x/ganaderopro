"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import AuthGuard from "@/components/AuthGuard";
import { supabase } from "@/lib/supabase";

import { Animal } from "@/components/ganado/types";
import AnimalHeader from "@/components/ganado/AnimalHeader";
import AnimalStats from "@/components/ganado/AnimalStats";
import AnimalInfo from "@/components/ganado/AnimalInfo";

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

            <AnimalHeader animal={animal} />

            <AnimalStats animal={animal} />

            <AnimalInfo animal={animal} />

          </div>

        </div>

      </main>
    </AuthGuard>
  );
}