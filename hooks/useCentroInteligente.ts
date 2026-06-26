"use client";

import { useEffect, useState } from "react";
import { obtenerNotificaciones } from "@/lib/notificaciones";
import { Notificacion } from "@/types";

export function useCentroInteligente() {
  const [acciones, setAcciones] = useState<Notificacion[]>([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    cargar();
  }, []);

  async function cargar() {
    setCargando(true);

    const lista = await obtenerNotificaciones();

    // Ordenar por prioridad
    const prioridad = {
      critica: 4,
      alta: 3,
      media: 2,
      baja: 1,
    };

    lista.sort(
      (a, b) =>
        prioridad[b.prioridad] -
        prioridad[a.prioridad]
    );

    setAcciones(lista);
    setCargando(false);
  }

  return {
    acciones,
    cargando,
    recargar: cargar,
  };
}