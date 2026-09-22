import { useEffect, useRef, useState } from "react";
import {
  Play, Check, Trash2,
  Settings, Bot, Shield, Network, Users, Target, LogOut, Plus,
  Eye, EyeOff
} from "lucide-react";
import { loadSession, clearSession } from "./auth/authApi";
import { fetchAllLicenses, addLicenseDays, createNewLicense, type LicenseItem } from "./api/adminApi";
import { getHelperApiUrl } from "@/utils/env";

const APP_NAME = import.meta.env["VITE_APP_NAME"] ?? "ATT BOT";
const APP_VERSION = import.meta.env["VITE_APP_VERSION"] ?? "V6.1";

interface Config {
  KEY: string;
  KEYABS: string;
  PROXY_TYPE: string;
  PROXY_SERVER: string;
  PROXY_PORT: string;
  PROXY_USER: string;
  PROXY_PASS: string;
  PROXY_TYPE_2: string;
  PROXY_SERVER_2: string;
  PROXY_PORT_2: string;
  PROXY_USER_2: string;
  PROXY_PASS_2: string;
  SECUENCIA: string[];
}

export default function App() {
  const [config, setConfig] = useState<Config>({
    KEY: "", KEYABS: "",
    PROXY_TYPE: "http", PROXY_SERVER: "", PROXY_PORT: "", PROXY_USER: "", PROXY_PASS: "",
    PROXY_TYPE_2: "http", PROXY_SERVER_2: "", PROXY_PORT_2: "", PROXY_USER_2: "", PROXY_PASS_2: "",
    SECUENCIA: []
  });

  const [activeTab, setActiveTab] = useState<"bot" | "admin">("bot");
  const [serverOnline, setServerOnline] = useState(false);
  const [newSequence, setNewSequence] = useState("");
  const [profileCount, setProfileCount] = useState(0);
  const [hitCount, setHitCount] = useState(0);
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving">("saved");
  const [actionMsg, setActionMsg] = useState("");

  // Licencias Admin State
  const [licenses, setLicenses] = useState<LicenseItem[]>([]);
  const [licenseSearch, setLicenseSearch] = useState("");
  const [loadingLicenses, setLoadingLicenses] = useState(false);
  const [showProxyPass2, setShowProxyPass2] = useState(false);

  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const session = loadSession();
  const isMasterUser = Boolean(session?.isMaster);

  const API_URL = getHelperApiUrl();

  // Monitoreo del Servidor Go (ONLINE / OFF)
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const resProf = await fetch(`${API_URL}/CheckProfile`);
        if (resProf.ok) {
          const dataProf = await resProf.json();
          if (dataProf.status === "success") setProfileCount(dataProf.count ?? 0);
        }

        const resHits = await fetch(`${API_URL}/count-hits`);
        if (resHits.ok) {
          const dataHits = await resHits.json();
          if (dataHits.status === "success") setHitCount(dataHits.count ?? 0);
        }

        setServerOnline(true);
      } catch {
        setServerOnline(false);
      }
    };

    fetchStats();
    const interval = setInterval(fetchStats, 15000);
    return () => clearInterval(interval);
  }, [API_URL]);

  // Carga inicial de configuración
  useEffect(() => {
    loadConfigFromServer();
  }, [API_URL]);

  async function loadConfigFromServer() {
    try {
      const res = await fetch(`${API_URL}/config`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setConfig({
        ...data,
        SECUENCIA: Array.isArray(data.SECUENCIA) ? data.SECUENCIA : []
      });
      setServerOnline(true);
    } catch {
      // Servidor local offline
    }
  }

  // Cargar licencias si se entra en la pestaña admin
  useEffect(() => {
    if (activeTab === "admin") {
      if (isMasterUser) {
        loadLicenses();
      } else {
        setActiveTab("bot");
      }
    }
  }, [activeTab, isMasterUser]);

  async function loadLicenses() {
    setLoadingLicenses(true);
    try {
      const data = await fetchAllLicenses();
      setLicenses(data);
    } catch {
      // Ignorar si no hay conexión aún
    } finally {
      setLoadingLicenses(false);
    }
  }

  // Auto-guardado
  function autoSaveConfig(updated: Config) {
    setSaveStatus("saving");
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);

    debounceTimerRef.current = setTimeout(async () => {
      try {
        await fetch(`${API_URL}/config`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updated)
        });
        setSaveStatus("saved");
      } catch {
        setSaveStatus("saved");
      }
    }, 500);
  }

  function updateField(key: keyof Config, value: string) {
    const next = { ...config, [key]: value };
    setConfig(next);
    autoSaveConfig(next);
  }

  function addSequence(seqInput: string) {
    const cleaned = seqInput.trim();
    if (cleaned.length < 3) return;

    if (!config.SECUENCIA.includes(cleaned)) {
      const nextSeqs = [...config.SECUENCIA, cleaned];
      const nextConfig = { ...config, SECUENCIA: nextSeqs };
      setConfig(nextConfig);
      setNewSequence("");
      autoSaveConfig(nextConfig);
    }
  }

  function removeSequence(index: number) {
    const nextSeqs = config.SECUENCIA.filter((_, i) => i !== index);
    const nextConfig = { ...config, SECUENCIA: nextSeqs };
    setConfig(nextConfig);
    autoSaveConfig(nextConfig);
  }

  async function handleClearSequences() {
    if (!window.confirm("¿Limpiar todas las secuencias activas?")) return;
    try {
      await fetch(`${API_URL}/clear-secuencias`, { method: "POST" });
    } catch {
      // Servidor auxiliar offline
    }
    const nextConfig = { ...config, SECUENCIA: [] };
    setConfig(nextConfig);
    autoSaveConfig(nextConfig);
    flashMsg("Secuencias eliminadas.");
  }

  // Operaciones de Bot
  async function handleAction(endpoint: string, message: string, method = "POST") {
    flashMsg(message);
    try {
      await fetch(`${API_URL}${endpoint}`, { method });
    } catch {
      flashMsg("Error al conectar con el servidor auxiliar.");
    }
  }

  async function handleHits() {
    flashMsg("Procesando reporte de hits...");
    try {
      const res = await fetch(`${API_URL}/hits`, { method: "POST" });
      const html = await res.text();
      const blob = new Blob([html], { type: "text/html" });
      window.open(URL.createObjectURL(blob), "_blank");
    } catch {
      flashMsg("No se pudo obtener el reporte de hits.");
    }
  }

  function flashMsg(text: string) {
    setActionMsg(text);
    setTimeout(() => setActionMsg(""), 3500);
  }

  function handleLogout() {
    clearSession();
    window.location.reload();
  }

  async function handleAddDays(accessKey: string, days: number, clientName: string) {
    try {
      await addLicenseDays(accessKey, days);
      flashMsg(`Se agregaron ${days} días a "${clientName}".`);
      loadLicenses();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error al sumar días.");
    }
  }

  async function handleCreateLicense() {
    const name = window.prompt("Nombre del cliente para la nueva licencia:", "Cliente");
    if (!name || !name.trim()) return;

    const daysStr = window.prompt("Días iniciales de vigencia:", "30") || "30";
    const days = parseInt(daysStr, 10);

    try {
      const created = await createNewLicense(name.trim(), isNaN(days) ? 30 : days);
      flashMsg(`Licencia creada para "${name}".`);
      loadLicenses();
      alert(`Licencia generada:\nCliente: ${created.clientName}\nClave: ${created.accessKey}\nVigencia: ${days} días`);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error al crear licencia.");
    }
  }

  const filteredLicenses = licenses.filter(
    (l) =>
      l.clientName.toLowerCase().includes(licenseSearch.toLowerCase()) ||
      l.accessKey.toLowerCase().includes(licenseSearch.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#0b0d11] text-slate-300 flex text-sm selection:bg-amber-500/20 font-sans">

      {/* SIDEBAR IZQUIERDO SOBRIO */}
      <aside className="w-60 bg-[#101318] border-r border-white/[0.06] flex flex-col justify-between shrink-0 p-5 min-h-screen">
        <div className="space-y-6">

          {/* Brand Logo */}
          <div className="flex items-center gap-3 px-1 py-1">
            <div className="w-8 h-8 rounded-lg bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-[#e5a93c]">
              <Bot size={18} />
            </div>
            <div>
              <div className="font-bold text-sm tracking-wider text-white">{APP_NAME}</div>
              <div className="text-[9px] font-semibold text-slate-500 tracking-widest uppercase">{APP_VERSION} SYSTEM</div>
            </div>
          </div>

          {/* Navigation */}
          <div className="space-y-1">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider px-3 mb-2">Panel</div>

            <button
              onClick={() => setActiveTab("bot")}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold transition-all text-left ${
                activeTab === "bot"
                  ? "bg-[#e5a93c]/10 text-[#e5a93c] border border-[#e5a93c]/25"
                  : "text-slate-400 hover:text-white hover:bg-white/[0.02]"
              }`}
            >
              <Settings size={15} className={activeTab === "bot" ? "text-[#e5a93c]" : "text-slate-400"} />
              Operación del Bot
            </button>

            {isMasterUser && (
              <button
                onClick={() => setActiveTab("admin")}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs transition-all text-left ${
                  activeTab === "admin"
                    ? "bg-[#e5a93c]/10 text-[#e5a93c] border border-[#e5a93c]/25 font-semibold"
                    : "text-slate-400 hover:text-white hover:bg-white/[0.02] font-medium"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Shield size={15} className={activeTab === "admin" ? "text-[#e5a93c]" : "text-slate-400"} />
                  Licencias de Clientes
                </div>
                <span className="text-[9px] px-1.5 py-0.2 rounded bg-white/[0.05] border border-white/[0.08] text-slate-300 font-mono">
                  ADMIN
                </span>
              </button>
            )}
          </div>

          {/* Auto-Guardado en Sidebar */}
          <div className="p-3 rounded-xl bg-[#151820] border border-white/[0.06]">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Auto-Guardado</div>
            <div className="flex items-center gap-1.5 text-xs text-[#e5a93c] font-medium">
              <span className={`w-1.5 h-1.5 rounded-full ${saveStatus === "saving" ? "bg-amber-400 animate-ping" : "bg-[#e5a93c]"}`} />
              <span>{saveStatus === "saving" ? "Guardando..." : "Activo"}</span>
            </div>
            <p className="text-[10px] text-slate-500 mt-1">Sincronización en tiempo real.</p>
          </div>
        </div>

        {/* Logout */}
        <div className="pt-4 border-t border-white/[0.06]">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-all"
          >
            <LogOut size={15} />
            Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* CONTENIDO PRINCIPAL */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">

        {/* HEADER SUPERIOR: ONLINE / OFF */}
        <header className="h-14 px-8 flex items-center justify-between border-b border-white/[0.06] bg-[#101318]/70 backdrop-blur-md sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-white">Panel Operativo</span>
            <span className="text-slate-700">•</span>
            {/* Indicador ONLINE / OFF */}
            <div
              className={`flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-mono font-semibold ${
                serverOnline
                  ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400"
                  : "bg-rose-500/10 border border-rose-500/20 text-rose-400"
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${serverOnline ? "bg-emerald-400" : "bg-rose-400"}`} />
              <span>{serverOnline ? "ONLINE" : "OFF"}</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Auto-Save Status Badge */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-white/[0.03] border border-white/[0.08] text-slate-300 text-xs font-medium">
              <span className={`w-1.5 h-1.5 rounded-full ${saveStatus === "saving" ? "bg-amber-400 animate-ping" : "bg-[#e5a93c]"}`} />
              <span>{saveStatus === "saving" ? "Guardando..." : "Sincronizado"}</span>
            </div>

            {/* Licencia Maestra Badge */}
            <div className="flex items-center gap-2 pl-3 border-l border-white/[0.06]">
              <span className="text-xs font-mono font-medium text-slate-300">{session?.clientName || "Administrador"}</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#e5a93c]/15 text-[#e5a93c] border border-[#e5a93c]/30 font-bold uppercase">
                {isMasterUser ? "Root" : "Cliente"}
              </span>
              {!isMasterUser && session?.daysLeft !== undefined && (
                <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono font-semibold">
                  {session.daysLeft}d restantes
                </span>
              )}
            </div>
          </div>
        </header>

        {/* FEEDBACK NOTIFICACIÓN FLOTANTE */}
        {actionMsg && (
          <div className="mx-8 mt-4 px-4 py-2 rounded-lg bg-[#e5a93c]/10 border border-[#e5a93c]/25 text-[#e5a93c] text-xs font-medium flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#e5a93c]" />
            {actionMsg}
          </div>
        )}

        {/* CUERPO PRINCIPAL SEGÚN PESTAÑA */}
        <div className="p-7 space-y-6">

          {/* TAB 1: OPERACIÓN DEL BOT */}
          {activeTab === "bot" && (
            <div className="space-y-6">

              {/* 3 METRIC TILES */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-[#151820] border border-white/[0.06] rounded-xl p-4">
                  <div className="text-xs text-slate-400 flex items-center gap-1.5">
                    <Users size={14} className="text-slate-500" />
                    Cola de Leads
                  </div>
                  <div className="text-2xl font-bold text-white font-mono mt-1">
                    {profileCount.toLocaleString()}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-1">Instancias en espera</div>
                </div>

                <div className="bg-[#151820] border border-white/[0.06] rounded-xl p-4">
                  <div className="text-xs text-slate-400 flex items-center gap-1.5">
                    <Target size={14} className="text-[#e5a93c]" />
                    Hits Detectados
                  </div>
                  <div className="text-2xl font-bold text-[#e5a93c] font-mono mt-1">
                    {hitCount.toLocaleString()}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-1">Confirmados en el sistema</div>
                </div>

                <div className="bg-[#151820] border border-white/[0.06] rounded-xl p-4 flex flex-col justify-between">
                  <div className="text-xs text-slate-400">Reporte de Hits</div>
                  <button
                    onClick={handleHits}
                    className="w-full py-2 rounded-lg bg-white/[0.04] hover:bg-white/[0.07] border border-white/[0.1] text-slate-200 font-semibold text-xs transition-all flex items-center justify-center gap-2"
                  >
                    <Check size={14} className="text-[#e5a93c]" />
                    Ver Reporte de Hits
                  </button>
                </div>
              </div>

              {/* CONTROLES DEL BOT + SECUENCIAS */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">

                {/* BOT OPERATING BUTTONS (4 COLS) */}
                <div className="lg:col-span-4 bg-[#151820] border border-white/[0.06] rounded-2xl p-5 space-y-3">
                  <div className="pb-2 border-b border-white/[0.06]">
                    <h2 className="text-xs font-bold uppercase tracking-wider text-slate-300">Operación</h2>
                  </div>

                  <button
                    onClick={() => handleAction("/Create", "Iniciando bot...", "GET")}
                    className="w-full py-2.5 px-4 rounded-lg bg-[#d49a37] hover:bg-[#e5a93c] text-[#0b0d11] font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-sm transition-all active:scale-[0.99]"
                  >
                    <Play size={14} fill="currentColor" />
                    Iniciar Bot — Depurar
                  </button>

                  <button
                    onClick={() => handleAction("/start-bot", "Iniciando generador de perfiles...")}
                    className="w-full py-2 px-4 rounded-lg bg-[#1a1e27] border border-white/[0.06] hover:border-[#e5a93c]/30 text-slate-200 font-semibold text-xs flex items-center justify-center gap-2 transition-all"
                  >
                    <Play size={14} className="text-[#e5a93c]" />
                    Generar Perfiles
                  </button>

                  <button
                    onClick={handleClearSequences}
                    className="w-full py-2 px-4 rounded-lg bg-rose-500/10 hover:bg-rose-500/15 border border-rose-500/20 text-rose-300 font-medium text-xs flex items-center justify-center gap-2 transition-all"
                  >
                    <Trash2 size={14} />
                    Limpiar Secuencias
                  </button>
                </div>

                {/* SECUENCIAS TELEFÓNICAS CON AUTO-GUARDADO (8 COLS) */}
                <div className="lg:col-span-8 bg-[#151820] border border-white/[0.06] rounded-2xl p-5 space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
                    <div>
                      <h2 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                        Secuencias Telefónicas (NPA-NXX)
                      </h2>
                      <p className="text-[11px] text-slate-500">
                        Escribe 6 dígitos o presiona Enter para agregar. Se guarda automáticamente.
                      </p>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[11px] font-mono font-semibold bg-[#e5a93c]/10 text-[#e5a93c] border border-[#e5a93c]/25">
                      {config.SECUENCIA.length} secuencias
                    </span>
                  </div>

                  {/* Input rápido */}
                  <div className="flex gap-2">
                    <input
                      id="inp-seq"
                      maxLength={6}
                      value={newSequence}
                      onChange={(e) => {
                        const val = e.target.value.trim();
                        setNewSequence(val);
                        if (val.length === 6) addSequence(val);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") addSequence(newSequence);
                      }}
                      placeholder="Ej: 407234..."
                      className="flex-1 bg-[#0d1015] border border-white/[0.06] rounded-lg px-3 py-2 text-xs text-white font-mono placeholder-slate-600 focus:outline-none focus:border-[#e5a93c]/50 transition-all"
                    />
                    <button
                      onClick={() => addSequence(newSequence)}
                      className="px-4 py-2 bg-[#d49a37] hover:bg-[#e5a93c] text-[#0b0d11] font-bold rounded-lg text-xs transition-all"
                    >
                      Agregar
                    </button>
                  </div>

                  {/* Badges de Secuencias */}
                  <div className="p-3 rounded-xl bg-[#0d1015] border border-white/[0.06] min-h-[75px] flex flex-wrap gap-2 items-start max-h-40 overflow-y-auto">
                    {config.SECUENCIA.length === 0 ? (
                      <span className="text-xs text-slate-600 italic py-1">No hay secuencias activas.</span>
                    ) : (
                      config.SECUENCIA.map((s, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#151820] border border-white/[0.06] text-slate-200 font-mono text-xs font-semibold group hover:border-[#e5a93c]/40 transition-all"
                        >
                          <span>{s}</span>
                          <button
                            onClick={() => removeSequence(idx)}
                            className="text-slate-500 hover:text-rose-400 ml-1 font-bold"
                          >
                            ×
                          </button>
                        </span>
                      ))
                    )}
                  </div>
                </div>

              </div>

              {/* CLAVES & PROXIES CON AUTO-GUARDADO */}
              <div className="bg-[#151820] border border-white/[0.06] rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
                  <div>
                    <h2 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                      Configuración de Claves & Proxies
                    </h2>
                    <p className="text-[11px] text-slate-500">Cualquier cambio se guarda automáticamente.</p>
                  </div>
                </div>

                {/* Claves Principales */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] text-slate-400 mb-1 block">Clave Principal</label>
                    <input
                      value={config.KEY}
                      onChange={(e) => updateField("KEY", e.target.value)}
                      placeholder="Clave del servicio"
                      className="w-full bg-[#0d1015] border border-white/[0.06] rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-[#e5a93c]/40 font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-400 mb-1 block">Clave GoLogin (KEYABS)</label>
                    <input
                      value={config.KEYABS}
                      onChange={(e) => updateField("KEYABS", e.target.value)}
                      placeholder="API Key GoLogin"
                      className="w-full bg-[#0d1015] border border-white/[0.06] rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-[#e5a93c]/40 font-mono"
                    />
                  </div>
                </div>

                {/* Proxy Generador de Leads */}
                <div className="pt-2 border-t border-white/[0.04]">
                  <div className="p-3.5 rounded-xl bg-[#0d1015] border border-white/[0.06] space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                        <Network size={13} className="text-[#e5a93c]" />
                        Proxy Generador de Leads (ZabaSearch)
                      </div>
                      <span className="text-[10px] text-slate-500 font-mono">
                        Consumido por GENERARPERFILES
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-2">
                      <div>
                        <label className="text-[10px] text-slate-400 mb-1 block">Tipo</label>
                        <input
                          value={config.PROXY_TYPE_2}
                          onChange={(e) => updateField("PROXY_TYPE_2", e.target.value)}
                          placeholder="http / socks5"
                          className="w-full bg-[#151820] border border-white/[0.06] rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-[#e5a93c]/40 font-mono"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-400 mb-1 block">Host / Servidor</label>
                        <input
                          value={config.PROXY_SERVER_2}
                          onChange={(e) => updateField("PROXY_SERVER_2", e.target.value)}
                          placeholder="Host o IP"
                          className="w-full bg-[#151820] border border-white/[0.06] rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-[#e5a93c]/40 font-mono"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-400 mb-1 block">Puerto</label>
                        <input
                          value={config.PROXY_PORT_2}
                          onChange={(e) => updateField("PROXY_PORT_2", e.target.value)}
                          placeholder="1000"
                          className="w-full bg-[#151820] border border-white/[0.06] rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-[#e5a93c]/40 font-mono"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-400 mb-1 block">Usuario</label>
                        <input
                          value={config.PROXY_USER_2}
                          onChange={(e) => updateField("PROXY_USER_2", e.target.value)}
                          placeholder="User"
                          className="w-full bg-[#151820] border border-white/[0.06] rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-[#e5a93c]/40"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-400 mb-1 block">Contraseña</label>
                        <div className="relative">
                          <input
                            type={showProxyPass2 ? "text" : "password"}
                            value={config.PROXY_PASS_2}
                            onChange={(e) => updateField("PROXY_PASS_2", e.target.value)}
                            placeholder="Password"
                            className="w-full bg-[#151820] border border-white/[0.06] rounded-lg px-2.5 py-1.5 pr-8 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-[#e5a93c]/40 font-mono"
                          />
                          <button
                            type="button"
                            onClick={() => setShowProxyPass2(!showProxyPass2)}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                            tabIndex={-1}
                          >
                            {showProxyPass2 ? <EyeOff size={13} /> : <Eye size={13} />}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* TAB 2: ADMINISTRACIÓN DE LICENCIAS */}
          {activeTab === "admin" && isMasterUser && (
            <div className="space-y-5">
              <div className="bg-[#151820] border border-white/[0.06] rounded-2xl p-5 space-y-4">
                
                {/* Admin Header */}
                <div className="flex flex-wrap items-center justify-between gap-4 pb-3 border-b border-white/[0.06]">
                  <div>
                    <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                      Administración de Licencias
                    </h2>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Suma días a cualquier licencia en 1 solo clic sin abrir bases de datos externas.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      value={licenseSearch}
                      onChange={(e) => setLicenseSearch(e.target.value)}
                      type="text"
                      placeholder="Buscar cliente..."
                      className="bg-[#0d1015] border border-white/[0.06] rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-[#e5a93c]/50 font-sans w-52"
                    />
                    <button
                      onClick={handleCreateLicense}
                      className="bg-[#d49a37] hover:bg-[#e5a93c] text-[#0b0d11] font-bold px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5 shadow-sm transition-all"
                    >
                      <Plus size={13} strokeWidth={3} />
                      Nueva Licencia
                    </button>
                  </div>
                </div>

                {/* Counters */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="p-3 rounded-xl bg-[#0d1015] border border-white/[0.06]">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total</span>
                    <div className="text-xl font-bold text-white font-mono mt-0.5">{licenses.length}</div>
                  </div>
                  <div className="p-3 rounded-xl bg-[#0d1015] border border-white/[0.06]">
                    <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Activas</span>
                    <div className="text-xl font-bold text-emerald-400 font-mono mt-0.5">
                      {licenses.filter((l) => l.realAccessStatus === "ACTIVE").length}
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-[#0d1015] border border-white/[0.06]">
                    <span className="text-[10px] font-bold text-[#e5a93c] uppercase tracking-wider">En Gracia</span>
                    <div className="text-xl font-bold text-[#e5a93c] font-mono mt-0.5">
                      {licenses.filter((l) => l.realAccessStatus === "GRACE").length}
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-[#0d1015] border border-white/[0.06]">
                    <span className="text-[10px] font-bold text-rose-400 uppercase tracking-wider">Bloqueadas</span>
                    <div className="text-xl font-bold text-rose-400 font-mono mt-0.5">
                      {licenses.filter((l) => l.realAccessStatus === "BLOCKED").length}
                    </div>
                  </div>
                </div>

                {/* Table of Licenses */}
                <div className="overflow-x-auto">
                  {loadingLicenses ? (
                    <div className="py-8 text-center text-xs text-slate-500">Cargando licencias...</div>
                  ) : filteredLicenses.length === 0 ? (
                    <div className="py-8 text-center text-xs text-slate-500">No se encontraron licencias.</div>
                  ) : (
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="text-slate-500 border-b border-white/[0.06]">
                          <th className="pb-2.5 font-medium">Cliente</th>
                          <th className="pb-2.5 font-medium">Clave</th>
                          <th className="pb-2.5 font-medium">Estado</th>
                          <th className="pb-2.5 font-medium">Días Restantes</th>
                          <th className="pb-2.5 font-medium">Último Pago</th>
                          <th className="pb-2.5 font-medium">Vencimiento</th>
                          <th className="pb-2.5 font-medium text-right">Sumar Días (1 Clic)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/[0.03]">
                        {filteredLicenses.map((lic) => {
                          const expDate = new Date(lic.expiresAt);
                          const daysLeft = lic.daysLeft !== undefined 
                            ? lic.daysLeft 
                            : Math.max(0, Math.ceil((expDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)));

                          let badgeClass = "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
                          let badgeText = "ACTIVA";

                          if (lic.isMaster) {
                            badgeClass = "bg-[#e5a93c]/15 text-[#e5a93c] border-[#e5a93c]/30";
                            badgeText = "ROOT";
                          } else if (lic.realAccessStatus === "GRACE") {
                            badgeClass = "bg-[#e5a93c]/10 text-[#e5a93c] border-[#e5a93c]/20";
                            badgeText = `GRACIA (${lic.overdueDays}d)`;
                          } else if (lic.realAccessStatus === "BLOCKED") {
                            badgeClass = "bg-rose-500/10 text-rose-400 border-rose-500/20";
                            badgeText = "BLOQUEADA";
                          }

                          return (
                            <tr key={lic.accessId} className="hover:bg-white/[0.015] transition-colors">
                              <td className="py-2.5 font-medium text-white">{lic.clientName}</td>
                              <td className="py-2.5 font-mono text-[#e5a93c] font-semibold">{lic.accessKey}</td>
                              <td className="py-2.5">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${badgeClass}`}>
                                  {badgeText}
                                </span>
                              </td>
                              <td className="py-2.5 font-mono">
                                {lic.isMaster ? (
                                  <span className="text-[#e5a93c] text-xs">Ilimitado</span>
                                ) : (
                                  <span className={daysLeft > 0 ? "text-emerald-400 font-semibold" : "text-rose-400 font-semibold"}>
                                    {daysLeft > 0 ? `${daysLeft}d` : "Vencida"}
                                  </span>
                                )}
                              </td>
                              <td className="py-2.5 font-mono text-slate-400 text-[11px]">
                                {lic.lastPaymentAt ? new Date(lic.lastPaymentAt).toLocaleDateString("es-ES") : "Sin registro"}
                              </td>
                              <td className="py-2.5 font-mono text-slate-300">
                                {lic.isMaster
                                  ? "Permanente"
                                  : expDate.toLocaleDateString("es-ES")}
                              </td>
                              <td className="py-2.5 text-right space-x-1">
                                <button
                                  onClick={() => handleAddDays(lic.accessKey, 7, lic.clientName)}
                                  className="px-2 py-1 bg-white/[0.04] hover:bg-white/[0.08] text-slate-200 border border-white/[0.08] font-medium text-xs rounded transition-all"
                                >
                                  +7d
                                </button>
                                <button
                                  onClick={() => handleAddDays(lic.accessKey, 15, lic.clientName)}
                                  className="px-2 py-1 bg-white/[0.04] hover:bg-white/[0.08] text-slate-200 border border-white/[0.08] font-medium text-xs rounded transition-all"
                                >
                                  +15d
                                </button>
                                <button
                                  onClick={() => handleAddDays(lic.accessKey, 30, lic.clientName)}
                                  className="px-2.5 py-1 bg-[#d49a37] hover:bg-[#e5a93c] text-[#0b0d11] font-bold text-xs rounded transition-all shadow-sm"
                                >
                                  +30d
                                </button>
                                <button
                                  onClick={() => handleAddDays(lic.accessKey, 60, lic.clientName)}
                                  className="px-2 py-1 bg-white/[0.04] hover:bg-white/[0.08] text-slate-200 border border-white/[0.08] font-medium text-xs rounded transition-all"
                                >
                                  +60d
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>

              </div>
            </div>
          )}

        </div>

      </main>
    </div>
  );
}
