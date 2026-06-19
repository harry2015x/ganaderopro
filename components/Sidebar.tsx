"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Dashboard", icon: "📊" },
  { href: "/ganado", label: "Ganado", icon: "🐂" },
  { href: "#", label: "Vacunación", icon: "💉" },
  { href: "/pesajes", label: "Pesajes", icon: "⚖️" },
  { href: "/graficas", label: "Gráficas", icon: "📈" },
  { href: "#", label: "Reproducción", icon: "❤️" },
  { href: "#", label: "Costos", icon: "💰" },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 min-h-screen bg-gradient-to-b from-green-900 via-green-800 to-emerald-900 text-white p-6 flex flex-col shadow-xl">

      {/* Logo */}
      <div className="flex items-center gap-3 mb-10 px-1">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 text-2xl backdrop-blur-sm ring-1 ring-white/10">
          🐄
        </div>
        <div>
          <h1 className="text-lg font-extrabold tracking-tight leading-none">
            GanaderoPro
          </h1>
          <p className="text-[11px] text-green-300/70 mt-0.5">
            Gestión ganadera
          </p>
        </div>
      </div>

      {/* Navegación */}
      <nav className="flex flex-col gap-1">
        {links.map((link) => {
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
              className={`
                group relative flex items-center gap-3 px-3.5 py-2.5 rounded-xl
                text-sm font-medium transition-all duration-200 ease-out
                ${
                  activo
                    ? "bg-white text-green-800 shadow-md shadow-black/10"
                    : deshabilitado
                    ? "text-green-200/40 cursor-not-allowed"
                    : "text-green-100/85 hover:text-white hover:bg-white/10 hover:translate-x-0.5"
                }
              `}
            >
              {/* Indicador de sección activa */}
              {activo && (
                <span className="absolute -left-6 h-6 w-1 rounded-r-full bg-emerald-400" />
              )}

              <span
                className={`text-lg leading-none transition-transform duration-200 ${
                  !deshabilitado && !activo ? "group-hover:scale-110" : ""
                }`}
              >
                {link.icon}
              </span>

              <span className="flex-1">{link.label}</span>

              {deshabilitado && (
                <span className="text-[9px] uppercase tracking-wide font-semibold text-green-300/50 bg-white/5 px-1.5 py-0.5 rounded">
                  Pronto
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="mt-auto pt-6 border-t border-white/10">
        <div className="flex items-center gap-2.5 px-1 text-green-200/70 text-xs">
          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          Sistema activo
        </div>
      </div>
    </aside>
  );
}