"use client";

import AuthGuard from "@/components/AuthGuard";
import { useCentroInteligente } from "@/hooks/useCentroInteligente";

export default function CentroInteligentePage() {

  const {
    acciones,
    cargando,
  } = useCentroInteligente();

  return (
    <AuthGuard>

      <main className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 p-6">

        <div className="max-w-7xl mx-auto">

          {/* Header */}

          <div className="mb-8">

            <h1 className="text-4xl font-extrabold text-green-800">

              🧠 Centro Inteligente

            </h1>

            <p className="text-gray-600 mt-2">

              Acciones recomendadas para administrar tu finca.

            </p>

          </div>

          {/* Loading */}

          {cargando && (

            <div className="bg-white rounded-3xl shadow-lg p-10 text-center">

              Cargando...

            </div>

          )}

          {/* Sin acciones */}

          {!cargando && acciones.length === 0 && (

            <div className="bg-white rounded-3xl shadow-lg p-10 text-center">

              🎉 Todo está al día.

            </div>

          )}

          {/* Lista */}

          <div className="space-y-4">

            {acciones.map((accion) => (

              <div
                key={accion.id}
                className="bg-white rounded-2xl shadow-md border p-5 hover:shadow-xl transition"
              >

                <div className="flex items-start gap-4">

                  <div className="text-4xl">

                    {accion.icono}

                  </div>

                  <div className="flex-1">

                    <h2 className="font-bold text-lg">

                      {accion.titulo}

                    </h2>

                    <p className="text-gray-600 mt-2">

                      {accion.descripcion}

                    </p>

                    <div className="mt-4">

                      <a
                        href={accion.url}
                        className="text-green-700 font-semibold"
                      >

                        {accion.accion} →

                      </a>

                    </div>

                  </div>

                </div>

              </div>

            ))}

          </div>

        </div>

      </main>

    </AuthGuard>
  );

}