"use client";

import { Bell } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useNotificaciones } from "@/hooks/useNotificaciones";
import NotificationCenter from "./NotificationCenter";

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

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

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
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
        <div className="absolute right-0 mt-2 z-[9999]">

          {cargando ? (
            <div className="bg-white rounded-2xl p-8 shadow-xl">
              <p className="text-center text-gray-500">
                Cargando...
              </p>
            </div>
          ) : (
            <NotificationCenter
              notificaciones={notificaciones}
              onMarkRead={() => setOpen(false)}
            />
          )}

        </div>
      )}
    </div>
  );
}