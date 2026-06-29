"use client";

import { Bell } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useNotificaciones } from "@/hooks/useNotificaciones";
import NotificationCenter from "./NotificationCenter";

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // Asignamos [] y 0 como valores por defecto por si el hook aún no tiene los datos listos
  const {
    notificaciones = [],
    cantidadNoLeidas = 0,
    cargando,
  } = useNotificaciones();

  useEffect(() => {

    function handleClickOutside(event: MouseEvent) {
  
      if (
  
        panelRef.current &&
  
        !panelRef.current.contains(event.target as Node)
  
      ) {
  
        setOpen(false);
  
      }
  
    }
  
    document.addEventListener(
  
      "mousedown",
  
      handleClickOutside
  
    );
  
    return () => {
  
      document.removeEventListener(
  
        "mousedown",
  
        handleClickOutside
  
      );
  
    };
  
  }, []);

  return (
    <div className="relative" ref={panelRef}>
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
        <div className="absolute
        right-0
        mt-2
        w-[420px]
        max-w-[95vw]
        rounded-2xl
        bg-white
        shadow-2xl
        border
        z-[9999]
        origin-top-right
        animate-in
        fade-in
        zoom-in-95
        duration-200">
          <div className="p-4 space-y-3">
            {cargando && (
              <p className="text-center text-gray-500">
                Cargando...
              </p>
            )}

            {/* Agregamos el Optional Chaining (?.) por seguridad extra */}
            {!cargando && notificaciones?.length === 0 && (
              <p className="text-center text-gray-500">
                No hay notificaciones.
              </p>
            )}

            {/* Agregamos ?.map para asegurarnos de que solo itere si es un array válido */}
            <NotificationCenter
  notificaciones={notificaciones}
  onMarkRead={() => setOpen(false)}
/>
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