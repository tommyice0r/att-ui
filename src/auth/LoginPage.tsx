import { useState } from "react";
import { motion } from "framer-motion";
import { Bot, KeyRound, AlertTriangle, Clock } from "lucide-react";
import { activateAccess, saveSession } from "./authApi";
import type { AuthSession } from "./authTypes";

const APP_NAME    = import.meta.env["VITE_APP_NAME"]    ?? "ATT BOT";
const APP_VERSION = import.meta.env["VITE_APP_VERSION"] ?? "V6.0";
const APP_AUTHOR  = import.meta.env["VITE_APP_AUTHOR"]  ?? "@Tommyice0";

interface Props {
  onSuccess:       (session: AuthSession) => void;
  onBlocked:       (session: AuthSession) => void;
  expiredMessage?: string;
}

export default function LoginPage({ onSuccess, onBlocked, expiredMessage }: Props) {
  const [accessKey, setAccessKey] = useState("");
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!accessKey.trim()) { setError("Ingresa tu clave de acceso."); return; }
    setError("");
    setLoading(true);

    try {
      const resp = await activateAccess({ accessKey: accessKey.trim().toUpperCase() });

      if (resp.accessStatus === "BLOCKED" || resp.accessStatus === "INVALID") {
        onBlocked({
          token:         resp.token ?? "",
          accessId:      resp.accessId,
          clientName:    resp.clientName,
          accessKey:     resp.accessKey,
          appCode:       resp.appCode,
          accessStatus:  resp.accessStatus,
          expiresAt:     resp.expiresAt,
          overdueDays:   resp.overdueDays,
          lateFeePerDay: resp.lateFeePerDay,
          lateFeeAmount: resp.lateFeeAmount,
          currency:      resp.currency,
          message:       resp.message,
          verifiedAt:    new Date().toISOString(),
        });
        return;
      }

      const session = saveSession(resp);
      onSuccess(session);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex selection:bg-violet-500/30">

      {/* ── Panel izquierdo — identidad ──────────────────────── */}
      <div className="hidden lg:flex lg:w-[44%] relative overflow-hidden flex-col items-center justify-center p-14 bg-gradient-to-br from-[#0f0820] via-[#0a0618] to-[#070510]">
        {/* Glow radial */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_55%_at_50%_45%,rgba(109,40,217,0.14)_0%,transparent_100%)] pointer-events-none" />
        {/* Orbs decorativos */}
        <div className="absolute top-[30%] left-[25%] w-72 h-72 bg-violet-700/[0.07] rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-[25%] right-[28%] w-52 h-52 bg-purple-700/[0.05] rounded-full blur-2xl pointer-events-none" />
        {/* Separador sutil */}
        <div className="absolute inset-y-0 right-0 w-px bg-gradient-to-b from-transparent via-violet-500/[0.08] to-transparent" />

        <div className="relative z-10 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.88 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.55, ease: "easeOut" }}
            className="inline-flex p-4 rounded-2xl bg-violet-500/[0.1] border border-violet-500/[0.18] mb-8 shadow-[0_0_48px_rgba(109,40,217,0.14)]"
          >
            <Bot className="text-violet-400" size={40} />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.12, ease: "easeOut" }}
          >
            <h1 className="text-4xl font-semibold text-white tracking-tight mb-3">{APP_NAME}</h1>
            <span className="inline-flex px-2.5 py-1 rounded-md text-[10px] font-bold bg-violet-500/[0.13] border border-violet-500/[0.22] text-violet-300/90 tracking-widest uppercase mb-8">
              {APP_VERSION}
            </span>
            <p className="text-slate-600 text-sm leading-relaxed max-w-[260px] mx-auto">
              Panel operativo de acceso restringido.<br />Solo usuarios autorizados.
            </p>
          </motion.div>
        </div>

        <p className="absolute bottom-8 text-slate-800 text-[11px]">By {APP_AUTHOR}</p>
      </div>

      {/* ── Panel derecho — formulario ───────────────────────── */}
      <div className="flex-1 bg-gradient-to-br from-[#08080f] via-[#0b0b1a] to-[#08080f] flex items-center justify-center p-8">
        <motion.div
          initial={{ opacity: 0, x: 18 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="w-full max-w-sm"
        >
          {/* Logo móvil */}
          <div className="flex flex-col items-center mb-10 lg:hidden">
            <div className="inline-flex p-3 rounded-2xl bg-violet-500/[0.1] border border-violet-500/[0.18] mb-4 shadow-[0_0_32px_rgba(109,40,217,0.12)]">
              <Bot className="text-violet-400" size={28} />
            </div>
            <h1 className="text-xl font-semibold text-white tracking-tight mb-1.5">{APP_NAME}</h1>
            <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-violet-500/[0.13] border border-violet-500/[0.22] text-violet-300/90 tracking-widest uppercase">
              {APP_VERSION}
            </span>
          </div>

          {/* Título */}
          <div className="mb-8">
            <h2 className="text-2xl font-semibold text-white tracking-tight mb-1.5">Activar acceso</h2>
            <p className="text-slate-600 text-sm">Introduce tu clave para continuar.</p>
          </div>

          {/* Sesión expirada */}
          {expiredMessage && !error && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-5 flex items-center gap-3 px-3.5 py-2.5 rounded-xl bg-amber-500/[0.07] border border-amber-500/[0.13] text-amber-300/80 text-xs"
            >
              <Clock size={13} className="shrink-0" />
              {expiredMessage}
            </motion.div>
          )}

          {/* Error */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-5 flex items-center gap-3 px-3.5 py-2.5 rounded-xl bg-rose-500/[0.07] border border-rose-500/[0.13] text-rose-300/80 text-xs"
            >
              <AlertTriangle size={13} className="shrink-0" />
              {error}
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="relative">
              <KeyRound
                size={14}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-700 pointer-events-none"
              />
              <input
                className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-4 py-3 pl-10 text-slate-200 placeholder-slate-700 font-mono tracking-widest uppercase focus:outline-none focus:ring-1 focus:ring-violet-500/30 focus:border-violet-500/25 transition-all duration-200 text-sm disabled:opacity-50"
                placeholder="CLAVE DE ACCESO"
                value={accessKey}
                onChange={(e) => setAccessKey(e.target.value.toUpperCase())}
                autoComplete="off"
                spellCheck={false}
                disabled={loading}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full text-white rounded-xl px-5 py-3 flex items-center justify-center gap-2.5 text-sm font-medium bg-gradient-to-br from-violet-600 to-purple-700 hover:from-violet-500 hover:to-purple-600 shadow-lg shadow-violet-900/30 hover:shadow-violet-900/40 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Verificando acceso...
                </>
              ) : (
                <>
                  <KeyRound size={15} />
                  Activar acceso
                </>
              )}
            </button>
          </form>

          <p className="text-center text-slate-800 text-xs mt-8">Panel operativo privado</p>
        </motion.div>
      </div>
    </div>
  );
}
