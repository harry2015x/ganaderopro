"use client";

import AuthGuard from "../../components/AuthGuard";

export default function UsuariosPage() {
  return (
    <AuthGuard>
      <main className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 p-6 md:p-10">
        <div className="max-w-6xl mx-auto">

          <h1 className="text-4xl font-bold text-green-700 mb-4">
            Administración de Usuarios
          </h1>

          <p className="text-gray-600">
            Gestión de usuarios del sistema GanaderoPro.
          </p>

        </div>
      </main>
    </AuthGuard>
  );
}