"use client";

import Link from "next/link";
import { Notificacion } from "@/types";
import { useState } from "react";

interface Props {
  notificaciones: Notificacion[];
  onMarkAllRead?: () => void;
  onMarkRead?: (id: number | string) => void;
}

type Tab = "todas" | "no_leidas" | "critica" | "alta";

const priorityIcon: Record<string, string> = {
  critica: "🔺",
  alta: "🔶",
  media: "🔷",
  baja: "🟢",
};

const avatarBg: Record<string, string> = {
  critica: "bg-red-50",
  alta:    "bg-orange-50",
  media:   "bg-yellow-50",
  baja:    "bg-green-50",
};

const dotBg: Record<string, string> = {
  critica: "bg-red-600",
  alta:    "bg-orange-500",
  media:   "bg-yellow-500",
  baja:    "bg-green-600",
};

const tagStyle: Record<string, string> = {
  critica: "bg-red-50 text-red-700",
  alta:    "bg-orange-50 text-orange-700",
  media:   "bg-yellow-50 text-yellow-700",
  baja:    "bg-green-50 text-green-700",
};

function timeAgo(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60)    return "Ahora";
  if (diff < 3600)  return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
}

export default function NotificationCenter({
  notificaciones,
  onMarkAllRead,
  onMarkRead,
}: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("todas");

  const tabs: { key: Tab; label: string }[] = [
    { key: "todas",     label: "Todas" },
    { key: "no_leidas", label: "No leídas" },
    { key: "critica",   label: "Críticas" },
    { key: "alta",      label: "Alta" },
  ];

  const filtered = notificaciones.filter((n) => {
    if (activeTab === "no_leidas") return !n.leida;
    if (activeTab === "critica")   return n.prioridad === "critica";
    if (activeTab === "alta")      return n.prioridad === "alta";
    return true;
  });

  const unread = filtered.filter((n) => !n.leida);
  const read   = filtered.filter((n) => n.leida);

  return (
    <div className="w-[420px] max-w-[95vw] h-[620px] rounded-2xl border border-gray-200 bg-white shadow-lg overflow-hidden flex flex-col font-sans">

      {/* ── Header ── */}
      <div className="flex items-center justify-between px-5 pt-5 pb-2">
        <h2 className="text-xl font-semibold text-gray-900">Notificaciones</h2>
        <div className="flex items-center gap-2">
          {onMarkAllRead && (
            <button
              onClick={onMarkAllRead}
              className="text-sm font-medium text-green-700 hover:bg-green-50 rounded-lg px-2 py-1 transition"
            >
              Marcar todo leído
            </button>
          )}
          <button
            aria-label="Configuración"
            className="w-9 h-9 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition text-gray-600"
          >
            ⚙️
          </button>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="flex gap-1 px-3 border-b border-gray-200">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg border-b-2 transition ${
              activeTab === t.key
                ? "border-green-600 text-green-700 bg-transparent"
                : "border-transparent text-gray-500 hover:bg-gray-100 hover:text-gray-800"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

{/* ── Scrollable list ── */}
<div className="flex-1 overflow-y-auto">
  <ul
    className="
      p-2
      space-y-1
      [&::-webkit-scrollbar]:w-1.5
      [&::-webkit-scrollbar-thumb]:rounded-full
      [&::-webkit-scrollbar-thumb]:bg-gray-300
      [&::-webkit-scrollbar-track]:bg-transparent
    "
    role="list"
  >
    {filtered.length === 0 && (
      <li className="py-12 text-center text-sm text-gray-400">
        <span className="block text-3xl mb-2">🔕</span>
        Sin notificaciones en esta categoría
      </li>
    )}

    {/* Nuevas */}
    {unread.length > 0 && (
      <>
        <li className="px-3 pt-2 pb-1 text-xs font-semibold text-gray-500 uppercase tracking-wide">
          Nuevas
        </li>

        {unread.map((n) => (
          <NotifItem
            key={n.id}
            notificacion={n}
            onMarkRead={onMarkRead}
          />
        ))}
      </>
    )}

    {/* Anteriores */}
    {read.length > 0 && (
      <>
        <li className="px-3 pt-3 pb-1 text-xs font-semibold text-gray-500 uppercase tracking-wide">
          Anteriores
        </li>

        {read.map((n) => (
      <NotifItem
        key={n.id}
        notificacion={n}
        onMarkRead={onMarkRead}
      />
    ))}
  </>
)}

</ul>
</div>

</div>

  );
}
/*────────────────────────────
Tarjeta individual
────────────────────────────*/
function NotifItem({
  notificacion: n,
  onMarkRead,
}: {
  notificacion: Notificacion;
  onMarkRead?: (id: number | string) => void;
}) {
  return (
    <li role="listitem">
      <Link
        href={n.url || "#"}
        onClick={() => onMarkRead?.(n.id)}
        className={`flex items-start gap-3 px-3 py-2.5 rounded-xl transition group
          ${n.leida
            ? "hover:bg-gray-50"
            : "bg-green-50/70 hover:bg-green-100/60"}`}
      >
        {/* Avatar + badge de prioridad */}
        <div className="relative flex-shrink-0 mt-0.5">
          <div
            className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl
              ${avatarBg[n.prioridad]}`}
            aria-hidden="true"
          >
            {n.icono}
          </div>
          <span
            className={`absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full
              border-2 border-white flex items-center justify-center text-[10px]
              ${dotBg[n.prioridad]}`}
            aria-hidden="true"
          >
            {priorityIcon[n.prioridad]}
          </span>
        </div>

        {/* Contenido */}
        <div className="flex-1 min-w-0">
          {/* Título */}
          <p className="text-sm font-semibold text-gray-900 leading-snug">
            {n.titulo}
          </p>

          {/* Descripción recortada a 2 líneas */}
          <p className="mt-0.5 text-xs text-gray-500 leading-relaxed line-clamp-2">
            {n.descripcion}
          </p>

          {/* Meta: tiempo · animal · arete */}
          <div className="mt-1 flex items-center gap-1.5 flex-wrap">
            <span
              className={`text-xs font-semibold ${
                n.leida ? "text-gray-400 font-normal" : "text-green-700"
              }`}
            >
              {timeAgo(n.fecha)}
            </span>
            <span className="text-gray-300 text-xs" aria-hidden="true">·</span>
            <span className="text-xs text-gray-400">
              {n.animalNombre} · Arete {n.animalArete}
            </span>
          </div>

          {/* Chip de prioridad */}
          <span
            className={`mt-1.5 inline-flex items-center gap-1 px-2 py-0.5
              rounded-full text-[11px] font-semibold ${tagStyle[n.prioridad]}`}
          >
            {priorityIcon[n.prioridad]}
            {n.prioridad.charAt(0).toUpperCase() + n.prioridad.slice(1)}
          </span>

          {/* Acción */}
          {n.accion && (
            <div
              className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5
                rounded-lg bg-green-100 text-green-800 text-xs font-semibold
                group-hover:bg-green-200 transition"
            >
              {n.accion} →
            </div>
          )}
        </div>

        {/* Punto azul de no leída */}
        {!n.leida && (
          <span
            className="mt-2 w-2.5 h-2.5 rounded-full bg-green-600 flex-shrink-0"
            aria-label="No leída"
          />
        )}
      </Link>
    </li>
  );
}