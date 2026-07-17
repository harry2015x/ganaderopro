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
    
  return (
    <AuthGuard>
      <main className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 p-6">

        <div className="max-w-7xl mx-auto">

          <h1 className="text-4xl font-extrabold text-green-800 mb-8">
            🐂 Ficha del Animal
          </h1>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Columna izquierda */}

            <div className="bg-white rounded-3xl shadow-lg p-6">

              <div className="flex justify-center">

                <div className="w-40 h-40 rounded-full bg-green-100 flex items-center justify-center text-7xl">

                  🐂

                </div>

              </div>

              <h2 className="text-center text-2xl font-bold mt-5">

                Luna

              </h2>

              <p className="text-center text-gray-500">

                Arete 2045

              </p>

            </div>

            {/* Información */}

            <div className="lg:col-span-2 bg-white rounded-3xl shadow-lg p-8">

              <h2 className="text-2xl font-bold text-green-800 mb-6">

                Información General

              </h2>

              <div className="grid md:grid-cols-2 gap-5">

                <Card titulo="Raza" valor="Brahman" />

                <Card titulo="Sexo" valor="Hembra" />

                <Card titulo="Edad" valor="4 años" />

                <Card titulo="Peso Actual" valor="452 Kg" />

                <Card titulo="Estado" valor="Activa" />

                <Card titulo="Condición" valor="Excelente" />

              </div>

            </div>

          </div>

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