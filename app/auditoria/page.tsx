"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "../../lib/supabase";
import { obtenerRolUsuario } from "../../lib/auth";
import AuthGuard from "../../components/AuthGuard";

// ── Módulo color & icon config ────────────────────────────────────────────────
const MODULO_CONFIG: Record<
  string,
  { bg: string; text: string; border: string; dot: string; icon: string }
> = {
  Animales: {
    bg: "bg-amber-50",
    text: "text-amber-700",
    border: "border-amber-200",
    dot: "bg-amber-400",
    icon: "🐄",
  },
  Salud: {
    bg: "bg-rose-50",
    text: "text-rose-700",
    border: "border-rose-200",
    dot: "bg-rose-400",
    icon: "💊",
  },
  Reproducción: {
    bg: "bg-purple-50",
    text: "text-purple-700",
    border: "border-purple-200",
    dot: "bg-purple-400",
    icon: "🧬",
  },
  Alimentación: {
    bg: "bg-lime-50",
    text: "text-lime-700",
    border: "border-lime-200",
    dot: "bg-lime-500",
    icon: "🌿",
  },
  Finanzas: {
    bg: "bg-sky-50",
    text: "text-sky-700",
    border: "border-sky-200",
    dot: "bg-sky-400",
    icon: "💰",
  },
  Usuarios: {
    bg: "bg-indigo-50",
    text: "text-indigo-700",
    border: "border-indigo-200",
    dot: "bg-indigo-400",
    icon: "👤",
  },
  Sistema: {
    bg: "bg-gray-100",
    text: "text-gray-600",
    border: "border-gray-200",
    dot: "bg-gray-400",
    icon: "⚙️",
  },
};

const fallbackConfig = {
  bg: "bg-teal-50",
  text: "text-teal-700",
  border: "border-teal-200",
  dot: "bg-teal-400",
  icon: "📋",
};

function getModuloConfig(modulo: string) {
  return MODULO_CONFIG[modulo] ?? fallbackConfig;
}

// ── Acción badge colors ───────────────────────────────────────────────────────
const ACCION_CONFIG: Record<string, { bg: string; text: string }> = {
  CREAR:    { bg: "bg-emerald-100", text: "text-emerald-700" },
  EDITAR:   { bg: "bg-blue-100",    text: "text-blue-700"    },
  ELIMINAR: { bg: "bg-red-100",     text: "text-red-700"     },
  VER:      { bg: "bg-gray-100",    text: "text-gray-600"    },
  LOGIN:    { bg: "bg-violet-100",  text: "text-violet-700"  },
  LOGOUT:   { bg: "bg-orange-100",  text: "text-orange-700"  },
};

function getAccionConfig(accion: string) {
  return (
    ACCION_CONFIG[accion?.toUpperCase()] ?? {
      bg: "bg-gray-100",
      text: "text-gray-600",
    }
  );
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function AuditoriaPage() {
  const [registros, setRegistros] = useState<any[]>([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState("");
  const [moduloActivo, setModuloActivo] = useState<string | null>(null);

  const router = useRouter();

  useEffect(() => {
    verificarAcceso();
  }, []);

  async function verificarAcceso() {
    const rol = await obtenerRolUsuario();
    if (rol !== "admin") {
      router.push("/");
      return;
    }
    await cargarAuditoria();
    setCargando(false);
  }

  async function cargarAuditoria() {
    const { data, error } = await supabase
      .from("auditoria")
      .select("*")
      .order("fecha", { ascending: false });

    if (error) {
      console.error(error);
      return;
    }
    setRegistros(data || []);
  }

  // Módulos únicos extraídos de los registros
  const modulos = useMemo(
    () => Array.from(new Set(registros.map((r) => r.modulo).filter(Boolean))),
    [registros]
  );

  // Filtrado combinado: módulo + búsqueda
  const registrosFiltrados = useMemo(() => {
    return registros.filter((r) => {
      const coincideModulo = moduloActivo ? r.modulo === moduloActivo : true;
      const q = busqueda.toLowerCase();
      const coincideBusqueda =
        q === "" ||
        r.usuario_nombre?.toLowerCase().includes(q) ||
        r.modulo?.toLowerCase().includes(q) ||
        r.accion?.toLowerCase().includes(q) ||
        r.descripcion?.toLowerCase().includes(q);
      return coincideModulo && coincideBusqueda;
    });
  }, [registros, moduloActivo, busqueda]);

  // ── Loading ──────────────────────────────────────────────────────────────
  if (cargando) {
    return (
      <AuthGuard>
        <main className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-4 border-green-300 border-t-green-700 rounded-full animate-spin" />
            <p className="text-green-700 font-semibold">Cargando auditoría…</p>
          </div>
        </main>
      </AuthGuard>
    );
  }

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <AuthGuard>
      <main className="min-h-screen bg-gradient-to-br from-slate-50 via-green-50 to-emerald-50 p-4 md:p-8">
        <div className="max-w-7xl mx-auto space-y-6">

          {/* Back link */}
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm text-green-700 hover:text-green-900 font-medium transition-colors"
          >
            <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd"/>
            </svg>
            Volver al Dashboard
          </Link>

          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-emerald-600 mb-1">
                Panel de administración
              </p>
              <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-gray-900">
                Auditoría{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-600 to-emerald-500">
                  del Sistema
                </span>
              </h1>
              <p className="text-gray-500 mt-1 text-sm">
                Historial completo de actividades registradas en GanaderoPro
              </p>
            </div>

            {/* Stats pill */}
            <div className="flex gap-3 flex-wrap">
              <div className="bg-white border border-gray-100 shadow-sm rounded-xl px-4 py-2 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                <span className="text-xs text-gray-500">Total registros</span>
                <span className="text-sm font-bold text-gray-800">{registros.length}</span>
              </div>
              <div className="bg-white border border-gray-100 shadow-sm rounded-xl px-4 py-2 flex items-center gap-2">
                <span className="text-xs text-gray-500">Filtrados</span>
                <span className="text-sm font-bold text-emerald-700">{registrosFiltrados.length}</span>
              </div>
            </div>
          </div>

          {/* Search + Filters bar */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-sm ring-1 ring-gray-100 p-4 flex flex-col gap-4">

            {/* Search input */}
            <div className="relative">
              <svg
                className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
                viewBox="0 0 20 20" fill="currentColor"
              >
                <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd"/>
              </svg>
              <input
                type="text"
                placeholder="Buscar por usuario, módulo, acción o descripción…"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent transition"
              />
              {busqueda && (
                <button
                  onClick={() => setBusqueda("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"/>
                  </svg>
                </button>
              )}
            </div>

            {/* Module filter chips */}
            <div className="flex flex-wrap gap-2 items-center">
              <span className="text-xs text-gray-400 font-medium mr-1">Módulo:</span>

              <button
                onClick={() => setModuloActivo(null)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                  moduloActivo === null
                    ? "bg-gray-800 text-white border-gray-800 shadow-sm"
                    : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"
                }`}
              >
                Todos
                <span className={`inline-flex items-center justify-center w-4 h-4 rounded-full text-[10px] font-bold ${moduloActivo === null ? "bg-white/20" : "bg-gray-100"}`}>
                  {registros.length}
                </span>
              </button>

              {modulos.map((modulo) => {
                const cfg = getModuloConfig(modulo);
                const count = registros.filter((r) => r.modulo === modulo).length;
                const isActive = moduloActivo === modulo;
                return (
                  <button
                    key={modulo}
                    onClick={() => setModuloActivo(isActive ? null : modulo)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                      isActive
                        ? `${cfg.bg} ${cfg.text} ${cfg.border} shadow-sm ring-1 ring-offset-1 ${cfg.border}`
                        : `bg-white text-gray-500 border-gray-200 hover:${cfg.bg} hover:${cfg.text}`
                    }`}
                  >
                    <span>{cfg.icon}</span>
                    {modulo}
                    <span className={`inline-flex items-center justify-center w-4 h-4 rounded-full text-[10px] font-bold ${isActive ? "bg-white/60" : "bg-gray-100"}`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Table */}
          <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-md ring-1 ring-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/80">
                    <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-gray-400">
                      Fecha
                    </th>
                    <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-gray-400">
                      Usuario
                    </th>
                    <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-gray-400">
                      Acción
                    </th>
                    <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-gray-400">
                      Módulo
                    </th>
                    <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-gray-400">
                      Descripción
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-50">
                  {registrosFiltrados.map((registro) => {
                    const moduloCfg = getModuloConfig(registro.modulo);
                    const accionCfg = getAccionConfig(registro.accion);
                    return (
                      <tr
                        key={registro.id}
                        className="group hover:bg-green-50/60 transition-colors"
                      >
                        {/* Fecha */}
                        <td className="px-5 py-3.5">
                          <div className="flex flex-col">
                            <span className="text-xs font-semibold text-gray-700">
                              {new Date(registro.fecha).toLocaleDateString("es-CO", {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                              })}
                            </span>
                            <span className="text-[11px] text-gray-400 mt-0.5">
                              {new Date(registro.fecha).toLocaleTimeString("es-CO", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          </div>
                        </td>

                        {/* Usuario */}
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                              {registro.usuario_nombre?.charAt(0)?.toUpperCase() ?? "?"}
                            </div>
                            <span className="text-sm font-medium text-gray-800">
                              {registro.usuario_nombre}
                            </span>
                          </div>
                        </td>

                        {/* Acción */}
                        <td className="px-5 py-3.5">
                          <span
                            className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold tracking-wide ${accionCfg.bg} ${accionCfg.text}`}
                          >
                            {registro.accion}
                          </span>
                        </td>

                        {/* Módulo */}
                        <td className="px-5 py-3.5">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border ${moduloCfg.bg} ${moduloCfg.text} ${moduloCfg.border}`}
                          >
                            <span className="text-sm leading-none">{moduloCfg.icon}</span>
                            {registro.modulo}
                          </span>
                        </td>

                        {/* Descripción */}
                        <td className="px-5 py-3.5 text-sm text-gray-600 max-w-xs">
                          <p className="line-clamp-2 group-hover:line-clamp-none transition-all">
                            {registro.descripcion}
                          </p>
                        </td>
                      </tr>
                    );
                  })}

                  {/* Empty state */}
                  {registrosFiltrados.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-16 text-center">
                        <div className="flex flex-col items-center gap-3">
                          <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center text-2xl">
                            🔍
                          </div>
                          <p className="text-gray-500 font-medium">
                            Sin resultados para esta búsqueda
                          </p>
                          <p className="text-sm text-gray-400">
                            Intenta con otro término o limpia los filtros
                          </p>
                          <button
                            onClick={() => { setBusqueda(""); setModuloActivo(null); }}
                            className="mt-1 text-sm text-emerald-600 hover:text-emerald-800 font-semibold transition-colors"
                          >
                            Limpiar filtros
                          </button>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Footer count */}
            {registrosFiltrados.length > 0 && (
              <div className="px-5 py-3 border-t border-gray-100 bg-gray-50/50 flex items-center justify-between">
                <p className="text-xs text-gray-400">
                  Mostrando{" "}
                  <span className="font-semibold text-gray-600">
                    {registrosFiltrados.length}
                  </span>{" "}
                  de{" "}
                  <span className="font-semibold text-gray-600">
                    {registros.length}
                  </span>{" "}
                  registros
                </p>
                {(busqueda || moduloActivo) && (
                  <button
                    onClick={() => { setBusqueda(""); setModuloActivo(null); }}
                    className="text-xs text-emerald-600 hover:text-emerald-800 font-semibold transition-colors"
                  >
                    Limpiar filtros
                  </button>
                )}
              </div>
            )}
          </div>

        </div>
      </main>
    </AuthGuard>
  );
}