"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import { obtenerRolUsuario } from "../../lib/auth";
import AuthGuard from "../../components/AuthGuard";

export default function UsuariosPage() {
  const [usuarios, setUsuarios] = useState<any[]>([]);
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
  
    cargarUsuarios();
  }

  async function cargarUsuarios() {
    const { data, error } = await supabase
      .from("usuarios")
      .select("*")
      .order("nombre");

    if (error) {
      console.log(error);
      return;
    }

    setUsuarios(data || []);
  }

  return (
    <AuthGuard>
      <main className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 p-6 md:p-10">
        <div className="max-w-6xl mx-auto">

          <h1 className="text-4xl font-bold text-green-700 mb-6">
            Administración de Usuarios
          </h1>

          <div className="bg-white rounded-2xl shadow-md overflow-hidden">

            <table className="w-full">
              <thead>
                <tr className="bg-green-700 text-white">
                  <th className="p-4 text-left">Nombre</th>
                  <th className="p-4 text-left">Correo</th>
                  <th className="p-4 text-left">Rol</th>
                  <th className="p-4 text-left">Estado</th>
                </tr>
              </thead>

              <tbody>
                {usuarios.map((usuario) => (
                  <tr
                    key={usuario.id}
                    className="border-b hover:bg-green-50"
                  >
                    <td className="p-4">{usuario.nombre}</td>
                    <td className="p-4">{usuario.email}</td>
                    <td className="p-4">{usuario.rol}</td>
                    <td className="p-4">
                      {usuario.activo ? "🟢 Activo" : "🔴 Inactivo"}
                    </td>
                  </tr>
                ))}
              </tbody>

            </table>

          </div>

        </div>
      </main>
    </AuthGuard>
  );
}