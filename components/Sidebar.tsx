"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { supabase } from "../lib/supabase";
import { useEffect, useState } from "react";
import { obtenerRolUsuario } from "../lib/auth";

const links = [
  { href: "/",          label: "Dashboard",  icon: "📊" },
  { href: "/ganado",    label: "Ganado",      icon: "🐂" },
  { href: "#",          label: "Vacunación",  icon: "💉" },
  { href: "/pesajes",   label: "Pesajes",     icon: "⚖️" },
  { href: "/graficas",  label: "Gráficas",    icon: "📈" },
  { href: "#",          label: "Reproducción",icon: "❤️" },
  { href: "#",          label: "Costos",      icon: "💰" },
  { href: "/usuarios",  label: "Usuarios",    icon: "👤", soloAdmin: true },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [rol, setRol]           = useState<string | null>(null);
  const [expandido, setExpandido] = useState(true);

  useEffect(() => {
    cargarRol();
  }, []);

  async function cargarRol() {
    const rolUsuario = await obtenerRolUsuario();
    setRol(rolUsuario);
  }

  async function cerrarSesion() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  const linksFiltrados = links.filter((link) => {
    if (link.soloAdmin && rol !== "admin") return false;
    return true;
  });

  return (
    <aside
      className={`
        relative min-h-screen flex flex-col
        bg-gradient-to-b from-green-900 via-green-800 to-emerald-900
        text-white shadow-xl
        transition-all duration-300 ease-in-out
        ${expandido ? "w-64" : "w-[72px]"}
      `}
    >
      {/* ── Botón toggle ── */}
      <button
        onClick={() => setExpandido(!expandido)}
        title={expandido ? "Colapsar menú" : "Expandir menú"}
        className="
          absolute -right-3.5 top-6 z-10
          flex h-7 w-7 items-center justify-center
          rounded-full bg-emerald-500 shadow-lg
          text-white text-xs font-bold
          hover:bg-emerald-400 transition-colors
          ring-2 ring-green-900
        "
      >
        {expandido ? "◀" : "▶"}
      </button>

      {/* ── Logo ── */}
      <div
        className={`
          flex items-center gap-3 px-4 pt-6 pb-8
          overflow-hidden
          ${!expandido && "justify-center px-0"}
        `}
      >
        <div className="flex-shrink-0 flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 text-2xl backdrop-blur-sm ring-1 ring-white/10">
          🐄
        </div>

        {expandido && (
          <div className="transition-opacity duration-200">
            <h1 className="text-lg font-extrabold tracking-tight leading-none whitespace-nowrap">
              GanaderoPro
            </h1>
            <p className="text-[11px] text-green-300/70 mt-0.5">
              Gestión ganadera
            </p>
          </div>
        )}
      </div>

      {/* ── Indicador de rol ── */}
      {expandido && (
        <div className="mx-4 mb-4 px-3 py-1.5 rounded-lg bg-white/10 text-xs text-green-300 flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
          Rol:&nbsp;<span className="font-semibold capitalize">{rol ?? "..."}</span>
        </div>
      )}

      {/* ── Navegación ── */}
      <nav className={`flex flex-col gap-1 ${expandido ? "px-3" : "px-2"}`}>
        {linksFiltrados.map((link) => {
          const activo =
            link.href !== "#" &&
            (pathname === link.href ||
              (link.href !== "/" && pathname.startsWith(link.href)));

          const deshabilitado = link.href === "#";

          return (
            <Link
              key={link.label}
              href={link.href}
              aria-disabled={deshabilitado}
              title={!expandido ? link.label : undefined}
              className={`
                group relative flex items-center gap-3 rounded-xl
                text-sm font-medium transition-all duration-200 ease-out
                ${expandido ? "px-3.5 py-2.5" : "justify-center px-0 py-3"}
                ${
                  activo
                    ? "bg-white text-green-800 shadow-md shadow-black/10"
                    : deshabilitado
                    ? "text-green-200/40 cursor-not-allowed"
                    : "text-green-100/85 hover:text-white hover:bg-white/10 hover:translate-x-0.5"
                }
              `}
            >
              {/* Indicador activo */}
              {activo && expandido && (
                <span className="absolute -left-3 h-6 w-1 rounded-r-full bg-emerald-400" />
              )}

              <span
                className={`
                  flex-shrink-0 text-lg leading-none transition-transform duration-200
                  ${!deshabilitado && !activo ? "group-hover:scale-110" : ""}
                `}
              >
                {link.icon}
              </span>

              {expandido && (
                <span className="flex-1 whitespace-nowrap">{link.label}</span>
              )}

              {expandido && deshabilitado && (
                <span className="text-[9px] uppercase tracking-wide font-semibold text-green-300/50 bg-white/5 px-1.5 py-0.5 rounded">
                  Pronto
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* ── Footer ── */}
      <div className="mt-auto pt-6 pb-6 border-t border-white/10 px-3">
        <button
          onClick={cerrarSesion}
          title="Cerrar sesión"
          className={`
            w-full bg-red-600 hover:bg-red-700 text-white text-sm font-semibold
            py-2 rounded-xl transition flex items-center justify-center gap-2
          `}
        >
          🚪 {expandido && "Cerrar sesión"}
        </button>

        {expandido && (
          <div className="flex items-center gap-2 px-1 text-green-200/70 text-xs mt-4">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            Sistema activo
          </div>
        )}
      </div>
    </aside>
  );
}
