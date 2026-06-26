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
              className={`px-2 py-1 rounded-full text-xs font-semibold ${colorPrioridad[notificacion.prioridad]}`}
            >
              {notificacion.prioridad}
            </span>

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

          {notificacion.accion && (
            <div className="mt-3 text-green-700 font-semibold text-sm">
              {notificacion.accion} →
            </div>
          )}

        </div>

      </div>
    </Link>
  );
}