"use client";

import { Bell } from "lucide-react";
import { useState } from "react";
import Link from "next/link";

export default function NotificationBell() {
  const [open, setOpen] = useState(false);

  const total = 3;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative h-11 w-11 rounded-full bg-green-50 hover:bg-green-100 flex items-center justify-center"
      >
        <Bell className="h-5 w-5 text-green-700" />

        {total > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
            {total}
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

            <div className="border rounded-xl p-3">
              <p className="font-semibold">
                Darwin
              </p>

              <p className="text-sm text-gray-600">
                Vacuna vence en 7 días
              </p>
            </div>

            <div className="border rounded-xl p-3">
              <p className="font-semibold">
                Pepito 1
              </p>

              <p className="text-sm text-gray-600">
                Sin pesaje hace 30 días
              </p>
            </div>

            <div className="border rounded-xl p-3">
              <p className="font-semibold">
                Luna
              </p>

              <p className="text-sm text-gray-600">
                Control reproductivo pendiente
              </p>
            </div>

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