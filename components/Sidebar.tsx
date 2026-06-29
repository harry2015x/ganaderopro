"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { supabase } from "../lib/supabase";
import { useEffect, useState } from "react";
import { obtenerRolUsuario } from "../lib/auth";
import { registrarAuditoria } from "../lib/auditoria";
import {
  LayoutDashboard,
  Beef,
  Weight,
  Syringe,
  HeartPulse,
  BarChart3,
  FileText,
  Wallet,
  Users,
  ClipboardList,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  User as UserIcon,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  soloAdmin?: boolean;
};

type NavGroup = {
  title: string;
  items: NavItem[];
};

const navGroups: NavGroup[] = [
  {
    title: "General",
    items: [{ href: "/", label: "Dashboard", icon: LayoutDashboard }],
  },
  {
    title: "Ganadería",
    items: [
      { href: "/ganado", label: "Ganado", icon: Beef },
      { href: "/pesajes", label: "Pesajes", icon: Weight },
      { href: "#", label: "Vacunación", icon: Syringe },
      { href: "#", label: "Reproducción", icon: HeartPulse },
    ],
  },
  {
    title: "Análisis",
    items: [
      { href: "/graficas", label: "Gráficas", icon: BarChart3 },
      { href: "#", label: "Reportes", icon: FileText },
    ],
  },
  {
    title: "Finanzas",
    items: [{ href: "#", label: "Costos", icon: Wallet }],
  },
  {
    title: "Administración",
    items: [
      { href: "/usuarios", label: "Usuarios", icon: Users, soloAdmin: true },
      { href: "/auditoria", label: "Auditoría", icon: ClipboardList, soloAdmin: true },
    ],
  },
];

const ROLE_LABELS: Record<string, string> = {
  admin: "Administrador",
  operador: "Operador",
  visualizador: "Visualizador",
};

export default function Sidebar() {
  const pathname = usePathname();
  const [rol, setRol] = useState<string | null>(null);
  const [nombreUsuario, setNombreUsuario] = useState<string | null>(null);
  const [expandido, setExpandido] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    cargarRol();

    const usuarioGuardado = localStorage.getItem("usuario");
    if (usuarioGuardado) {
      try {
        const usuario = JSON.parse(usuarioGuardado);
        setNombreUsuario(usuario?.nombre ?? null);
      } catch {
        setNombreUsuario(null);
      }
    }
  }, []);

  // Cierra el drawer móvil automáticamente al navegar
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  async function cargarRol() {
    const rolUsuario = await obtenerRolUsuario();
    setRol(rolUsuario);
  }

  async function cerrarSesion() {
    const usuarioGuardado = localStorage.getItem("usuario");

    if (usuarioGuardado) {
      const usuario = JSON.parse(usuarioGuardado);

      await registrarAuditoria(
        usuario.id,
        usuario.nombre,
        "CERRAR_SESION",
        "LOGIN",
        "Usuario cerró sesión"
      );
    }

    await supabase.auth.signOut();

    localStorage.removeItem("usuario");

    window.location.href = "/login";
  }

  return (
    <>
      {/* ── Botón hamburguesa (solo móvil) ── */}
      {!mobileOpen && (
        <button
          onClick={() => setMobileOpen(true)}
          aria-label="Abrir menú"
          className="
          fixed left-4 top-4 z-[10001]
            flex h-10 w-10 items-center justify-center
            rounded-xl bg-green-950 text-white shadow-lg
            ring-1 ring-white/10
            md:hidden
          "
        >
          <Menu className="h-5 w-5" />
        </button>
      )}

      {/* ── Fondo oscuro al abrir el drawer en móvil ── */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
          className="fixed inset-0 z-30 bg-black/50 backdrop-blur-sm md:hidden"
        />
      )}

<aside
  className={`
    fixed inset-y-0 left-0 z-40 md:relative md:translate-x-0
    ${mobileOpen ? "translate-x-0" : "-translate-x-full"}
    h-screen
    flex
    flex-col
    overflow-x-visible overflow-y-hidden
    bg-gradient-to-b
    from-green-950
    via-green-900
    to-emerald-950
    text-white
    shadow-2xl
    transition-all
    duration-300
    ease-in-out
    ${expandido ? "w-[280px]" : "w-20"}
  `}
>
        {/* ── Botón colapsar (desktop / tablet) ── */}
        <button
          onClick={() => setExpandido(!expandido)}
          title={expandido ? "Colapsar menú" : "Expandir menú"}
          className="
absolute
-right-4
top-6
z-[99999]
hidden
h-8
w-8
items-center
justify-center
rounded-full
bg-emerald-500
text-white
shadow-xl
ring-2
ring-green-950
transition
hover:bg-emerald-400
md:flex
"
        >
          {expandido ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </button>

        {/* ── Botón cerrar (solo móvil) ── */}
        <button
          onClick={() => setMobileOpen(false)}
          aria-label="Cerrar menú"
          className="
            absolute right-3 top-3 z-10
            flex h-8 w-8 items-center justify-center
            rounded-lg text-green-200/80
            hover:bg-white/10 hover:text-white transition-colors
            md:hidden
          "
        >
          <X className="h-5 w-5" />
        </button>

        {/* ── Logo ── */}
        <div
          className={`
            flex items-center gap-3 px-4 pt-6 pb-5
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
              <p className="text-[11px] text-green-300/70 mt-0.5 whitespace-nowrap">
                Gestión Ganadera Inteligente
              </p>
            </div>
          )}
        </div>

        {/* ── Tarjeta de usuario ── */}
        <div
          className={`
            flex items-center gap-3 rounded-xl bg-white/5 ring-1 ring-white/10
            mx-4 mb-5
            ${expandido ? "px-3 py-2.5" : "mx-auto justify-center px-0 py-2.5 w-11"}
          `}
        >
          <div className="flex-shrink-0 flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-green-600 text-xs font-bold ring-2 ring-white/10">
            {nombreUsuario ? (
              nombreUsuario.charAt(0).toUpperCase()
            ) : (
              <UserIcon className="h-4 w-4" />
            )}
          </div>

          {expandido && (
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold leading-tight">
                {nombreUsuario ?? "Usuario"}
              </p>
              <p className="flex items-center gap-1.5 text-[11px] text-green-300/70">
                <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-emerald-400" />
                {rol ? ROLE_LABELS[rol] ?? rol : "Cargando..."}
              </p>
            </div>
          )}
        </div>

        {/* ── Navegación ── */}
        <nav
  className={`
    flex-1
    overflow-visible
    ${expandido ? "px-3" : "px-2"}
  `}
>
          {navGroups.map((group) => {
            const itemsVisibles = group.items.filter(
              (item) => !item.soloAdmin || rol === "admin"
            );

            if (itemsVisibles.length === 0) return null;

            return (
              <div key={group.title} className="mb-1">
                {expandido ? (
                  <p className="px-3.5 pt-5 pb-2 text-[10px] font-bold uppercase tracking-wider text-green-400/50">
                    {group.title}
                  </p>
                ) : (
                  <div className="mx-3 my-3 border-t border-white/10" />
                )}

                <div className="flex flex-col gap-1">
                  {itemsVisibles.map((item) => {
                    const Icon = item.icon;
                    const deshabilitado = item.href === "#";

                    const activo =
                      !deshabilitado &&
                      (pathname === item.href ||
                        (item.href !== "/" && pathname.startsWith(item.href)));

                    return (
                      <Link
                        key={item.label}
                        href={item.href}
                        aria-disabled={deshabilitado}
                        aria-label={item.label}
                        onClick={() => setMobileOpen(false)}
                        className={`
                          group relative flex items-center gap-3 rounded-xl
                          text-sm font-medium transition-all duration-300 ease-out
                          ${expandido ? "px-3.5 py-2.5" : "justify-center px-0 py-3"}
                          ${
                            activo
                              ? "bg-white text-green-800 shadow-md shadow-black/10"
                              : deshabilitado
                              ? "text-green-200/40 cursor-not-allowed"
                              : "text-green-100/85 hover:text-white hover:bg-white/10 hover:-translate-y-0.5 hover:shadow-md hover:shadow-black/10"
                          }
                        `}
                      >
                        {/* Indicador activo */}
                        {activo && expandido && (
                          <span className="absolute -left-3 h-6 w-1 rounded-r-full bg-emerald-400" />
                        )}

                        <Icon
                          className={`
                            h-[18px] w-[18px] flex-shrink-0 transition-all duration-300
                            ${
                              activo
                                ? "text-green-700"
                                : deshabilitado
                                ? "text-green-200/40"
                                : "text-green-200 group-hover:text-emerald-300 group-hover:scale-110"
                            }
                          `}
                          strokeWidth={2}
                        />

                        {expandido && (
                          <span className="flex-1 whitespace-nowrap">{item.label}</span>
                        )}

                        {expandido && deshabilitado && (
                          <span className="text-[9px] uppercase tracking-wide font-semibold text-green-300/50 bg-white/5 px-1.5 py-0.5 rounded">
                            Pronto
                          </span>
                        )}

                        {/* Tooltip en modo colapsado */}
                        {!expandido && (
                          <span
                            className="
                              pointer-events-none absolute left-full top-1/2 z-50 ml-3 -translate-y-1/2
                              whitespace-nowrap rounded-lg bg-green-950 px-2.5 py-1.5
                              text-xs font-medium text-white shadow-lg ring-1 ring-white/10
                              opacity-0 invisible
                              transition-all duration-200
                              group-hover:visible group-hover:opacity-100
                            "
                          >
                            {item.label}
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>

        {/* ── Footer ── */}
        <div className="
flex-shrink-0
border-t
border-white/10
bg-green-950
px-3
pt-4
pb-5
">
          <button
            onClick={cerrarSesion}
            title="Cerrar sesión"
            className={`
              w-full bg-red-600/90 hover:bg-red-600 text-white text-sm font-semibold
              py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2
            `}
          >
            <LogOut className="h-4 w-4" strokeWidth={2.5} />
            {expandido && "Cerrar sesión"}
          </button>

          {expandido && (
            <div className="flex items-center justify-between px-1 text-green-200/60 text-[11px] mt-4">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                Sistema activo
              </span>
              <span className="font-mono text-green-200/40">v1.0.0</span>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}