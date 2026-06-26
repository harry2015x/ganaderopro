"use client";

import { Bell } from "lucide-react";
import { useState } from "react";
import Link from "next/link";
import { useNotificaciones } from "@/hooks/useNotificaciones";
import NotificationCard from "./NotificationCard";

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
          <div className="p-5 border-b bg-gradient-to-r from-green-50 to-emerald-50 rounded-t-2xl">

<div className="flex items-center justify-between">

  <div className="flex items-center gap-3">

    <div className="w-11 h-11 rounded-xl bg-green-600 flex items-center justify-center text-white text-xl shadow-md">

      🔔

    </div>

    <div>

      <h2 className="font-bold text-lg text-gray-800">

        Notificaciones

      </h2>

      <p className="text-xs text-gray-500">

        {cantidadNoLeidas} acciones pendientes

      </p>

    </div>

  </div>

  <div className="bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow">

    {cantidadNoLeidas}

  </div>

</div>

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

<NotificationCard
  key={n.id}
  notificacion={n}
  onClick={() => setOpen(false)}
/>

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