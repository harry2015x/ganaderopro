"use client";

import { useCallback, useEffect, useState } from "react";
import { obtenerNotificaciones } from "@/lib/notificaciones";
import { Notificacion } from "@/types";

export function useNotificaciones() {

  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([]);
  const [cargando, setCargando] = useState(true);

  const recargar = useCallback(async () => {

    setCargando(true);

    const lista = await obtenerNotificaciones();

    setNotificaciones(lista);

    setCargando(false);

  }, []);

  useEffect(() => {

    recargar();

  }, [recargar]);

  const cantidadNoLeidas = notificaciones.filter(
    n => !n.leida
  ).length;

  return {

    notificaciones,

    cantidadNoLeidas,

    cargando,

    recargar,

  };

}