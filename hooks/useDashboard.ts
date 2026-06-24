"use client";

import { useCallback, useEffect, useState } from "react";
import { DashboardResumen } from "@/types";
import { obtenerResumenDashboard } from "@/lib/dashboard";

export function useDashboard() {

  const [dashboard, setDashboard] = useState<DashboardResumen>({
    totalAnimales: 0,
    totalPesajes: 0,
    ultimoPeso: 0,
    pesoPromedio: 0,
  });

  const [cargando, setCargando] = useState(true);

  const cargarDashboard = useCallback(async () => {

    setCargando(true);

    try {

      const resumen = await obtenerResumenDashboard();

      setDashboard(resumen);

    } finally {

      setCargando(false);

    }

  }, []);

  useEffect(() => {

    cargarDashboard();

  }, [cargarDashboard]);

  return {

    dashboard,

    cargando,

    recargar: cargarDashboard,

  };

}