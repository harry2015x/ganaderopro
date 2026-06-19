"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export default function AuthGuard({
  children,
}: {
  children: React.ReactNode;
}) {
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    verificarSesion();
  }, []);

  async function verificarSesion() {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      window.location.href = "/login";
      return;
    }

    setCargando(false);
  }

  if (cargando) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-lg font-semibold text-green-700">
          Verificando acceso...
        </p>
      </div>
    );
  }

  return <>{children}</>;
}