'use client';

/**
 * app/sanidad/page.tsx
 *
 * Sanidad dashboard for GanaderoPro. Reads exclusively from the
 * existing, already-deployed `sanidad` views (migrations 00-19):
 *   sanidad.vw_dashboard_resumen
 *   sanidad.vw_proximas_aplicaciones
 *   sanidad.vw_aplicaciones_vencidas
 *   sanidad.vw_tratamientos_activos
 *   sanidad.vw_enfermedades_activas
 *   sanidad.vw_inventario_bajo
 *   sanidad.vw_inventario_por_vencer
 *   sanidad.vw_cobertura_campanas
 *
 * ASSUMPTIONS (please verify against the real project -- these were
 * necessary because no repository files were available when this page
 * was generated):
 *   1. `components/AuthGuard` has a default export used as
 *      `<AuthGuard>{children}</AuthGuard>`, the same as it's assumed
 *      to be used on Ganado/Pesajes/Graficas.
 *   2. `lib/supabase` exports a ready-to-use client as
 *      `export const supabase = createClient(...)`.
 *   3. The `sanidad` schema is reachable via `supabase.schema('sanidad')`
 *      (requires it to be added to Supabase's "Exposed schemas" API
 *      setting -- verify this if requests come back empty/erroring).
 *   4. `app/layout.tsx` already renders Header/Sidebar/LayoutClient
 *      around every page, so this file renders page content only.
 *   5. Column names on each view follow the same snake_case Spanish
 *      convention used throughout the sanidad schema (see per-interface
 *      comments below). If a view's real columns differ, only the
 *      `Vw*` interfaces and the `select()` calls in `loadDashboard()`
 *      need to change -- the rest of the page is written defensively
 *      (optional chaining + fallbacks) so minor naming differences
 *      degrade gracefully instead of crashing.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import Link from 'next/link';
import AuthGuard from '@/components/AuthGuard';
import { supabase } from '@/lib/supabase';

// ---------------------------------------------------------------------
// View row shapes
// ---------------------------------------------------------------------

interface VwDashboardResumen {
  total_animales: number | null;
  aplicaciones_proximas_30_dias: number | null;
  aplicaciones_vencidas: number | null;
  tratamientos_activos: number | null;
  enfermedades_activas: number | null;
  lotes_stock_bajo: number | null;
  lotes_por_vencer: number | null;
  campanas_activas: number | null;
}

interface VwProximaAplicacion {
  aplicacion_id: number;
  animal_id: number;
  animal_arete: string | null;
  animal_nombre: string | null;
  producto: string;
  tipo_producto: string | null;
  fecha_aplicacion: string | null;
  proxima_fecha: string;
  dias_restantes: number;
  veterinario: string | null;
}

interface VwAplicacionVencida {
  aplicacion_id: number;
  animal_id: number;
  animal_arete: string | null;
  animal_nombre: string | null;
  producto: string;
  tipo_producto: string | null;
  fecha_aplicacion: string | null;
  proxima_fecha: string;
  dias_atraso: number;
  veterinario: string | null;
}

interface VwTratamientoActivo {
  tratamiento_id: number;
  enfermedad_id: number;
  animal_id: number;
  animal_arete: string | null;
  animal_nombre: string | null;
  enfermedad: string;
  producto: string;
  fecha_inicio: string;
  fecha_fin: string | null;
  estado_tratamiento: string;
}

interface VwEnfermedadActiva {
  enfermedad_id: number;
  animal_id: number;
  animal_arete: string | null;
  animal_nombre: string | null;
  enfermedad: string;
  fecha_inicio: string;
  estado: string;
  dias_desde_inicio: number;
}

interface VwInventarioItem {
  inventario_id: number;
  producto: string;
  numero_lote: string | null;
  cantidad: number;
  fecha_vencimiento: string | null;
  dias_para_vencer: number | null;
  ubicacion: string | null;
  estado: string;
}

interface VwCoberturaCampana {
  campana_id: number;
  nombre: string;
  estado: string;
  fecha_inicio: string;
  fecha_fin: string | null;
  total_animales: number;
  aplicados: number;
  pendientes: number;
  no_aplicados: number;
  excluidos: number;
  porcentaje_cobertura: number | null;
}

interface DashboardData {
  resumen: VwDashboardResumen | null;
  proximas: VwProximaAplicacion[];
  vencidas: VwAplicacionVencida[];
  tratamientos: VwTratamientoActivo[];
  enfermedades: VwEnfermedadActiva[];
  stockBajo: VwInventarioItem[];
  porVencer: VwInventarioItem[];
  campanas: VwCoberturaCampana[];
}

const EMPTY_DATA: DashboardData = {
  resumen: null,
  proximas: [],
  vencidas: [],
  tratamientos: [],
  enfermedades: [],
  stockBajo: [],
  porVencer: [],
  campanas: [],
};

const ROW_LIMIT = 8;

// ---------------------------------------------------------------------
// Formatting helpers
// ---------------------------------------------------------------------

function formatDate(value?: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatNumber(value?: number | null): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '0';
  return value.toLocaleString('es-CO');
}

function estadoLabel(estado?: string | null): string {
  if (!estado) return 'Sin estado';
  const clean = estado.replace(/_/g, ' ');
  return clean.charAt(0).toUpperCase() + clean.slice(1);
}

const ESTADO_STYLES: Record<string, string> = {
  activo: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  activa: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  aplicado: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  completado: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  curada: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  en_curso: 'bg-blue-50 text-blue-700 ring-blue-600/20',
  controlada: 'bg-blue-50 text-blue-700 ring-blue-600/20',
  pendiente: 'bg-amber-50 text-amber-700 ring-amber-600/20',
  planificada: 'bg-amber-50 text-amber-700 ring-amber-600/20',
  cronica: 'bg-purple-50 text-purple-700 ring-purple-600/20',
  no_aplicado: 'bg-rose-50 text-rose-700 ring-rose-600/20',
  cancelado: 'bg-rose-50 text-rose-700 ring-rose-600/20',
  cancelada: 'bg-rose-50 text-rose-700 ring-rose-600/20',
  descartada: 'bg-slate-100 text-slate-500 ring-slate-500/20',
  excluido: 'bg-slate-100 text-slate-500 ring-slate-500/20',
  finalizada: 'bg-slate-100 text-slate-600 ring-slate-500/20',
  inactivo: 'bg-slate-100 text-slate-500 ring-slate-500/20',
};

function estadoBadgeClasses(estado?: string | null): string {
  if (!estado) return 'bg-slate-100 text-slate-600 ring-slate-500/20';
  return ESTADO_STYLES[estado.toLowerCase()] ?? 'bg-slate-100 text-slate-600 ring-slate-500/20';
}

function urgencyTextClasses(days: number, mode: 'restante' | 'vencido'): string {
  if (mode === 'vencido') return 'text-rose-600';
  if (days <= 3) return 'text-rose-600';
  if (days <= 7) return 'text-amber-600';
  return 'text-emerald-600';
}

function animalLabel(arete?: string | null, nombre?: string | null, id?: number): string {
  if (arete) return arete;
  if (nombre) return nombre;
  return id ? `Animal #${id}` : 'Animal';
}

// ---------------------------------------------------------------------
// Icons (hand-drawn inline SVGs -- no icon package dependency)
// ---------------------------------------------------------------------

type IconName =
  | 'shield'
  | 'tag'
  | 'calendar'
  | 'alertTriangle'
  | 'pulse'
  | 'thermometer'
  | 'box'
  | 'hourglass'
  | 'flag'
  | 'syringe'
  | 'clipboard'
  | 'refresh'
  | 'chevronRight'
  | 'check'
  | 'mapPin'
  | 'user';

const ICON_PATHS: Record<IconName, ReactNode> = {
  shield: <path d="M12 3l7 3v6c0 4.5-3 8-7 9-4-1-7-4.5-7-9V6l7-3zM9 12l2 2 4-4" />,
  tag: (
    <>
      <path d="M3 12l8-8h7a2 2 0 0 1 2 2v7l-8 8a2 2 0 0 1-2.8 0l-6.2-6.2a2 2 0 0 1 0-2.8z" />
      <circle cx="15.5" cy="7.5" r="1.25" fill="currentColor" stroke="none" />
    </>
  ),
  calendar: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M16 3v4M8 3v4M3 10h18" />
    </>
  ),
  alertTriangle: (
    <>
      <path d="M12 3l10 18H2L12 3z" />
      <path d="M12 9.5v4.5" />
      <circle cx="12" cy="17" r="0.9" fill="currentColor" stroke="none" />
    </>
  ),
  pulse: <path d="M3 12h4l2-7 4 14 2-7h6" />,
  thermometer: (
    <>
      <path d="M12 3a2 2 0 0 0-2 2v9a4 4 0 1 0 4 0V5a2 2 0 0 0-2-2z" />
      <path d="M12 14V7" />
    </>
  ),
  box: (
    <>
      <path d="M21 8l-9-5-9 5 9 5 9-5z" />
      <path d="M3 8v8l9 5 9-5V8" />
      <path d="M12 13v8" />
    </>
  ),
  hourglass: <path d="M6 3h12M6 21h12M7 3c0 5 4 6 5 6s5-1 5-6M7 21c0-5 4-6 5-6s5 1 5 6" />,
  flag: (
    <>
      <path d="M5 3v18" />
      <path d="M5 4h11l-2 4 2 4H5" />
    </>
  ),
  syringe: (
    <>
      <path d="M19.5 4.5l-2-2-3 3M16.5 5.5l2 2M14.5 7.5l-9 9L3 20l3.5-2.5 9-9" />
      <path d="M11 9l4 4" />
    </>
  ),
  clipboard: (
    <>
      <rect x="5" y="4" width="14" height="17" rx="2" />
      <rect x="9" y="2" width="6" height="4" rx="1" />
      <path d="M9 11h6M9 15h6" />
    </>
  ),
  refresh: (
    <>
      <path d="M4 4v6h6" />
      <path d="M20 20v-6h-6" />
      <path d="M5.5 15a8 8 0 0 0 13.9 2.5M18.5 9A8 8 0 0 0 4.6 6.5" />
    </>
  ),
  chevronRight: <path d="M9 6l6 6-6 6" />,
  check: <path d="M5 12l5 5L20 7" />,
  mapPin: (
    <>
      <path d="M12 21s7-6.1 7-11a7 7 0 1 0-14 0c0 4.9 7 11 7 11z" />
      <circle cx="12" cy="10" r="2.3" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M4.5 20a7.5 7.5 0 0 1 15 0" />
    </>
  ),
};

function Icon({ name, className }: { name: IconName; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {ICON_PATHS[name]}
    </svg>
  );
}

// ---------------------------------------------------------------------
// Shared presentational helpers
// ---------------------------------------------------------------------

type AccentKey = 'green' | 'blue' | 'orange' | 'purple' | 'red';

const ACCENTS: Record<AccentKey, { bar: string; iconBg: string; iconText: string; ring: string }> = {
  green: { bar: 'from-green-500 to-emerald-500', iconBg: 'bg-emerald-50', iconText: 'text-emerald-600', ring: 'ring-emerald-600/10' },
  blue: { bar: 'from-blue-500 to-cyan-500', iconBg: 'bg-blue-50', iconText: 'text-blue-600', ring: 'ring-blue-600/10' },
  orange: { bar: 'from-orange-500 to-amber-500', iconBg: 'bg-amber-50', iconText: 'text-amber-600', ring: 'ring-amber-600/10' },
  purple: { bar: 'from-purple-500 to-fuchsia-500', iconBg: 'bg-purple-50', iconText: 'text-purple-600', ring: 'ring-purple-600/10' },
  red: { bar: 'from-red-500 to-rose-500', iconBg: 'bg-rose-50', iconText: 'text-rose-600', ring: 'ring-rose-600/10' },
};

function Panel({ children, className = '', id }: { children: ReactNode; className?: string; id?: string }) {
  return (
    <div id={id} className={`overflow-hidden rounded-2xl bg-white/90 shadow-md ring-1 ring-black/5 backdrop-blur-sm ${className}`}>
      {children}
    </div>
  );
}

function SectionHeading({
  icon,
  title,
  subtitle,
  count,
}: {
  icon: IconName;
  title: string;
  subtitle?: string;
  count?: number;
}) {
  return (
    <div className="mb-4 flex items-center gap-3">
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 ring-1 ring-emerald-600/10">
        <Icon name={icon} className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <h2 className="text-lg font-bold text-slate-900 sm:text-xl">{title}</h2>
        {subtitle && <p className="text-sm text-slate-500">{subtitle}</p>}
      </div>
      {typeof count === 'number' && (
        <span className="ml-auto shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
          {count}
        </span>
      )}
    </div>
  );
}

function Badge({ estado }: { estado?: string | null }) {
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${estadoBadgeClasses(
        estado
      )}`}
    >
      {estadoLabel(estado)}
    </span>
  );
}

function EmptyState({ icon, title, description }: { icon: IconName; title: string; description: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-12 text-center">
      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-50 text-slate-400 ring-1 ring-slate-200">
        <Icon name={icon} className="h-5 w-5" />
      </div>
      <p className="text-sm font-semibold text-slate-600">{title}</p>
      <p className="max-w-xs text-xs text-slate-400">{description}</p>
    </div>
  );
}

function TableSkeleton({ rows = 4, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="space-y-3 p-5">
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex gap-4">
          {Array.from({ length: cols }).map((__, c) => (
            <div key={c} className="h-4 flex-1 animate-pulse rounded bg-slate-200/80" />
          ))}
        </div>
      ))}
    </div>
  );
}

function ScrollTable({ children }: { children: ReactNode }) {
  return <div className="overflow-x-auto">{children}</div>;
}

const th = 'px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-white/90';
const td = 'whitespace-nowrap px-4 py-3 text-sm text-slate-700';
const trHover = 'transition hover:bg-emerald-50/60';

function TableHead({ headers }: { headers: string[] }) {
  return (
    <thead className="bg-gradient-to-r from-green-600 to-emerald-600">
      <tr>
        {headers.map((h) => (
          <th key={h} scope="col" className={th}>
            {h}
          </th>
        ))}
      </tr>
    </thead>
  );
}

// ---------------------------------------------------------------------
// KPI card
// ---------------------------------------------------------------------

interface KpiDefinition {
  key: keyof VwDashboardResumen;
  label: string;
  icon: IconName;
  accent: AccentKey;
  hint: string;
}

const KPI_DEFINITIONS: KpiDefinition[] = [
  { key: 'total_animales', label: 'Total animales', icon: 'tag', accent: 'green', hint: 'En el hato' },
  { key: 'aplicaciones_proximas_30_dias', label: 'Aplicaciones próximas', icon: 'calendar', accent: 'blue', hint: 'Programadas' },
  { key: 'aplicaciones_vencidas', label: 'Aplicaciones vencidas', icon: 'alertTriangle', accent: 'red', hint: 'Requieren atención' },
  { key: 'tratamientos_activos', label: 'Tratamientos activos', icon: 'pulse', accent: 'purple', hint: 'En curso' },
  { key: 'enfermedades_activas', label: 'Enfermedades activas', icon: 'thermometer', accent: 'orange', hint: 'Bajo seguimiento' },
  { key: 'lotes_stock_bajo', label: 'Stock bajo', icon: 'box', accent: 'red', hint: 'Productos a reponer' },
  { key: 'lotes_por_vencer', label: 'Productos por vencer', icon: 'hourglass', accent: 'orange', hint: 'Revisar inventario' },
  { key: 'campanas_activas', label: 'Campañas activas', icon: 'flag', accent: 'blue', hint: 'En ejecución' },
];

function KpiCard({ def, value, loading }: { def: KpiDefinition; value: number | null; loading: boolean }) {
  const a = ACCENTS[def.accent];
  return (
    <div className="relative overflow-hidden rounded-2xl bg-white/80 shadow-md ring-1 ring-black/5 backdrop-blur-sm transition hover:shadow-lg">
      <div className={`h-1.5 w-full bg-gradient-to-r ${a.bar}`} />
      <div className="flex items-start justify-between gap-3 p-4 sm:p-5">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{def.label}</p>
          {loading ? (
            <div className="mt-2 h-7 w-14 animate-pulse rounded-md bg-slate-200" />
          ) : (
            <p className="mt-1 text-2xl font-bold tabular-nums text-slate-900 sm:text-3xl">{formatNumber(value)}</p>
          )}
          {!loading && <p className="mt-1 text-xs text-slate-400">{def.hint}</p>}
        </div>
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${a.iconBg} ${a.iconText}`}>
          <Icon name={def.icon} className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------
// Quick actions
// ---------------------------------------------------------------------

interface QuickAction {
  href: string;
  title: string;
  description: string;
  icon: IconName;
  accent: AccentKey;
}

const QUICK_ACTIONS: QuickAction[] = [
  { href: '/sanidad/vacunacion', title: 'Vacunación', description: 'Registrar aplicaciones sanitarias', icon: 'syringe', accent: 'green' },
  { href: '/sanidad/tratamientos', title: 'Tratamientos', description: 'Gestionar tratamientos activos', icon: 'pulse', accent: 'purple' },
  { href: '/sanidad/enfermedades', title: 'Enfermedades', description: 'Registrar y dar seguimiento', icon: 'thermometer', accent: 'orange' },
  { href: '/sanidad/protocolos', title: 'Protocolos', description: 'Definir planes sanitarios', icon: 'clipboard', accent: 'blue' },
  { href: '/sanidad/campanas', title: 'Campañas', description: 'Coordinar campañas sanitarias', icon: 'flag', accent: 'blue' },
  { href: '/sanidad/inventario', title: 'Inventario', description: 'Controlar existencias e insumos', icon: 'box', accent: 'red' },
];

function QuickActionCard({ action }: { action: QuickAction }) {
  const a = ACCENTS[action.accent];
  return (
    <Link
      href={action.href}
      className="group flex items-center gap-4 rounded-2xl bg-white/80 p-4 shadow-md ring-1 ring-black/5 backdrop-blur-sm transition hover:-translate-y-0.5 hover:shadow-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
    >
      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${a.iconBg} ${a.iconText}`}>
        <Icon name={action.icon} className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-slate-800">{action.title}</p>
        <p className="truncate text-xs text-slate-500">{action.description}</p>
      </div>
      <Icon
        name="chevronRight"
        className="ml-auto h-4 w-4 shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-slate-400"
      />
    </Link>
  );
}

// ---------------------------------------------------------------------
// Data loading
// ---------------------------------------------------------------------

async function loadDashboard(): Promise<{ data: DashboardData; errors: string[] }> {
  const db = supabase.schema('sanidad');
  const errors: string[] = [];

  const [
    resumenRes,
    proximasRes,
    vencidasRes,
    tratamientosRes,
    enfermedadesRes,
    stockBajoRes,
    porVencerRes,
    campanasRes,
  ] = await Promise.all([
    db.from('vw_dashboard_resumen').select('*').maybeSingle(),
    db.from('vw_proximas_aplicaciones').select('*').order('dias_restantes', { ascending: true }).limit(ROW_LIMIT),
    db.from('vw_aplicaciones_vencidas').select('*').order('dias_atraso', { ascending: false }).limit(ROW_LIMIT),
    db.from('vw_tratamientos_activos').select('*').order('fecha_inicio', { ascending: false }).limit(ROW_LIMIT),
    db.from('vw_enfermedades_activas').select('*').order('dias_desde_inicio', { ascending: false }).limit(ROW_LIMIT),
    db.from('vw_inventario_bajo').select('*').order('cantidad', { ascending: true }).limit(ROW_LIMIT),
    db.from('vw_inventario_por_vencer').select('*').order('fecha_vencimiento', { ascending: true }).limit(ROW_LIMIT),
    db.from('vw_cobertura_campanas').select('*').order('fecha_inicio', { ascending: false }).limit(ROW_LIMIT),
  ]);

  if (resumenRes.error) errors.push(`Resumen: ${resumenRes.error.message}`);
  if (proximasRes.error) errors.push(`Aplicaciones próximas: ${proximasRes.error.message}`);
  if (vencidasRes.error) errors.push(`Aplicaciones vencidas: ${vencidasRes.error.message}`);
  if (tratamientosRes.error) errors.push(`Tratamientos activos: ${tratamientosRes.error.message}`);
  if (enfermedadesRes.error) errors.push(`Enfermedades activas: ${enfermedadesRes.error.message}`);
  if (stockBajoRes.error) errors.push(`Stock bajo: ${stockBajoRes.error.message}`);
  if (porVencerRes.error) errors.push(`Productos por vencer: ${porVencerRes.error.message}`);
  if (campanasRes.error) errors.push(`Cobertura de campañas: ${campanasRes.error.message}`);

  return {
    data: {
      resumen: (resumenRes.data as VwDashboardResumen | null) ?? null,
      proximas: (proximasRes.data as VwProximaAplicacion[] | null) ?? [],
      vencidas: (vencidasRes.data as VwAplicacionVencida[] | null) ?? [],
      tratamientos: (tratamientosRes.data as VwTratamientoActivo[] | null) ?? [],
      enfermedades: (enfermedadesRes.data as VwEnfermedadActiva[] | null) ?? [],
      stockBajo: (stockBajoRes.data as VwInventarioItem[] | null) ?? [],
      porVencer: (porVencerRes.data as VwInventarioItem[] | null) ?? [],
      campanas: (campanasRes.data as VwCoberturaCampana[] | null) ?? [],
    },
    errors,
  };
}

// ---------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------

export default function SanidadPage() {
  return (
    <AuthGuard>
      <SanidadDashboard />
    </AuthGuard>
  );
}

function SanidadDashboard() {
  const [data, setData] = useState<DashboardData>(EMPTY_DATA);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [toast, setToast] = useState<{ tone: 'success' | 'error'; message: string } | null>(null);

  const runLoad = useCallback(async (mode: 'initial' | 'refresh') => {
    if (mode === 'initial') setLoading(true);
    else setRefreshing(true);

    try {
      const result = await loadDashboard();
      setData(result.data);
      setErrors(result.errors);
      if (mode === 'refresh') {
        setToast(
          result.errors.length > 0
            ? { tone: 'error', message: 'Se actualizó con algunos errores. Revisa el detalle abajo.' }
            : { tone: 'success', message: 'Panel actualizado.' }
        );
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error inesperado al cargar el panel.';
      setErrors([message]);
      if (mode === 'refresh') setToast({ tone: 'error', message });
    } finally {
      if (mode === 'initial') setLoading(false);
      else setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    runLoad('initial');
  }, [runLoad]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(timer);
  }, [toast]);

  const resumen = data.resumen;

  const alerts = useMemo(() => {
    const items: { key: string; icon: IconName; tone: 'red' | 'orange'; title: string; description: string; href: string }[] = [];

    if (data.vencidas.length > 0) {
      items.push({
        key: 'vencidas',
        icon: 'alertTriangle',
        tone: 'red',
        title: `${data.vencidas.length} aplicación(es) sanitaria(s) vencida(s)`,
        description: 'Requieren atención inmediata para no perder cobertura sanitaria.',
        href: '#actividad-sanitaria',
      });
    }
    if (data.enfermedades.length > 0) {
      items.push({
        key: 'enfermedades',
        icon: 'thermometer',
        tone: 'orange',
        title: `${data.enfermedades.length} enfermedad(es) activa(s)`,
        description: 'Animales bajo seguimiento clínico en este momento.',
        href: '#estado-sanitario',
      });
    }
    if (data.stockBajo.length > 0) {
      items.push({
        key: 'stock',
        icon: 'box',
        tone: 'red',
        title: `${data.stockBajo.length} producto(s) con stock bajo`,
        description: 'Considera reabastecer antes de que se agoten.',
        href: '#inventario',
      });
    }
    if (data.porVencer.length > 0) {
      items.push({
        key: 'vencer',
        icon: 'hourglass',
        tone: 'orange',
        title: `${data.porVencer.length} lote(s) próximo(s) a vencer`,
        description: 'Prioriza su uso o retíralos del inventario activo.',
        href: '#inventario',
      });
    }
    return items;
  }, [data]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50">
      <div className="mx-auto max-w-7xl space-y-10 px-4 py-8 sm:px-6 lg:px-8">
        {/* HEADER */}
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-green-600 to-emerald-600 text-white shadow-lg shadow-emerald-900/10">
              <Icon name="shield" className="h-7 w-7" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">Sanidad</h1>
              <p className="text-sm text-slate-500 sm:text-base">Gestión sanitaria integral del hato</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => runLoad('refresh')}
              disabled={refreshing || loading}
              aria-label="Actualizar panel de sanidad"
              className="inline-flex items-center gap-2 rounded-xl bg-white/80 px-4 py-2.5 text-sm font-semibold text-slate-600 shadow-sm ring-1 ring-black/5 backdrop-blur-sm transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Icon name="refresh" className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              Actualizar
            </button>
            <Link
              href="/sanidad/vacunacion"
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md transition hover:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
            >
              <Icon name="syringe" className="h-4 w-4" />
              Registrar actividad
            </Link>
          </div>
        </header>

        {/* TOAST */}
        {toast && (
          <div
            role="status"
            aria-live="polite"
            className={`flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium shadow-md ring-1 ${
              toast.tone === 'success'
                ? 'bg-emerald-50 text-emerald-700 ring-emerald-600/20'
                : 'bg-rose-50 text-rose-700 ring-rose-600/20'
            }`}
          >
            <Icon name={toast.tone === 'success' ? 'check' : 'alertTriangle'} className="h-4 w-4 shrink-0" />
            {toast.message}
          </div>
        )}

        {/* ERROR SUMMARY */}
        {errors.length > 0 && (
          <div className="rounded-xl bg-rose-50/80 px-4 py-3 text-sm text-rose-700 ring-1 ring-rose-600/20">
            <p className="font-semibold">No se pudieron cargar algunos datos:</p>
            <ul className="mt-1 list-inside list-disc space-y-0.5">
              {errors.map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
          </div>
        )}

        {/* 1. OVERVIEW */}
        <section aria-labelledby="overview-heading">
          <h2 id="overview-heading" className="sr-only">
            Resumen general
          </h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {KPI_DEFINITIONS.map((def) => (
              <KpiCard key={def.key} def={def} value={resumen ? resumen[def.key] : null} loading={loading} />
            ))}
          </div>
        </section>

        {/* 2. ALERTS */}
        <section aria-labelledby="alerts-heading">
          <SectionHeading icon="alertTriangle" title="Alertas" subtitle="Situaciones que requieren tu atención primero" />
          {loading ? (
            <div className="space-y-2">
              <div className="h-14 animate-pulse rounded-xl bg-white/60" />
              <div className="h-14 animate-pulse rounded-xl bg-white/60" />
            </div>
          ) : alerts.length === 0 ? (
            <Panel>
              <EmptyState icon="check" title="Todo en orden" description="No hay alertas sanitarias activas en este momento." />
            </Panel>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {alerts.map((alert) => (
                <a
                  key={alert.key}
                  href={alert.href}
                  className={`flex items-start gap-3 rounded-xl px-4 py-3 shadow-sm ring-1 backdrop-blur-sm transition hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 ${
                    alert.tone === 'red'
                      ? 'bg-rose-50/90 text-rose-700 ring-rose-200'
                      : 'bg-amber-50/90 text-amber-700 ring-amber-200'
                  }`}
                >
                  <Icon name={alert.icon} className="mt-0.5 h-5 w-5 shrink-0" />
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold">{alert.title}</span>
                    <span className="block text-xs opacity-80">{alert.description}</span>
                  </span>
                </a>
              ))}
            </div>
          )}
        </section>

        {/* 3. UPCOMING ACTIVITY (vencidas + próximas) */}
        <section aria-labelledby="actividad-heading" id="actividad-sanitaria" className="space-y-6">
          <SectionHeading icon="calendar" title="Actividad sanitaria" subtitle="Aplicaciones vencidas y próximas" />

          {/* Vencidas first: priority */}
          <div>
            <p className="mb-2 text-sm font-semibold text-rose-600">Vencidas</p>
            <Panel>
              {loading ? (
                <TableSkeleton cols={6} />
              ) : data.vencidas.length === 0 ? (
                <EmptyState icon="check" title="Sin aplicaciones vencidas" description="Todas las aplicaciones sanitarias están al día." />
              ) : (
                <ScrollTable>
                  <table className="min-w-full divide-y divide-slate-100">
                    <TableHead headers={['Animal', 'Producto', 'Tipo', 'Fecha límite', 'Días vencido', 'Veterinario']} />
                    <tbody className="divide-y divide-slate-100">
                      {data.vencidas.map((row) => (
                        <tr key={row.aplicacion_id} className={trHover}>
                          <td className={td}>{animalLabel(row.animal_arete, row.animal_nombre, row.animal_id)}</td>
                          <td className={td}>{row.producto}</td>
                          <td className={td}>{row.tipo_producto ?? '—'}</td>
                          <td className={td}>{formatDate(row.proxima_fecha)}</td>
                          <td className={`${td} font-semibold ${urgencyTextClasses(row.dias_atraso, 'vencido')}`}>
                            {formatNumber(row.dias_atraso)} día(s)
                          </td>
                          <td className={td}>{row.veterinario ?? 'Sin asignar'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </ScrollTable>
              )}
            </Panel>
          </div>

          {/* Próximas */}
          <div>
            <p className="mb-2 text-sm font-semibold text-emerald-600">Próximas</p>
            <Panel>
              {loading ? (
                <TableSkeleton cols={6} />
              ) : data.proximas.length === 0 ? (
                <EmptyState icon="calendar" title="Sin aplicaciones próximas" description="No hay aplicaciones sanitarias programadas por ahora." />
              ) : (
                <ScrollTable>
                  <table className="min-w-full divide-y divide-slate-100">
                    <TableHead headers={['Animal', 'Producto', 'Tipo', 'Fecha', 'Días restantes', 'Veterinario']} />
                    <tbody className="divide-y divide-slate-100">
                      {data.proximas.map((row) => (
                        <tr key={row.aplicacion_id} className={trHover}>
                          <td className={td}>{animalLabel(row.animal_arete, row.animal_nombre, row.animal_id)}</td>
                          <td className={td}>{row.producto}</td>
                          <td className={td}>{row.tipo_producto ?? '—'}</td>
                          <td className={td}>{formatDate(row.proxima_fecha)}</td>
                          <td className={`${td} font-semibold ${urgencyTextClasses(row.dias_restantes, 'restante')}`}>
                            {formatNumber(row.dias_restantes)} día(s)
                          </td>
                          <td className={td}>{row.veterinario ?? 'Sin asignar'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </ScrollTable>
              )}
            </Panel>
          </div>
        </section>

        {/* 4. HEALTH STATUS */}
        <section aria-labelledby="salud-heading" id="estado-sanitario" className="space-y-6">
          <SectionHeading icon="thermometer" title="Estado sanitario" subtitle="Enfermedades y tratamientos activos" />

          <div>
            <p className="mb-2 text-sm font-semibold text-orange-600">Enfermedades activas</p>
            <Panel>
              {loading ? (
                <TableSkeleton cols={5} />
              ) : data.enfermedades.length === 0 ? (
                <EmptyState icon="check" title="Sin enfermedades activas" description="No hay animales bajo seguimiento clínico en este momento." />
              ) : (
                <ScrollTable>
                  <table className="min-w-full divide-y divide-slate-100">
                    <TableHead headers={['Animal', 'Enfermedad', 'Fecha inicio', 'Estado', 'Días de evolución']} />
                    <tbody className="divide-y divide-slate-100">
                      {data.enfermedades.map((row) => (
                       <tr key={row.enfermedad_id} className={trHover}>
                          <td className={td}>{animalLabel(row.animal_arete, row.animal_nombre, row.animal_id)}</td>
                          <td className={td}>{row.enfermedad}</td>
                          <td className={td}>{formatDate(row.fecha_inicio)}</td>
                          <td className={td}>
                            <Badge estado={row.estado} />
                          </td>
                          <td className={td}>{formatNumber(row.dias_desde_inicio)} día(s)</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </ScrollTable>
              )}
            </Panel>
          </div>

          <div>
            <p className="mb-2 text-sm font-semibold text-purple-600">Tratamientos activos</p>
            <Panel>
              {loading ? (
                <TableSkeleton cols={6} />
              ) : data.tratamientos.length === 0 ? (
                <EmptyState icon="check" title="Sin tratamientos activos" description="No hay tratamientos pendientes o en curso." />
              ) : (
                <ScrollTable>
                  <table className="min-w-full divide-y divide-slate-100">
                    <TableHead headers={['Animal', 'Enfermedad', 'Producto', 'Inicio', 'Fin', 'Estado']} />
                    <tbody className="divide-y divide-slate-100">
                      {data.tratamientos.map((row) => (
                        <tr key={row.tratamiento_id} className={trHover}>
                          <td className={td}>{animalLabel(row.animal_arete, row.animal_nombre, row.animal_id)}</td>
                          <td className={td}>{row.enfermedad}</td>
                          <td className={td}>{row.producto}</td>
                          <td className={td}>{formatDate(row.fecha_inicio)}</td>
                          <td className={td}>{formatDate(row.fecha_fin)}</td>
                          <td className={td}>
                            <Badge estado={row.estado_tratamiento} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </ScrollTable>
              )}
            </Panel>
          </div>
        </section>

        {/* 5. INVENTORY */}
        <section aria-labelledby="inventario-heading" id="inventario" className="space-y-6">
          <SectionHeading icon="box" title="Inventario sanitario" subtitle="Stock bajo y productos por vencer" />

          <div>
            <p className="mb-2 text-sm font-semibold text-rose-600">Stock bajo</p>
            <Panel>
              {loading ? (
                <TableSkeleton cols={6} />
              ) : data.stockBajo.length === 0 ? (
                <EmptyState icon="check" title="Sin alertas de stock" description="Todos los productos tienen existencias suficientes." />
              ) : (
                <ScrollTable>
                  <table className="min-w-full divide-y divide-slate-100">
                    <TableHead headers={['Producto', 'Lote', 'Cantidad', 'Vencimiento', 'Ubicación', 'Estado']} />
                    <tbody className="divide-y divide-slate-100">
                      {data.stockBajo.map((row) => (
                        <tr key={row.inventario_id} className={trHover}>
                          <td className={td}>{row.producto}</td>
                          <td className={td}>{row.numero_lote ?? '—'}</td>
                          <td className={`${td} font-semibold text-rose-600`}>{formatNumber(row.cantidad)}</td>
                          <td className={td}>{formatDate(row.fecha_vencimiento)}</td>
                          <td className={td}>
                            <span className="inline-flex items-center gap-1">
                              <Icon name="mapPin" className="h-3.5 w-3.5 text-slate-400" />
                              {row.ubicacion ?? '—'}
                            </span>
                          </td>
                          <td className={td}>
                            <Badge estado={row.estado} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </ScrollTable>
              )}
            </Panel>
          </div>

          <div>
            <p className="mb-2 text-sm font-semibold text-amber-600">Por vencer</p>
            <Panel>
              {loading ? (
                <TableSkeleton cols={6} />
              ) : data.porVencer.length === 0 ? (
                <EmptyState icon="check" title="Sin productos por vencer" description="No hay lotes próximos a vencer en el inventario." />
              ) : (
                <ScrollTable>
                  <table className="min-w-full divide-y divide-slate-100">
                    <TableHead headers={['Producto', 'Lote', 'Cantidad', 'Vencimiento', 'Ubicación', 'Estado']} />
                    <tbody className="divide-y divide-slate-100">
                      {data.porVencer.map((row) => (
                        <tr key={row.inventario_id} className={trHover}>
                          <td className={td}>{row.producto}</td>
                          <td className={td}>{row.numero_lote ?? '—'}</td>
                          <td className={td}>{formatNumber(row.cantidad)}</td>
                          <td className={`${td} font-semibold text-amber-600`}>{formatDate(row.fecha_vencimiento)}</td>
                          <td className={td}>
                            <span className="inline-flex items-center gap-1">
                              <Icon name="mapPin" className="h-3.5 w-3.5 text-slate-400" />
                              {row.ubicacion ?? '—'}
                            </span>
                          </td>
                          <td className={td}>
                            <Badge estado={row.estado} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </ScrollTable>
              )}
            </Panel>
          </div>
        </section>

        {/* 6. CAMPAIGNS */}
        <section aria-labelledby="campanas-heading" id="campanas">
          <SectionHeading icon="flag" title="Campañas sanitarias" subtitle="Cobertura por campaña" />
          <Panel>
            {loading ? (
              <TableSkeleton cols={6} />
            ) : data.campanas.length === 0 ? (
              <EmptyState icon="flag" title="Sin campañas registradas" description="Aún no hay campañas sanitarias con animales asociados." />
            ) : (
              <ScrollTable>
                <table className="min-w-full divide-y divide-slate-100">
                  <TableHead headers={['Campaña', 'Estado', 'Total', 'Aplicados', 'Pendientes', 'Cobertura']} />
                  <tbody className="divide-y divide-slate-100">
                    {data.campanas.map((row) => {
                      const pct = row.porcentaje_cobertura ?? 0;
                      return (
                        <tr key={row.campana_id} className={trHover}>
                          <td className={td}>{row.nombre}</td>
                          <td className={td}>
                            <Badge estado={row.estado} />
                          </td>
                          <td className={td}>{formatNumber(row.total_animales)}</td>
                          <td className={td}>{formatNumber(row.aplicados)}</td>
                          <td className={td}>{formatNumber(row.pendientes)}</td>
                          <td className={`${td} w-48`}>
                            <div className="flex items-center gap-2">
                              <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                                <div
                                  className="h-2 rounded-full bg-gradient-to-r from-green-500 to-emerald-500"
                                  style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
                                />
                              </div>
                              <span className="w-10 shrink-0 text-right text-xs font-semibold text-slate-600">
                                {pct.toFixed(0)}%
                              </span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </ScrollTable>
            )}
          </Panel>
        </section>

        {/* 7. QUICK ACTIONS */}
        <section aria-labelledby="acciones-heading" id="acciones">
          <SectionHeading icon="clipboard" title="Accesos rápidos" subtitle="Continúa la gestión sanitaria" />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {QUICK_ACTIONS.map((action) => (
              <QuickActionCard key={action.href} action={action} />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
