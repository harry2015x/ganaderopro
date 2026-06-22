"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "../../lib/supabase";
import { registrarAuditoria } from "../../lib/auditoria";
import { obtenerRolUsuario } from "../../lib/auth";
import AuthGuard from "../../components/AuthGuard";

export default function UsuariosPage() {
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [cargando, setCargando] = useState(true);

  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [rolNuevo, setRolNuevo] = useState("operador");
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
    await cargarUsuarios();
    setCargando(false);
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

  async function toggleActivo(
    id: string,
    activoActual: boolean,
    rol: string
  ) {
    // Protección: los admin no se pueden desactivar
    if (rol === "admin") return;

    const { error } = await supabase
      .from("usuarios")
      .update({ activo: !activoActual })
      .eq("id", id);

      if (error) {
        alert(error.message);
        return;
      }
      
      await registrarAuditoria(
        id,
        "Administrador",
        activoActual
          ? "INACTIVAR_USUARIO"
          : "ACTIVAR_USUARIO",
        "USUARIOS",
        activoActual
          ? "Usuario desactivado"
          : "Usuario activado"
      );
      
      await cargarUsuarios();
  }

  async function cambiarRol(
    id: string,
    rolActual: string,
    nuevoRol: string
  ) {
    if (rolActual === "admin") return;
  
    const { error } = await supabase
      .from("usuarios")
      .update({
        rol: nuevoRol,
      })
      .eq("id", id);
  
      if (error) {
        alert(error.message);
        return;
      }
      
      await registrarAuditoria(
        id,
        "Administrador",
        "CAMBIO_ROL",
        "USUARIOS",
        `Rol cambiado de ${rolActual} a ${nuevoRol}`
      );
      
      await cargarUsuarios();
  }

  async function guardarUsuario() {
    if (!nombre || !email || !password) {
      alert("Todos los campos son obligatorios");
      return;
    }
    if (password.length < 6) {
      alert("La contraseña debe tener al menos 6 caracteres");
      return;
    }

    const { data, error: authError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (authError) {
      alert(authError.message);
      return;
    }

    const { error } = await supabase.from("usuarios").insert([
      {
        id: data.user?.id,
        nombre,
        email,
        rol: rolNuevo,
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
    setRolNuevo("operador");
    setMostrarFormulario(false);
    await cargarUsuarios();
  }

  const rolBadge: Record<string, string> = {
    admin:        "bg-purple-100 text-purple-800",
    operador:     "bg-blue-100 text-blue-800",
    visualizador: "bg-gray-100 text-gray-700",
  };

  if (cargando) {
    return (
      <AuthGuard>
        <main className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 flex items-center justify-center">
          <p className="text-green-700 font-semibold animate-pulse">Verificando acceso…</p>
        </main>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <main className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 p-6 md:p-10">
        <div className="max-w-6xl mx-auto">

          {/* Volver */}
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-green-700 hover:text-green-900 font-medium mb-6 transition-colors"
          >
            ← Volver al Dashboard
          </Link>

          {/* Encabezado */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
            <div>
              <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight bg-gradient-to-r from-green-800 to-emerald-600 bg-clip-text text-transparent">
                Administración de Usuarios
              </h1>
              <p className="text-gray-500 mt-1">
                {usuarios.length}{" "}
                {usuarios.length === 1 ? "usuario registrado" : "usuarios registrados"}
              </p>
            </div>

            <button
              onClick={() => setMostrarFormulario(!mostrarFormulario)}
              className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold px-5 py-3 rounded-xl shadow-md shadow-green-900/20 hover:shadow-lg hover:-translate-y-0.5 transition-all"
            >
              ➕ Nuevo Usuario
            </button>
          </div>

          {/* Formulario */}
          {mostrarFormulario && (
            <div className="bg-white/90 backdrop-blur-sm p-6 rounded-2xl shadow-lg ring-1 ring-gray-100 mb-8">
              <h2 className="text-xl font-bold text-green-700 mb-5 flex items-center gap-2">
                📝 Nuevo Usuario
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">
                    Nombre
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: Juan Pérez"
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    className="w-full border border-gray-200 p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">
                    Correo electrónico
                  </label>
                  <input
                    type="email"
                    placeholder="Ej: juan@correo.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full border border-gray-200 p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">
                    Contraseña
                  </label>
                  <input
                    type="password"
                    placeholder="Mínimo 6 caracteres"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full border border-gray-200 p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">
                    Rol
                  </label>
                  <select
                    value={rolNuevo}
                    onChange={(e) => setRolNuevo(e.target.value)}
                    className="w-full border border-gray-200 p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                  >
                    <option value="admin">Admin</option>
                    <option value="operador">Operador</option>
                    <option value="visualizador">Visualizador</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-3 mt-5">
                <button
                  onClick={guardarUsuario}
                  className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold px-6 py-3 rounded-xl shadow-md shadow-green-900/20 hover:shadow-lg transition-all"
                >
                  Guardar Usuario
                </button>
                <button
                  onClick={() => setMostrarFormulario(false)}
                  className="px-6 py-3 rounded-xl font-semibold text-gray-600 hover:bg-gray-100 transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}

          {/* Tabla */}
          <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-md ring-1 ring-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-gradient-to-r from-green-700 to-emerald-700 text-white">
                    <th className="p-4 font-semibold text-sm uppercase tracking-wide">Nombre</th>
                    <th className="p-4 font-semibold text-sm uppercase tracking-wide">Correo</th>
                    <th className="p-4 font-semibold text-sm uppercase tracking-wide">Rol</th>
                    <th className="p-4 font-semibold text-sm uppercase tracking-wide">Estado</th>
                   <th className="p-4 font-semibold text-sm uppercase tracking-wide">Acciones</th>
          </tr>
                </thead>

                <tbody className="divide-y divide-gray-100">
                  {usuarios.map((usuario) => {
                    console.log("ID Usuario:", usuario.id);
                    const esAdmin = usuario.rol === "admin";

                    return (
                      <tr
                        key={usuario.id}
                        className={`transition-colors ${
                          usuario.activo
                            ? "hover:bg-green-50/60"
                            : "bg-gray-50/60 hover:bg-gray-100/60 opacity-70"
                        }`}
                      >
                        {/* Nombre */}
                        <td className="p-4 font-medium text-gray-800">
                          {usuario.nombre}
                        </td>

                        {/* Correo */}
                        <td className="p-4 text-gray-600">{usuario.email}</td>

                        {/* Rol */}
                        <td className="p-4">
                          <span
                            className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold capitalize ${
                              rolBadge[usuario.rol] ?? "bg-gray-100 text-gray-700"
                            }`}
                          >
                            {usuario.rol}
                          </span>
                        </td>

                        {/* Estado */}
                        <td className="p-4">
                          {esAdmin ? (
                            /* Admin: solo badge, sin toggle */
                            <div className="flex items-center gap-2">
                              <span className="h-2 w-2 rounded-full bg-emerald-500" />
                              <span className="text-sm font-medium text-emerald-700">
                                Activo
                              </span>
                              <span className="ml-1 text-[10px] uppercase tracking-wide font-semibold bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">
                                Protegido
                              </span>
                            </div>
                          ) : (
                            /* Operador / Visualizador: toggle interactivo */
                            <div className="flex items-center gap-3">
                              <button
                                onClick={() =>
                                  toggleActivo(usuario.id, usuario.activo, usuario.rol)
                                }
                                aria-pressed={usuario.activo}
                                aria-label={`${
                                  usuario.activo ? "Desactivar" : "Activar"
                                } a ${usuario.nombre}`}
                                className={`
                                  relative inline-flex h-7 w-[52px] flex-shrink-0
                                  cursor-pointer rounded-full border-2 border-transparent
                                  transition-colors duration-300 ease-in-out
                                  focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2
                                  ${usuario.activo ? "bg-emerald-500" : "bg-gray-300"}
                                `}
                              >
                                <span
                                  className={`
                                    pointer-events-none inline-flex h-6 w-6 transform
                                    items-center justify-center rounded-full bg-white shadow
                                    transition duration-300 ease-in-out
                                    ${usuario.activo ? "translate-x-[26px]" : "translate-x-0"}
                                  `}
                                >
                                  <span
                                    className={`text-[10px] font-bold transition-colors ${
                                      usuario.activo ? "text-emerald-500" : "text-gray-400"
                                    }`}
                                  >
                                    {usuario.activo ? "✓" : "✕"}
                                  </span>
                                </span>
                              </button>

                              <span
                                className={`text-sm font-medium transition-colors ${
                                  usuario.activo ? "text-emerald-700" : "text-gray-400"
                                }`}
                              >
                                {usuario.activo ? "Activo" : "Inactivo"}
                              </span>
                            </div>
                          )}
                        </td>

                        {/* Acciones */}
<td className="p-4">
  {esAdmin ? (
    <span className="text-[10px] uppercase tracking-wide font-semibold bg-purple-100 text-purple-700 px-2 py-1 rounded-full">
      PROTEGIDO
    </span>
  ) : (
    <select
      value={usuario.rol}
      onChange={(e) =>
        cambiarRol(
          usuario.id,
          usuario.rol,
          e.target.value
        )
      }
      className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white"
    >
      <option value="operador">
        Operador
      </option>

      <option value="visualizador">
        Visualizador
      </option>
    </select>
  )}
</td>


                      </tr>
                    );
                  })}

                  {usuarios.length === 0 && (
                    <tr>
                      <td colSpan={5} className="p-10 text-center text-gray-400">
                        No hay usuarios registrados.
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
