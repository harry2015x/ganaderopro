"use client";

import { Bell } from "lucide-react";
import { useState } from "react";
import Link from "next/link";
import { useNotificaciones } from "@/hooks/useNotificaciones";

export default function NotificationBell() {
  const [open, setOpen] = useState(false);

  const {
    notificaciones,
    cantidadNoLeidas,
    cargando,
  } = useNotificaciones();

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative h-11 w-11 rounded-full bg-green-50 hover:bg-green-100 flex items-center justify-center"
      >
        <Bell className="h-5 w-5 text-green-700" />

        {cantidadNoLeidas > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
            {cantidadNoLeidas}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-96 bg-white rounded-2xl shadow-2xl border z-50">
          <div className="p-4 border-b">
            <h2 className="font-bold text-lg">
              Notificaciones
            </h2>
          </div>

          <div className="p-4 space-y-3">

  {cargando && (
    <p className="text-center text-gray-500">
      Cargando...
    </p>
  )}

  {!cargando && notificaciones.length === 0 && (
    <p className="text-center text-gray-500">
      No hay notificaciones.
    </p>
  )}

  {notificaciones.map((n) => (

    <Link
      key={n.id}
      href={n.url || "#"}
      onClick={() => setOpen(false)}
      className="block border rounded-xl p-3 hover:bg-green-50 transition"
    >

      <div className="flex items-start gap-3">

        <div className="text-2xl">

          {n.icono}

        </div>

        <div className="flex-1">

          <p className="font-semibold">

            {n.animalNombre}

          </p>

          <p className="text-xs text-gray-500">

            Arete {n.animalArete}

          </p>

          <p className="text-sm text-gray-600 mt-1">

            {n.descripcion}

          </p>

          {n.accion && (

            <span className="inline-block mt-2 text-sm font-semibold text-green-700">

              {n.accion} →

            </span>

          )}

        </div>

      </div>

    </Link>

  ))}

</div>

          <div className="p-4 border-t">
            <Link
              href="/notifications"
              className="text-green-700 font-semibold"
            >
              Ver todas →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}