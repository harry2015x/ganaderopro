"use client";

import Link from "next/link";
import { Notificacion } from "@/types";

interface Props {
  notificacion: Notificacion;
  onClick?: () => void;
}

export default function NotificationCard({
  notificacion,
  onClick,
}: Props) {
  const colorPrioridad = {
    baja: "bg-green-100 text-green-700",
    media: "bg-yellow-100 text-yellow-700",
    alta: "bg-orange-100 text-orange-700",
    critica: "bg-red-100 text-red-700",
  };

  return (
    <Link
      href={notificacion.url || "#"}
      onClick={onClick}
      className="block rounded-2xl border border-gray-200 bg-white p-4 hover:bg-green-50 transition"
    >
      <div className="flex gap-4">
        <div className="text-3xl">
          {notificacion.icono}
        </div>

        <div className="flex-1">
          <div className="flex items-center justify-between">
            <h3 className="font-bold">
              {notificacion.titulo}
            </h3>

            <span
              className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold ${colorPrioridad[notificacion.prioridad]}`}
            >
              {notificacion.prioridad === "critica" && "🔴"}
              {notificacion.prioridad === "alta" && "🟠"}
              {notificacion.prioridad === "media" && "🟡"}
              {notificacion.prioridad === "baja" && "🟢"}
              {notificacion.prioridad.charAt(0).toUpperCase() +
                notificacion.prioridad.slice(1)}
            </span>
          </div>
          
          <div className="flex items-center justify-between mt-2">
            <span className="text-xs text-gray-400">
              {new Date(notificacion.fecha).toLocaleDateString("es-CO")}
            </span>

            {!notificacion.leida && (
              <span className="w-3 h-3 rounded-full bg-blue-500"></span>
            )}
          </div>

          <p className="mt-1 font-semibold">
            {notificacion.animalNombre}
          </p>

          <p className="text-xs text-gray-500">
            Arete {notificacion.animalArete}
          </p>

          <p className="mt-2 text-sm text-gray-600">
            {notificacion.descripcion}
          </p>

          {/* ✅ Fragmento corregido */}
          {notificacion.accion && (
            <div className="mt-4 inline-flex items-center rounded-lg bg-green-100 px-3 py-2 text-sm font-semibold text-green-700 hover:bg-green-200 transition">
              {notificacion.accion} →
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}