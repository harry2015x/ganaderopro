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

      {/* Aquí construiremos toda la ficha en la Parte 2 */}

    </AuthGuard>
  );
}