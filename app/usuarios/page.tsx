"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import { obtenerRolUsuario } from "../../lib/auth";
import AuthGuard from "../../components/AuthGuard";

export default function UsuariosPage() {
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);

const [nombre, setNombre] = useState("");
const [email, setEmail] = useState("");
const [rol, setRol] = useState("operador");
const [password, setPassword] = useState("");

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

  async function guardarUsuario() {
    // Crear usuario en Supabase Auth
    const { data, error: authError } =
      await supabase.auth.signUp({
        email,
        password,
      });
  
    if (authError) {
      alert(authError.message);
      return;
    }
  
    // Guardar datos adicionales
    const { error } = await supabase
      .from("usuarios")
      .insert([
        {
          id: data.user?.id,
          nombre,
          email,
          rol,
          activo: true,
        },
      ]);
  
    if (error) {
      alert(error.message);
      return;
    }
  
    alert("Usuario creado correctamente");
  
    setNombre("");
    setEmail("");
    setPassword("");
    setRol("operador");
  
    setMostrarFormulario(false);
  
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

        <div className="flex justify-between items-center mb-6">
  <h1 className="text-4xl font-bold text-green-700">
    Administración de Usuarios
  </h1>

  <button
    onClick={() => setMostrarFormulario(true)}
    className="bg-green-600 hover:bg-green-700 text-white px-5 py-2 rounded-xl font-semibold"
  >
    ➕ Nuevo Usuario
  </button>
</div>

{mostrarFormulario && (
  <div className="bg-white p-6 rounded-2xl shadow-md mb-6">

    <h2 className="text-xl font-bold text-green-700 mb-4">
      Nuevo Usuario
    </h2>

    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

      <input
        type="text"
        placeholder="Nombre"
        value={nombre}
        onChange={(e) => setNombre(e.target.value)}
        className="border p-3 rounded-xl"
      />

      <input
        type="email"
        placeholder="Correo"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="border p-3 rounded-xl"
      />

<input
  type="password"
  placeholder="Contraseña"
  value={password}
  onChange={(e) => setPassword(e.target.value)}
  className="border p-3 rounded-xl"
/>

      <select
        value={rol}
        onChange={(e) => setRol(e.target.value)}
        className="border p-3 rounded-xl"
      >
        <option value="admin">Admin</option>
        <option value="operador">Operador</option>
      </select>

    </div>

    <div className="flex gap-3 mt-4">

      <button
        onClick={guardarUsuario}
        className="bg-green-600 hover:bg-green-700 text-white px-5 py-2 rounded-xl"
      >
        Guardar
      </button>

      <button
        onClick={() => setMostrarFormulario(false)}
        className="bg-gray-300 hover:bg-gray-400 px-5 py-2 rounded-xl"
      >
        Cancelar
      </button>

    </div>

  </div>
)}

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