"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "../../lib/supabase";
import { obtenerRolUsuario } from "../../lib/auth";
import AuthGuard from "../../components/AuthGuard";

export default function AuditoriaPage() {
  const [registros, setRegistros] = useState<any[]>([]);
  const [cargando, setCargando] = useState(true);

  const router = useRouter();

  useEffect(() => {
    verificarAcceso();
  }, []);

  async function verificarAcceso() {
    const rol = await obtenerRolUsuario();

    if (rol !== "admin") {
      router.push("/");
      return;
    }

    await cargarAuditoria();
    setCargando(false);
  }

  async function cargarAuditoria() {
    const { data, error } = await supabase
      .from("auditoria")
      .select("*")
      .order("fecha", { ascending: false });

    if (error) {
      console.error(error);
      return;
    }

    setRegistros(data || []);
  }

  if (cargando) {
    return (
      <AuthGuard>
        <main className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 flex items-center justify-center">
          <p className="text-green-700 font-semibold animate-pulse">
            Cargando auditoría...
          </p>
        </main>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <main className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 p-6 md:p-10">
        <div className="max-w-7xl mx-auto">

          <Link
            href="/"
            className="inline-flex items-center gap-2 text-green-700 hover:text-green-900 font-medium mb-6 transition-colors"
          >
            ← Volver al Dashboard
          </Link>

          <div className="mb-8">
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight bg-gradient-to-r from-green-800 to-emerald-600 bg-clip-text text-transparent">
              Auditoría del Sistema
            </h1>

            <p className="text-gray-500 mt-1">
              Historial completo de actividades realizadas en GanaderoPro
            </p>
          </div>

          <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-md ring-1 ring-gray-100 overflow-hidden">
            <div className="overflow-x-auto">

              <table className="w-full text-left">

                <thead>
                  <tr className="bg-gradient-to-r from-green-700 to-emerald-700 text-white">
                    <th className="p-4 font-semibold text-sm uppercase tracking-wide">
                      Fecha
                    </th>

                    <th className="p-4 font-semibold text-sm uppercase tracking-wide">
                      Usuario
                    </th>

                    <th className="p-4 font-semibold text-sm uppercase tracking-wide">
                      Acción
                    </th>

                    <th className="p-4 font-semibold text-sm uppercase tracking-wide">
                      Módulo
                    </th>

                    <th className="p-4 font-semibold text-sm uppercase tracking-wide">
                      Descripción
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-100">

                  {registros.map((registro) => (
                    <tr
                      key={registro.id}
                      className="hover:bg-green-50 transition-colors"
                    >
                      <td className="p-4 text-sm text-gray-600">
                        {new Date(registro.fecha).toLocaleString()}
                      </td>

                      <td className="p-4 font-medium text-gray-800">
                        {registro.usuario_nombre}
                      </td>

                      <td className="p-4">
                        <span className="inline-flex px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">
                          {registro.accion}
                        </span>
                      </td>

                      <td className="p-4">
                        <span className="inline-flex px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700">
                          {registro.modulo}
                        </span>
                      </td>

                      <td className="p-4 text-gray-700">
                        {registro.descripcion}
                      </td>
                    </tr>
                  ))}

                  {registros.length === 0 && (
                    <tr>
                      <td
                        colSpan={5}
                        className="p-10 text-center text-gray-400"
                      >
                        No hay registros de auditoría.
                      </td>
                    </tr>
                  )}

                </tbody>

              </table>

            </div>
          </div>

        </div>
      </main>
    </AuthGuard>
  );
}