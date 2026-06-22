"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import { useRouter } from "next/navigation";
import { registrarAuditoria } from "../../lib/auditoria";

const BG_IMAGE =
  "https://res.cloudinary.com/dv1gz4eqo/image/upload/v1781900797/fondologin_qhbkjf.jpg";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // ---- Spotlight + parallax pointer tracking ----
  const stageRef = useRef<HTMLDivElement>(null);
  const [pointer, setPointer] = useState({ x: 50, y: 50 }); // percentage
  const [tilt, setTilt] = useState({ x: 0, y: 0 }); // degrees, very subtle
  const [hasPointer, setHasPointer] = useState(false);
  const rafId = useRef<number | null>(null);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    const stage = stageRef.current;
    if (!stage) return;

    const rect = stage.getBoundingClientRect();
    const xPct = ((e.clientX - rect.left) / rect.width) * 100;
    const yPct = ((e.clientY - rect.top) / rect.height) * 100;

    if (rafId.current) cancelAnimationFrame(rafId.current);
    rafId.current = requestAnimationFrame(() => {
      setPointer({ x: xPct, y: yPct });
      // very light parallax, capped so it stays "sutil"
      setTilt({
        x: (yPct - 50) / 50, // -1..1
        y: (xPct - 50) / 50,
      });
    });
  }, []);

  const handlePointerLeave = useCallback(() => {
    setHasPointer(false);
  }, []);

  const handlePointerEnter = useCallback(() => {
    setHasPointer(true);
  }, []);

  useEffect(() => {
    return () => {
      if (rafId.current) cancelAnimationFrame(rafId.current);
    };
  }, []);

  // ---- Auth logic (unchanged behavior) ----
  async function iniciarSesion() {
    if (loading) return;
  
    setErrorMsg("");
    setLoading(true);
  
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
  
  if (error) {

    await registrarAuditoria(
      "SIN_ID",
      email,
      "LOGIN_ERROR",
      "LOGIN",
      "Credenciales incorrectas o error de autenticación"
    );

  setLoading(false);
  setErrorMsg(error.message);
  return;
}

const { data: usuario, error: usuarioError } = await supabase
  .from("usuarios")
  .select("*")
  .eq("id", data.user.id)
  .single();

if (usuarioError || !usuario) {
  setLoading(false);
  setErrorMsg("No se encontró el usuario.");
  return;
}
  
    if (!usuario?.activo) {

      await registrarAuditoria(
        data.user.id,
        usuario.nombre,
        "LOGIN_USUARIO_INACTIVO",
        "LOGIN",
        "Intento de acceso con usuario inactivo"
      );
    
      await supabase.auth.signOut();
    
      setLoading(false);
      setErrorMsg("Tu usuario se encuentra inactivo. Contacta al administrador.");
      return;
    }
  
    setLoading(false);

    localStorage.setItem(
      "usuario",
      JSON.stringify(usuario)
    );
    
    await registrarAuditoria(
      data.user.id,
      usuario.nombre,
      "LOGIN_EXITOSO",
      "LOGIN",
      "Usuario inició sesión correctamente"
    );
    
    router.push("/");
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    iniciarSesion();
  }

  return (
    <main
      ref={stageRef}
      onPointerMove={handlePointerMove}
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
      className="relative min-h-screen w-full overflow-hidden bg-[#06140D] flex items-center justify-center"
      style={
        {
          "--mx": `${pointer.x}%`,
          "--my": `${pointer.y}%`,
        } as React.CSSProperties
      }
    >
      {/* ---------- Background photo (cover, parallax) ---------- */}
      <div
        aria-hidden
        className="absolute inset-0 transition-transform duration-300 ease-out will-change-transform"
        style={{
          backgroundImage: `url(${BG_IMAGE})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          transform: `scale(1.08) translate3d(${tilt.y * -10}px, ${tilt.x * -10}px, 0)`,
        }}
      />

      {/* ---------- Dark veil (65-75% opacity) ---------- */}
      <div
        aria-hidden
        className="absolute inset-0 bg-[#04100A]"
        style={{ opacity: 0.7 }}
      />

      {/* ---------- Spotlight reveal layer ---------- */}
      <div
        aria-hidden
        className="absolute inset-0 transition-opacity duration-500 ease-out mix-blend-overlay"
        style={{
          opacity: hasPointer ? 1 : 0,
          background: `radial-gradient(560px circle at var(--mx) var(--my),
            rgba(255,255,255,0.95) 0%,
            rgba(255,255,255,0.55) 18%,
            rgba(255,255,255,0.18) 38%,
            rgba(255,255,255,0) 65%)`,
        }}
      />
      {/* spotlight color wash + un-darken the photo under the cursor */}
      <div
        aria-hidden
        className="absolute inset-0 transition-opacity duration-500 ease-out"
        style={{
          opacity: hasPointer ? 1 : 0,
          background: `radial-gradient(620px circle at var(--mx) var(--my),
            rgba(6,20,13,0) 0%,
            rgba(6,20,13,0) 30%,
            rgba(6,20,13,0.55) 60%,
            rgba(6,20,13,0.7) 100%)`,
        }}
      />
      {/* soft emerald glow halo, like night-vision lantern */}
      <div
        aria-hidden
        className="absolute inset-0 transition-opacity duration-500 ease-out"
        style={{
          opacity: hasPointer ? 0.35 : 0,
          background: `radial-gradient(420px circle at var(--mx) var(--my),
            rgba(74,222,128,0.25) 0%,
            rgba(74,222,128,0.08) 35%,
            rgba(74,222,128,0) 70%)`,
        }}
      />

      {/* ---------- Ambient particles ---------- */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        {PARTICLES.map((p, i) => (
          <span
            key={i}
            className="absolute rounded-full bg-emerald-200/60 animate-float-particle"
            style={{
              left: `${p.left}%`,
              top: `${p.top}%`,
              width: p.size,
              height: p.size,
              animationDuration: `${p.duration}s`,
              animationDelay: `${p.delay}s`,
              filter: "blur(0.5px)",
            }}
          />
        ))}
      </div>

      {/* ---------- Vignette for cinematic depth ---------- */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(120% 90% at 50% 50%, transparent 40%, rgba(0,0,0,0.55) 100%)",
        }}
      />

      {/* ---------- Login glass panel ---------- */}
      <form
        onSubmit={handleSubmit}
        className="relative z-10 w-[92%] max-w-[400px] mx-4 rounded-[30px] border border-white/15 bg-white/[0.08] backdrop-blur-[36px] shadow-[0_8px_40px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.25),inset_0_-1px_0_rgba(255,255,255,0.05)] px-8 py-10 sm:px-10 sm:py-12"
        style={{
          backgroundImage:
            "linear-gradient(135deg, rgba(255,255,255,0.14) 0%, rgba(255,255,255,0.04) 45%, rgba(255,255,255,0.08) 100%)",
        }}
      >
        {/* inner top sheen */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-24 rounded-t-[30px] opacity-60"
          style={{
            background:
              "linear-gradient(180deg, rgba(255,255,255,0.25) 0%, rgba(255,255,255,0) 100%)",
          }}
        />

        {/* Brand */}
        <div className="relative mb-9 flex flex-col items-center text-center">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-white/20 bg-emerald-400/10 shadow-[0_0_24px_rgba(74,222,128,0.35)]">
            <LeafMark />
          </div>
          <h1 className="text-[26px] font-semibold tracking-tight text-white">
            Gana<span className="text-emerald-300">dero</span>Pro
          </h1>
          <p className="mt-1.5 text-[13px] font-medium tracking-wide text-white/50">
            Gestión ganadera de precisión
          </p>
        </div>

        {/* Email */}
        <label className="relative mb-4 block">
          <span className="mb-1.5 block text-[12px] font-medium uppercase tracking-wider text-white/45">
            Correo
          </span>
          <input
            type="email"
            required
            autoComplete="email"
            placeholder="tucorreo@finca.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-2xl border border-white/15 bg-white/[0.06] px-4 py-3.5 text-[15px] text-white placeholder-white/30 outline-none backdrop-blur-md transition-all duration-300 focus:border-emerald-300/50 focus:bg-white/[0.1] focus:shadow-[0_0_0_4px_rgba(74,222,128,0.12)]"
          />
        </label>

        {/* Password */}
        <label className="relative mb-3 block">
          <span className="mb-1.5 block text-[12px] font-medium uppercase tracking-wider text-white/45">
            Contraseña
          </span>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              required
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-2xl border border-white/15 bg-white/[0.06] px-4 py-3.5 pr-12 text-[15px] text-white placeholder-white/30 outline-none backdrop-blur-md transition-all duration-300 focus:border-emerald-300/50 focus:bg-white/[0.1] focus:shadow-[0_0_0_4px_rgba(74,222,128,0.12)]"
            />
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-white/40 transition-colors hover:text-white/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/60"
            >
              {showPassword ? <EyeOffIcon /> : <EyeIcon />}
            </button>
          </div>
        </label>

        {/* Remember / forgot row */}
        <div className="mb-7 mt-3 flex items-center justify-between">
          <label className="flex cursor-pointer items-center gap-2 text-[13px] text-white/60 select-none">
            <span className="relative inline-flex h-4 w-4 items-center justify-center">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                className="peer absolute inset-0 h-4 w-4 cursor-pointer appearance-none rounded-[5px] border border-white/30 bg-white/10 transition-colors checked:border-emerald-300/70 checked:bg-emerald-400/80"
              />
              <CheckIcon className="pointer-events-none absolute h-3 w-3 scale-0 text-[#06140D] transition-transform peer-checked:scale-100" />
            </span>
            Recordarme
          </label>
          <a
            href="/recuperar-contrasena"
            className="text-[13px] font-medium text-emerald-300/90 transition-colors hover:text-emerald-200 focus:outline-none focus-visible:underline"
          >
            ¿Olvidaste tu contraseña?
          </a>
        </div>

        {/* Error message */}
        {errorMsg && (
          <div className="mb-5 rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-2.5 text-[13px] text-red-200">
            {errorMsg}
          </div>
        )}

        {/* Submit button */}
        <button
          type="submit"
          disabled={loading}
          className="group relative w-full overflow-hidden rounded-2xl border border-emerald-200/30 bg-gradient-to-b from-emerald-400/90 to-emerald-600/90 px-4 py-3.5 text-[15px] font-semibold text-white shadow-[0_4px_24px_rgba(34,197,94,0.4),inset_0_1px_0_rgba(255,255,255,0.4)] transition-all duration-300 ease-out hover:scale-[1.015] hover:shadow-[0_6px_32px_rgba(34,197,94,0.55),inset_0_1px_0_rgba(255,255,255,0.5)] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:scale-100"
        >
          <span
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 h-1/2 rounded-t-2xl bg-gradient-to-b from-white/40 to-transparent"
          />
          <span className="relative flex items-center justify-center gap-2">
            {loading ? (
              <>
                <Spinner />
                Ingresando…
              </>
            ) : (
              "Ingresar"
            )}
          </span>
        </button>

        <p className="mt-7 text-center text-[12px] text-white/35">
          Acceso seguro y cifrado · GanaderoPro © {new Date().getFullYear()}
        </p>
      </form>

      <style jsx global>{`
        @keyframes float-particle {
          0%,
          100% {
            transform: translateY(0) translateX(0);
            opacity: 0.15;
          }
          50% {
            transform: translateY(-18px) translateX(6px);
            opacity: 0.55;
          }
        }
        .animate-float-particle {
          animation-name: float-particle;
          animation-timing-function: ease-in-out;
          animation-iteration-count: infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .animate-float-particle {
            animation: none !important;
          }
          * {
            transition-duration: 0.01ms !important;
          }
        }
      `}</style>
    </main>
  );
}

// ---------------- helpers ----------------

const PARTICLES = Array.from({ length: 16 }).map((_, i) => ({
  left: (i * 37) % 100,
  top: (i * 53) % 100,
  size: 2 + ((i * 7) % 3),
  duration: 6 + ((i * 3) % 6),
  delay: (i % 5) * 0.8,
}));

function LeafMark() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M5 19c8 0 14-6 14-14-8 0-14 6-14 14Z"
        stroke="#86efac"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M5 19c2-5 5-8 10-11"
        stroke="#86efac"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M3 3l18 18M10.6 10.6a3 3 0 0 0 4.24 4.24M9.5 5.1A9.9 9.9 0 0 1 12 5c6.5 0 10 7 10 7a17.6 17.6 0 0 1-3.1 4.05M6.1 6.1A17.7 17.7 0 0 0 2 12s3.5 7 10 7c1.06 0 2.06-.13 3-.37"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      className={className}
      aria-hidden
    >
      <path
        d="M3.5 8.2 6.4 11 12.5 5"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function Spinner() {
  return (
    <svg
      className="h-4 w-4 animate-spin text-white"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="3.5"
      />
      <path
        className="opacity-90"
        fill="currentColor"
        d="M22 12a10 10 0 0 1-10 10V19a7 7 0 0 0 7-7h3Z"
      />
    </svg>
  );
}
