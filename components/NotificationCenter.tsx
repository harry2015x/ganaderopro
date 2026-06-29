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
  alta: "bg-orange-50",
  media: "bg-yellow-50",
  baja: "bg-green-50",
};

const dotBg: Record<string, string> = {
  critica: "bg-red-500",
  alta: "bg-orange-400",
  media: "bg-yellow-400",
  baja: "bg-green-500",
};

const tagStyle: Record<string, string> = {
  critica: "bg-red-50 text-red-700",
  alta: "bg-orange-50 text-orange-700",
  media: "bg-yellow-50 text-yellow-700",
  baja: "bg-green-50 text-green-700",
};

function timeAgo(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return "Ahora";
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
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
    { key: "todas", label: "Todas" },
    { key: "no_leidas", label: "No leídas" },
    { key: "critica", label: "Críticas" },
    { key: "alta", label: "Alta" },
  ];

  const filtered = notificaciones.filter((n) => {
    if (activeTab === "no_leidas") return !n.leida;
    if (activeTab === "critica") return n.prioridad === "critica";
    if (activeTab === "alta") return n.prioridad === "alta";
    return true;
  });

  const unread = filtered.filter((n) => !n.leida);
  const read = filtered.filter((n) => n.leida);

  return (
    <div className="w-[420px] max-w-[95vw] h-[650px] rounded-3xl bg-white shadow-2xl overflow-hidden flex flex-col font-sans">

      {/* ── Header ── */}
      <div className="flex items-center justify-between px-5 pt-5 pb-3 flex-shrink-0">
        <h2 className="text-[22px] font-bold text-gray-900 tracking-tight">
          Notificaciones
        </h2>
        <div className="flex items-center gap-1">
          {onMarkAllRead && (
            <button
              onClick={onMarkAllRead}
              className="text-[13px] font-semibold text-green-700 hover:text-green-800 hover:bg-green-50 rounded-xl px-3 py-1.5 transition-all duration-200"
            >
              Marcar todo leído
            </button>
          )}
          <button
            aria-label="Configuración"
            className="w-9 h-9 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition-all duration-200 text-gray-500 text-base"
          >
            ⚙️
          </button>
        </div>
      </div>

      {/* ── Tabs estilo Facebook ── */}
      <div className="flex gap-1 px-3 pb-2 flex-shrink-0">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`px-3.5 py-1.5 text-[13px] font-semibold rounded-full transition-all duration-200 ${
              activeTab === t.key
                ? "bg-green-100 text-green-800"
                : "text-gray-500 hover:bg-gray-100 hover:text-gray-700"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Separador ── */}
      <div className="h-px bg-gray-100 flex-shrink-0" />

      {/* ── Lista con scroll ── */}
      <div
        className="
          flex-1 overflow-y-auto
          [&::-webkit-scrollbar]:w-1.5
          [&::-webkit-scrollbar-thumb]:rounded-full
          [&::-webkit-scrollbar-thumb]:bg-gray-200
          [&::-webkit-scrollbar-track]:bg-transparent
        "
      >
        <ul className="py-1" role="list">
          {filtered.length === 0 && (
            <li className="py-14 text-center text-sm text-gray-400">
              <span className="block text-4xl mb-3 opacity-60">🔕</span>
              <span className="font-medium">Sin notificaciones en esta categoría</span>
            </li>
          )}

          {/* Nuevas */}
          {unread.length > 0 && (
            <>
              <li className="px-5 pt-3 pb-1.5 text-[11px] font-bold text-gray-500 uppercase tracking-widest">
                Nuevas
              </li>
              {unread.map((n) => (
                <NotifItem key={n.id} notificacion={n} onMarkRead={onMarkRead} />
              ))}
            </>
          )}

          {/* Anteriores */}
          {read.length > 0 && (
            <>
              <li className="px-5 pt-4 pb-1.5 text-[11px] font-bold text-gray-500 uppercase tracking-widest">
                Anteriores
              </li>
              {read.map((n) => (
                <NotifItem key={n.id} notificacion={n} onMarkRead={onMarkRead} />
              ))}
            </>
          )}
        </ul>
      </div>

      {/* ── Footer fijo ── */}
      <div className="flex-shrink-0 border-t border-gray-100 bg-white">
        <Link
          href="/notificaciones"
          className="flex items-center justify-center py-3 text-[13px] font-semibold text-green-700 hover:text-green-800 hover:bg-green-50 transition-all duration-200"
        >
          Ver todas las notificaciones →
        </Link>
      </div>
    </div>
  );
}

/* ────────────────────────────
   Elemento individual de lista
   ──────────────────────────── */
function NotifItem({
  notificacion: n,
  onMarkRead,
}: {
  notificacion: Notificacion;
  onMarkRead?: (id: number | string) => void;
}) {
  return (
    <li role="listitem" className="border-b border-gray-100 last:border-0">
      <Link
        href={n.url || "#"}
        onClick={() => onMarkRead?.(n.id)}
        className={`flex items-start gap-3 px-4 py-2.5 transition-all duration-200 group
          hover:bg-green-50 hover:translate-x-0.5
          ${!n.leida ? "bg-green-50/40" : "bg-white"}`}
      >
        {/* Avatar + badge de prioridad */}
        <div className="relative flex-shrink-0 mt-0.5">
          <div
            className={`w-[42px] h-[42px] rounded-full flex items-center justify-center text-xl ${avatarBg[n.prioridad]}`}
            aria-hidden="true"
          >
            {n.icono}
          </div>
          {/* Badge de prioridad: pequeño punto de color */}
          <span
            className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white ${dotBg[n.prioridad]}`}
            aria-hidden="true"
          />
        </div>

        {/* Contenido */}
        <div className="flex-1 min-w-0">
          {/* Título */}
          <p className={`text-[13.5px] font-semibold leading-snug ${n.leida ? "text-gray-700" : "text-gray-900"}`}>
            {n.titulo}
          </p>

          {/* Descripción */}
          <p className="mt-0.5 text-[12.5px] text-gray-500 leading-relaxed line-clamp-2">
            {n.descripcion}
          </p>

          {/* Meta: tiempo · animal · arete */}
          <div className="mt-1 flex items-center gap-1.5 flex-wrap">
            <span className={`text-[12px] font-semibold ${n.leida ? "text-gray-400" : "text-green-700"}`}>
              {timeAgo(n.fecha)}
            </span>
            <span className="text-gray-300 text-xs" aria-hidden="true">·</span>
            <span className="text-[12px] text-gray-400">
              {n.animalNombre} · Arete {n.animalArete}
            </span>
          </div>

          {/* Acción como enlace, sin botón */}
          {n.accion && (
            <span className="mt-1 inline-block text-[12.5px] font-semibold text-green-700 group-hover:underline transition-all duration-200">
              {n.accion} →
            </span>
          )}
        </div>

        {/* Punto de no leída */}
        {!n.leida && (
          <span
            className="mt-2 w-2 h-2 rounded-full bg-green-600 flex-shrink-0 self-start"
            aria-label="No leída"
          />
        )}
      </Link>
    </li>
  );
}
