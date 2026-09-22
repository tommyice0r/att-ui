import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, CalendarX, CheckCircle, LogOut, XCircle } from "lucide-react";
import LoginPage from "./LoginPage";
import { loadSession, clearSession } from "./authApi";
import type { AuthSession } from "./authTypes";

const APP_AUTHOR = import.meta.env["VITE_APP_AUTHOR"] ?? "@Tommyice0";

const SESSION_RECHECK_HOURS  = 6;
const GRACE_DAYS_TOTAL       = 3;
const EXCEPTION_MODAL_SECONDS = 120;

interface Props {
  children: React.ReactNode;
}

type GateState = "checking" | "login" | "active" | "grace" | "exception" | "blocked";

/* ── Helpers ────────────────────────────────────────────────── */

function formatDate(iso: string): string {
  const d  = new Date(iso);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${d.getFullYear()}`;
}

function formatCountdown(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function calcDaysRemaining(expiresAt: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const exp = new Date(expiresAt);
  exp.setHours(0, 0, 0, 0);
  return Math.max(0, Math.floor((exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));
}

function graceRemaining(overdueDays: number): number {
  return Math.max(0, GRACE_DAYS_TOTAL - overdueDays);
}

/* ── Componente principal ───────────────────────────────────── */

export default function AuthGate({ children }: Props) {
  const [gateState,      setGateState]      = useState<GateState>("checking");
  const [session,        setSession]        = useState<AuthSession | null>(null);
  const [blocked,        setBlocked]        = useState<AuthSession | null>(null);
  const [expiredMessage, setExpiredMessage] = useState("");
  const [showModal,      setShowModal]      = useState(false);
  const [countdown,      setCountdown]      = useState(EXCEPTION_MODAL_SECONDS);

  const intervalRef  = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function isSessionExpired(s: AuthSession): boolean {
    const elapsedMs = Date.now() - new Date(s.verifiedAt).getTime();
    return elapsedMs > SESSION_RECHECK_HOURS * 60 * 60 * 1000;
  }

  function forceReLogin(msg: string) {
    if (intervalRef.current)  clearInterval(intervalRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);
    clearSession();
    setSession(null);
    setBlocked(null);
    setShowModal(false);
    setExpiredMessage(msg);
    setGateState("login");
  }

  function startSessionWatch(s: AuthSession) {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      if (isSessionExpired(s)) forceReLogin("Tu sesión debe verificarse de nuevo.");
    }, 60_000);
  }

  /* Carga de sesión al montar */
  useEffect(() => {
    const saved = loadSession();

    if (!saved) { setGateState("login"); return; }

    if (saved.accessStatus === "BLOCKED" || saved.accessStatus === "INVALID") {
      clearSession();
      setGateState("login");
      return;
    }

    if (isSessionExpired(saved)) {
      clearSession();
      setExpiredMessage("Tu sesión debe verificarse de nuevo.");
      setGateState("login");
      return;
    }

    setSession(saved);
    startSessionWatch(saved);

    if (saved.accessStatus === "GRACE")          setGateState("grace");
    else if (saved.accessStatus === "EXCEPTION") setGateState("exception");
    else                                         setGateState("active");

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  /* Modal obligatorio cuando el estado es EXCEPTION */
  useEffect(() => {
    if (gateState !== "exception") return;

    setShowModal(true);
    setCountdown(EXCEPTION_MODAL_SECONDS);

    if (countdownRef.current) clearInterval(countdownRef.current);
    countdownRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          if (countdownRef.current) clearInterval(countdownRef.current);
          setShowModal(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [gateState]);

  function handleLogout() {
    if (intervalRef.current)  clearInterval(intervalRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);
    clearSession();
    setSession(null);
    setBlocked(null);
    setShowModal(false);
    setExpiredMessage("");
    setGateState("login");
  }

  function handleSuccess(s: AuthSession) {
    setSession(s);
    setExpiredMessage("");
    startSessionWatch(s);
    if (s.accessStatus === "GRACE")          setGateState("grace");
    else if (s.accessStatus === "EXCEPTION") setGateState("exception");
    else                                     setGateState("active");
  }

  function handleBlocked(s: AuthSession) {
    setBlocked(s);
    setGateState("blocked");
  }

  /* ── Carga inicial ─────────────────────────────────────────── */
  if (gateState === "checking") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#08080f] via-[#0c0c1e] to-[#08080f] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <svg className="animate-spin h-6 w-6 text-violet-400/50" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
            <path className="opacity-60" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <span className="text-slate-700 text-xs">Verificando sesión...</span>
        </div>
      </div>
    );
  }

  /* ── Login ─────────────────────────────────────────────────── */
  if (gateState === "login") {
    return (
      <LoginPage
        onSuccess={handleSuccess}
        onBlocked={handleBlocked}
        expiredMessage={expiredMessage}
      />
    );
  }

  /* ── Bloqueado ─────────────────────────────────────────────── */
  if (gateState === "blocked" && blocked) {
    return <BlockedScreen session={blocked} onRetry={handleLogout} />;
  }

  /* ── Dashboard ─────────────────────────────────────────────── */
  return (
    <>
      <AnimatePresence>

        {/* ACTIVE — barra delgada, positiva y premium */}
        {gateState === "active" && session && session.accessStatus === "ACTIVE" && (
          <motion.div
            key="active-bar"
            initial={{ opacity: 0, y: -14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -14 }}
            transition={{ duration: 0.25 }}
            className="sticky top-0 z-50 w-full border-b border-white/[0.05] bg-[#08080f]/95 backdrop-blur-2xl"
          >
            <div className="max-w-6xl mx-auto px-6 py-2 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-1.5">
                  <CheckCircle className="text-emerald-400/70" size={12} />
                  <span className="text-emerald-400/70 text-[11px] font-medium">Acceso activo</span>
                </div>
                <span className="text-white/[0.07]">·</span>
                <span className="text-slate-500 text-[11px]">{session.clientName}</span>
                <span className="text-white/[0.07]">·</span>
                <span className="text-slate-600 text-[11px]">
                  Vence <span className="text-slate-500">{formatDate(session.expiresAt)}</span>
                </span>
                {calcDaysRemaining(session.expiresAt) <= 7 && (
                  <>
                    <span className="text-white/[0.07]">·</span>
                    <span className="text-amber-400/60 text-[11px]">
                      {calcDaysRemaining(session.expiresAt)} día(s)
                    </span>
                  </>
                )}
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 text-slate-700 hover:text-slate-400 text-[11px] transition-colors shrink-0"
              >
                <LogOut size={11} />
                Salir
              </button>
            </div>
          </motion.div>
        )}

        {/* GRACE — advertencia de pago pendiente */}
        {gateState === "grace" && session && session.accessStatus === "GRACE" && (
          <motion.div
            key="grace-banner"
            initial={{ opacity: 0, y: -40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -40 }}
            transition={{ duration: 0.35 }}
            className="sticky top-0 z-50 w-full backdrop-blur-2xl bg-gradient-to-r from-amber-950/50 via-[#100e06]/80 to-[#08080f]/90 border-b border-amber-500/[0.18]"
          >
            <div className="max-w-6xl mx-auto px-6 py-4 flex items-start gap-4">
              <div className="shrink-0 p-2 rounded-lg bg-amber-400/[0.09] border border-amber-400/[0.16] mt-0.5">
                <AlertTriangle className="text-amber-400" size={15} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-amber-200/90 font-semibold text-sm mb-1 tracking-tight">
                  Pago pendiente — período de gracia activo
                </p>
                <p className="text-amber-200/50 text-xs leading-relaxed">
                  Cliente: <span className="text-amber-200/75 font-medium">{session.clientName}</span>
                  {" · "}
                  Atraso: <span className="text-amber-200/75 font-medium">{session.overdueDays} día(s)</span>
                  {" · "}
                  Mora: <span className="text-amber-200/75 font-medium">{session.currency} {session.lateFeeAmount.toLocaleString()}</span>
                </p>
                <div className="flex items-center gap-3 mt-1">
                  {graceRemaining(session.overdueDays) > 0 && (
                    <span className="text-amber-400/40 text-xs">
                      Gracia restante:{" "}
                      <strong className="text-amber-400/60">{graceRemaining(session.overdueDays)} día(s)</strong>
                    </span>
                  )}
                  <div className="flex items-center gap-1 text-amber-400/30 text-xs">
                    <CalendarX size={10} />
                    <span>Venció el {formatDate(session.expiresAt)}</span>
                  </div>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-400/[0.07] border border-amber-400/[0.14] text-amber-300/60 hover:text-amber-200 hover:bg-amber-400/[0.12] text-xs font-medium transition-all"
              >
                <LogOut size={12} />
                Salir
              </button>
            </div>
          </motion.div>
        )}

        {/* EXCEPTION — acceso temporal por excepción manual */}
        {gateState === "exception" && session && session.accessStatus === "EXCEPTION" && (
          <motion.div
            key="exception-banner"
            initial={{ opacity: 0, y: -40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -40 }}
            transition={{ duration: 0.35 }}
            className="sticky top-0 z-50 w-full backdrop-blur-2xl bg-gradient-to-r from-orange-950/50 via-[#100806]/80 to-[#08080f]/90 border-b border-orange-500/[0.18]"
          >
            <div className="max-w-6xl mx-auto px-6 py-4 flex items-start gap-4">
              <div className="shrink-0 p-2 rounded-lg bg-orange-500/[0.09] border border-orange-500/[0.16] mt-0.5">
                <AlertTriangle className="text-orange-400" size={15} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-orange-200/90 font-semibold text-sm mb-1 tracking-tight">
                  Acceso temporal — excepción manual
                </p>
                <p className="text-orange-200/50 text-xs leading-relaxed">
                  Cliente: <span className="text-orange-200/75 font-medium">{session.clientName}</span>
                  {" · "}
                  Atraso: <span className="text-orange-200/75 font-medium">{session.overdueDays} día(s)</span>
                  {" · "}
                  Mora: <span className="text-orange-200/75 font-medium">{session.currency} {session.lateFeeAmount.toLocaleString()}</span>
                </p>
                <p className="text-orange-400/35 text-xs mt-1">
                  {session.manualAllowUntil != null && (
                    <>
                      Válido hasta:{" "}
                      <strong className="text-orange-400/55">{formatDate(session.manualAllowUntil)}</strong>
                      {" · "}
                    </>
                  )}
                  {session.manualAllowReason != null && (
                    <span className="text-orange-400/30">Motivo: {session.manualAllowReason}</span>
                  )}
                </p>
              </div>
              <button
                onClick={handleLogout}
                className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-orange-500/[0.07] border border-orange-500/[0.14] text-orange-300/60 hover:text-orange-200 hover:bg-orange-500/[0.12] text-xs font-medium transition-all"
              >
                <LogOut size={12} />
                Salir
              </button>
            </div>
          </motion.div>
        )}

      </AnimatePresence>

      {/* Modal obligatorio EXCEPTION — bloquea 2 minutos, no se puede cerrar */}
      {gateState === "exception" && showModal && session && session.accessStatus === "EXCEPTION" && (
        <ExceptionModal session={session} countdown={countdown} />
      )}

      {children}
    </>
  );
}

/* ── Modal de excepción ─────────────────────────────────────── */
function ExceptionModal({ session, countdown }: { session: AuthSession; countdown: number }) {
  return (
    <div className="fixed inset-0 z-[100] bg-[#08080f]/90 backdrop-blur-sm flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 14 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.32, ease: "easeOut" }}
        className="w-full max-w-md"
      >
        <div className="rounded-2xl border border-orange-500/[0.18] bg-[#0e0a08] shadow-[0_0_60px_rgba(249,115,22,0.07)] overflow-hidden">
          {/* Barra de progreso */}
          <div className="h-[2px] bg-white/[0.03] w-full">
            <div
              className="h-full bg-gradient-to-r from-orange-600 to-orange-400 transition-all duration-1000 ease-linear"
              style={{ width: `${(countdown / EXCEPTION_MODAL_SECONDS) * 100}%` }}
            />
          </div>

          <div className="p-8">
            <div className="flex items-start gap-4 mb-6">
              <div className="shrink-0 p-2.5 rounded-xl bg-orange-500/[0.09] border border-orange-500/[0.18]">
                <AlertTriangle className="text-orange-400" size={20} />
              </div>
              <div>
                <h2 className="text-white font-semibold text-base tracking-tight">
                  Aviso de pago pendiente
                </h2>
                <p className="text-slate-600 text-xs mt-0.5">
                  Acceso temporal por excepción manual
                </p>
              </div>
            </div>

            <div className="space-y-2 mb-7 text-slate-500 text-sm leading-relaxed">
              <p>Tu acceso fue habilitado temporalmente por excepción.</p>
              <p>
                Tienes{" "}
                <span className="text-orange-300/80 font-medium">{session.overdueDays}</span>{" "}
                día(s) de atraso.
              </p>
              <p>
                Mora acumulada:{" "}
                <span className="text-orange-300/80 font-medium">
                  {session.currency} {session.lateFeeAmount.toLocaleString()}
                </span>.
              </p>
              <p>Regulariza el pago para evitar el bloqueo definitivo.</p>
            </div>

            <div className="flex items-center justify-between pt-5 border-t border-white/[0.04]">
              <p className="text-slate-600 text-xs">
                Podrás continuar en{" "}
                <span className="text-orange-300/80 font-mono font-semibold tabular-nums">
                  {formatCountdown(countdown)}
                </span>
              </p>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-orange-400/70 animate-pulse" />
                <span className="text-orange-400/40 text-[10px] uppercase tracking-widest font-semibold">
                  Espera
                </span>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

/* ── Pantalla bloqueado ─────────────────────────────────────── */
function BlockedScreen({ session, onRetry }: { session: AuthSession; onRetry: () => void }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#08080f] via-[#0c0c1e] to-[#08080f] flex items-center justify-center p-6 selection:bg-violet-500/30">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-md"
      >
        <div className="rounded-2xl border border-rose-500/[0.12] bg-rose-500/[0.04] backdrop-blur-2xl p-10 shadow-[0_8px_40px_rgba(0,0,0,0.5)] text-center">
          <XCircle className="text-rose-400/70 mx-auto mb-5" size={44} />
          <h2 className="text-xl font-semibold text-white mb-2 tracking-tight">Acceso bloqueado</h2>
          <p className="text-slate-500 text-sm mb-8 leading-relaxed">
            {session.message || "Acceso bloqueado por atraso de pago."}<br />
            <span className="text-slate-700 text-xs">Regulariza el pago para recuperar el acceso.</span>
          </p>

          <div className="space-y-2 mb-8 text-left">
            {session.clientName ? (
              <div className="flex justify-between items-center px-4 py-3 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                <span className="text-slate-600 text-xs">Titular</span>
                <span className="text-slate-300 font-medium text-sm">{session.clientName}</span>
              </div>
            ) : null}
            <div className="flex justify-between items-center px-4 py-3 rounded-xl bg-white/[0.02] border border-white/[0.05]">
              <span className="text-slate-600 text-xs">Días de atraso</span>
              <span className="text-rose-400/80 font-semibold text-sm">{session.overdueDays} días</span>
            </div>
            <div className="flex justify-between items-center px-4 py-3 rounded-xl bg-white/[0.02] border border-white/[0.05]">
              <span className="text-slate-600 text-xs">Mora acumulada</span>
              <span className="text-rose-400/80 font-semibold text-sm">
                {session.currency} {session.lateFeeAmount.toLocaleString()}
              </span>
            </div>
          </div>

          <button
            onClick={onRetry}
            className="text-slate-600 hover:text-slate-400 text-xs transition-colors underline underline-offset-4"
          >
            Ingresar otra clave de acceso
          </button>
        </div>

        <p className="text-center text-slate-800 text-xs mt-5">By {APP_AUTHOR}</p>
      </motion.div>
    </div>
  );
}
