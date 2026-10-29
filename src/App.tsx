import { useEffect, useRef, useState } from "react";
import {
  Play, Check, Trash2, Zap,
  Settings, Bot, Shield, Network, Users, Target, LogOut, Plus, Minus,
  Eye, EyeOff, Monitor, Globe, Clock, Activity, RefreshCw,
  Ban, Unlock, AlertTriangle, DollarSign, Copy, X, SlidersHorizontal
} from "lucide-react";
import { toast } from "sonner";
import { loadSession, clearSession } from "./auth/authApi";
import {
  fetchAllLicenses,
  addLicenseDays,
  createNewLicense,
  deleteLicense,
  toggleLicenseStatus,
  updateLicenseMora,
  fetchAccessLogs,
  type LicenseItem,
  type AccessLogItem
} from "./api/adminApi";
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
  BOT_PROXY_TYPE: string;
  BOT_PROXY_SERVER: string;
  BOT_PROXY_PORT: string;
  BOT_PROXY_USER: string;
  BOT_PROXY_PASS: string;
  SECUENCIA: string[];
}

export default function App() {
  const [config, setConfig] = useState<Config>({
    KEY: "", KEYABS: "",
    PROXY_TYPE: "http", PROXY_SERVER: "", PROXY_PORT: "", PROXY_USER: "", PROXY_PASS: "",
    PROXY_TYPE_2: "http", PROXY_SERVER_2: "", PROXY_PORT_2: "", PROXY_USER_2: "", PROXY_PASS_2: "",
    BOT_PROXY_TYPE: "http", BOT_PROXY_SERVER: "", BOT_PROXY_PORT: "", BOT_PROXY_USER: "", BOT_PROXY_PASS: "",
    SECUENCIA: []
  });

  const [activeTab, setActiveTab] = useState<"bot" | "admin">("bot");
  const [serverOnline, setServerOnline] = useState(false);
  const [newSequence, setNewSequence] = useState("");
  const [profileCount, setProfileCount] = useState(0);
  const [hitCount, setHitCount] = useState(0);
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving">("saved");

  // Licencias Admin State
  const [licenses, setLicenses] = useState<LicenseItem[]>([]);
  const [licenseSearch, setLicenseSearch] = useState("");
  const [loadingLicenses, setLoadingLicenses] = useState(false);
  const [showProxyPass2, setShowProxyPass2] = useState(false);
  const [showBotProxyPass, setShowBotProxyPass] = useState(false);

  // Modales personalizados (Reemplazo de alert / prompt / confirm nativos)
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newClientName, setNewClientName] = useState("");
  const [newClientDays, setNewClientDays] = useState("30");
  const [newGraceDays, setNewGraceDays] = useState("3");
  const [newLateFeePerDay, setNewLateFeePerDay] = useState("5");
  const [createdLicenseModal, setCreatedLicenseModal] = useState<{
    clientName: string;
    accessKey: string;
    days: number;
  } | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<LicenseItem | null>(null);
  const [clearSeqModalOpen, setClearSeqModalOpen] = useState(false);

  // Modal de Configuración de Mora / Días / Bloqueo
  const [moraTarget, setMoraTarget] = useState<LicenseItem | null>(null);
  const [editGraceDays, setEditGraceDays] = useState("3");
  const [editLateFeePerDay, setEditLateFeePerDay] = useState("5");
  const [editOverdueDays, setEditOverdueDays] = useState("1");
  const [editCustomDays, setEditCustomDays] = useState("");
  const [editStatus, setEditStatus] = useState<"ACTIVE" | "GRACE" | "EXCEPTION" | "BLOCKED">("GRACE");
  const [editReason, setEditReason] = useState("");

  // Auditoría y Logs Admin State
  const [adminSubTab, setAdminSubTab] = useState<"licenses" | "logs">("licenses");
  const [logs, setLogs] = useState<AccessLogItem[]>([]);
  const [logSearch, setLogSearch] = useState("");
  const [loadingLogs, setLoadingLogs] = useState(false);

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

  // Cargar licencias o logs si se entra en la pestaña admin
  useEffect(() => {
    if (activeTab === "admin") {
      if (isMasterUser) {
        if (adminSubTab === "licenses") {
          loadLicenses();
        } else {
          loadLogs();
        }
      } else {
        setActiveTab("bot");
      }
    }
  }, [activeTab, adminSubTab, isMasterUser]);

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

  async function loadLogs(searchQuery?: string) {
    setLoadingLogs(true);
    try {
      const q = searchQuery !== undefined ? searchQuery : logSearch;
      const data = await fetchAccessLogs(q, 100);
      setLogs(data);
    } catch {
      // Ignorar si no hay conexión aún
    } finally {
      setLoadingLogs(false);
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
      toast.success(`Secuencia ${cleaned} agregada`);
    } else {
      toast.info(`La secuencia ${cleaned} ya está en la lista`);
    }
  }

  function removeSequence(index: number) {
    const removed = config.SECUENCIA[index];
    const nextSeqs = config.SECUENCIA.filter((_, i) => i !== index);
    const nextConfig = { ...config, SECUENCIA: nextSeqs };
    setConfig(nextConfig);
    autoSaveConfig(nextConfig);
    if (removed) toast.info(`Secuencia ${removed} eliminada`);
  }

  async function confirmClearSequences() {
    setClearSeqModalOpen(false);
    try {
      await fetch(`${API_URL}/clear-secuencias`, { method: "POST" });
    } catch {
      // Servidor auxiliar offline
    }
    const nextConfig = { ...config, SECUENCIA: [] };
    setConfig(nextConfig);
    autoSaveConfig(nextConfig);
    toast.success("Todas las secuencias fueron eliminadas.");
  }

  // Operaciones de Bot
  async function handleAction(endpoint: string, message: string, method = "POST") {
    toast.info(message);
    try {
      await fetch(`${API_URL}${endpoint}`, { method });
    } catch {
      toast.error("Error al conectar con el servidor auxiliar.");
    }
  }

  async function handleHits() {
    toast.info("Procesando reporte de hits...");
    try {
      const res = await fetch(`${API_URL}/hits`, { method: "POST" });
      const html = await res.text();
      const blob = new Blob([html], { type: "text/html" });
      window.open(URL.createObjectURL(blob), "_blank");
      toast.success("Reporte de hits abierto en nueva pestaña.");
    } catch {
      toast.error("No se pudo obtener el reporte de hits.");
    }
  }

  function handleLogout() {
    clearSession();
    window.location.reload();
  }

  async function handleAdjustDays(accessKey: string, days: number, clientName: string) {
    try {
      await addLicenseDays(accessKey, days);
      if (days > 0) {
        toast.success(`+${days} días agregados a "${clientName}"`);
      } else {
        toast.warning(`${days} días descontados a "${clientName}"`);
      }
      loadLicenses();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al ajustar días.");
    }
  }

  function openCreateLicenseModal() {
    setNewClientName("");
    setNewClientDays("30");
    setNewGraceDays("3");
    setNewLateFeePerDay("5");
    setCreateModalOpen(true);
  }

  async function handleSubmitCreateLicense(e: React.FormEvent) {
    e.preventDefault();
    const name = newClientName.trim();
    if (!name) {
      toast.error("Ingresa el nombre del cliente.");
      return;
    }

    const days = parseInt(newClientDays, 10);
    const grace = parseInt(newGraceDays, 10);
    const fee = parseFloat(newLateFeePerDay);

    try {
      const created = await createNewLicense(
        name,
        isNaN(days) ? 30 : days,
        isNaN(grace) ? 3 : grace,
        isNaN(fee) ? 5 : fee
      );
      setCreateModalOpen(false);
      toast.success(`Licencia creada exitosamente para "${created.clientName}"`);
      loadLicenses();
      setCreatedLicenseModal({
        clientName: created.clientName,
        accessKey: created.accessKey,
        days: isNaN(days) ? 30 : days
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al crear licencia.");
    }
  }

  async function handleToggleBlock(lic: LicenseItem) {
    const isCurrentlyBlocked = lic.realAccessStatus === "BLOCKED";
    const targetAction = isCurrentlyBlocked ? "ACTIVE" : "BLOCKED";
    try {
      const res = await toggleLicenseStatus(
        lic.accessKey,
        targetAction,
        isCurrentlyBlocked ? undefined : "Bloqueado por falta de pago"
      );
      if (targetAction === "BLOCKED") {
        toast.error(`Usuario "${lic.clientName}" bloqueado por falta de pago.`);
      } else {
        toast.success(res.message || `Usuario "${lic.clientName}" desbloqueado.`);
      }
      loadLicenses();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al cambiar estado del usuario.");
    }
  }

  async function handleQuickMora(lic: LicenseItem) {
    try {
      const res = await toggleLicenseStatus(
        lic.accessKey,
        "GRACE",
        "En mora por pago pendiente"
      );
      toast.warning(res.message || `Usuario "${lic.clientName}" puesto en Mora.`);
      loadLicenses();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al activar Mora.");
    }
  }

  function openMoraConfigModal(lic: LicenseItem) {
    setMoraTarget(lic);
    setEditGraceDays(String(lic.graceDays ?? 3));
    setEditLateFeePerDay(String(lic.lateFeePerDay ?? 5));
    setEditOverdueDays(String(lic.overdueDays > 0 ? lic.overdueDays : 1));
    setEditCustomDays("");
    const currentSt = (lic.realAccessStatus || "ACTIVE").toUpperCase();
    if (currentSt === "BLOCKED" || currentSt === "GRACE" || currentSt === "EXCEPTION") {
      setEditStatus(currentSt as "BLOCKED" | "GRACE" | "EXCEPTION");
    } else {
      setEditStatus("GRACE");
    }
    setEditReason(lic.manualAllowReason || "En mora por falta de pago");
  }

  async function handleSaveMoraModal(e: React.FormEvent) {
    e.preventDefault();
    if (!moraTarget) return;

    try {
      // Si el admin ingresó ajuste manual de días (+/-), aplicarlo primero
      const customDaysNum = parseInt(editCustomDays, 10);
      if (!isNaN(customDaysNum) && customDaysNum !== 0) {
        await addLicenseDays(moraTarget.accessKey, customDaysNum);
      }

      const graceNum = parseInt(editGraceDays, 10);
      const feeNum = parseFloat(editLateFeePerDay);
      const overdueNum = parseInt(editOverdueDays, 10);

      const res = await updateLicenseMora({
        accessKey: moraTarget.accessKey,
        graceDays: isNaN(graceNum) ? 3 : graceNum,
        lateFeePerDay: isNaN(feeNum) ? 5 : feeNum,
        overdueDays: editStatus === "GRACE" && !isNaN(overdueNum) ? overdueNum : undefined,
        status: editStatus,
        exceptionHours: editStatus === "EXCEPTION" ? 24 : undefined,
        manualAllowReason: editReason.trim() || undefined
      });

      toast.success(res.message || `Configuración de Mora actualizada para "${moraTarget.clientName}".`);
      setMoraTarget(null);
      loadLicenses();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al guardar configuración de Mora.");
    }
  }

  async function handleConfirmDeleteLicense() {
    if (!deleteTarget) return;
    const target = deleteTarget;
    setDeleteTarget(null);
    try {
      const res = await deleteLicense(target.accessKey);
      toast.success(res.message || `Usuario "${target.clientName}" eliminado permanentemente.`);
      loadLicenses();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al eliminar el usuario.");
    }
  }

  const filteredLicenses = licenses.filter(
    (l) =>
      l.clientName.toLowerCase().includes(licenseSearch.toLowerCase()) ||
      l.accessKey.toLowerCase().includes(licenseSearch.toLowerCase())
  );

  const filteredLogs = logs.filter((l) => {
    const q = logSearch.toLowerCase().trim();
    if (!q) return true;
    return (
      (l.clientName && l.clientName.toLowerCase().includes(q)) ||
      (l.accessKey && l.accessKey.toLowerCase().includes(q)) ||
      (l.machineName && l.machineName.toLowerCase().includes(q)) ||
      (l.ipAddress && l.ipAddress.toLowerCase().includes(q)) ||
      (l.actionStatus && l.actionStatus.toLowerCase().includes(q)) ||
      (l.message && l.message.toLowerCase().includes(q))
    );
  });

  function formatLogDate(dateStr: string) {
    try {
      const d = new Date(dateStr);
      return d.toLocaleString("es-ES", {
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
    } catch {
      return dateStr;
    }
  }

  function renderLogStatusBadge(status: string) {
    const s = (status || "").toUpperCase();
    if (s === "ACTIVE" || s === "SUCCESS") {
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          AUTORIZADO
        </span>
      );
    }
    if (s === "BLOCKED") {
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
          BLOQUEADO (VENCIDO)
        </span>
      );
    }
    if (s === "INVALID") {
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
          CLAVE INVÁLIDA
        </span>
      );
    }
    if (s === "DENIED") {
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20">
          DENEGADO (403)
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-500/10 text-slate-400 border border-slate-500/20">
        {status}
      </span>
    );
  }

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

            {/* Licencia Maestra / Cliente Badge */}
            <div className="flex items-center gap-2 pl-3 border-l border-white/[0.06]">
              <span className="text-xs font-mono font-medium text-slate-300">{session?.clientName || "Administrador"}</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#e5a93c]/15 text-[#e5a93c] border border-[#e5a93c]/30 font-bold uppercase">
                {isMasterUser ? "Root" : "Cliente"}
              </span>
              {!isMasterUser && session?.daysLeft !== undefined && (
                <span
                  className={`text-[10px] px-2 py-0.5 rounded font-mono font-semibold border ${
                    session.daysLeft > 0
                      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                      : "bg-rose-500/10 text-rose-400 border-rose-500/20"
                  }`}
                >
                  {session.daysLeft > 0 ? `${session.daysLeft}d restantes` : "Vencida"}
                </span>
              )}
              {!isMasterUser && (session?.accessStatus === "GRACE" || (session?.lateFeeAmount ?? 0) > 0) && (
                <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30 font-mono font-bold flex items-center gap-1">
                  <AlertTriangle size={11} />
                  MORA: ${(session?.lateFeeAmount ?? 0).toFixed(2)} USD
                </span>
              )}
            </div>
          </div>
        </header>

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
                    onClick={() => handleAction("/start-flash", "Iniciando Bot Flash (0000-9999)...", "POST")}
                    className="w-full py-2.5 px-4 rounded-lg bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 hover:from-amber-400 hover:to-yellow-300 text-[#0b0d11] font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-md hover:shadow-amber-500/20 transition-all active:scale-[0.99] border border-amber-300/40"
                  >
                    <Zap size={15} fill="currentColor" className="text-[#0b0d11]" />
                    ⚡ Iniciar Bot Flash
                  </button>

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
                    onClick={() => setClearSeqModalOpen(true)}
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

                {/* Proxy Bot GoLogin */}
                <div className="pt-2 border-t border-white/[0.04]">
                  <div className="p-3.5 rounded-xl bg-[#0d1015] border border-white/[0.06] space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                        <Network size={13} className="text-[#e5a93c]" />
                        Proxy Bot GoLogin
                      </div>
                      <span className="text-[10px] text-slate-500 font-mono">
                        Consumido por el bot checker (V6)
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-2">
                      <div>
                        <label className="text-[10px] text-slate-400 mb-1 block">Tipo</label>
                        <input
                          value={config.BOT_PROXY_TYPE}
                          onChange={(e) => updateField("BOT_PROXY_TYPE", e.target.value)}
                          placeholder="http / socks5"
                          className="w-full bg-[#151820] border border-white/[0.06] rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-[#e5a93c]/40 font-mono"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-400 mb-1 block">Host / Servidor</label>
                        <input
                          value={config.BOT_PROXY_SERVER}
                          onChange={(e) => updateField("BOT_PROXY_SERVER", e.target.value)}
                          placeholder="Host o IP"
                          className="w-full bg-[#151820] border border-white/[0.06] rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-[#e5a93c]/40 font-mono"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-400 mb-1 block">Puerto</label>
                        <input
                          value={config.BOT_PROXY_PORT}
                          onChange={(e) => updateField("BOT_PROXY_PORT", e.target.value)}
                          placeholder="1000"
                          className="w-full bg-[#151820] border border-white/[0.06] rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-[#e5a93c]/40 font-mono"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-400 mb-1 block">Usuario</label>
                        <input
                          value={config.BOT_PROXY_USER}
                          onChange={(e) => updateField("BOT_PROXY_USER", e.target.value)}
                          placeholder="User"
                          className="w-full bg-[#151820] border border-white/[0.06] rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-[#e5a93c]/40"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-400 mb-1 block">Contraseña</label>
                        <div className="relative">
                          <input
                            type={showBotProxyPass ? "text" : "password"}
                            value={config.BOT_PROXY_PASS}
                            onChange={(e) => updateField("BOT_PROXY_PASS", e.target.value)}
                            placeholder="Password"
                            className="w-full bg-[#151820] border border-white/[0.06] rounded-lg px-2.5 py-1.5 pr-8 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-[#e5a93c]/40 font-mono"
                          />
                          <button
                            type="button"
                            onClick={() => setShowBotProxyPass(!showBotProxyPass)}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                            tabIndex={-1}
                          >
                            {showBotProxyPass ? <EyeOff size={13} /> : <Eye size={13} />}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* TAB 2: ADMINISTRACIÓN DE LICENCIAS Y AUDITORÍA */}
          {activeTab === "admin" && isMasterUser && (
            <div className="space-y-5">
              <div className="bg-[#151820] border border-white/[0.06] rounded-2xl p-5 space-y-4">
                
                {/* Sub-Tabs de Navegación Admin */}
                <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-white/[0.06]">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setAdminSubTab("licenses")}
                      className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                        adminSubTab === "licenses"
                          ? "bg-[#e5a93c]/15 text-[#e5a93c] border border-[#e5a93c]/30"
                          : "text-slate-400 hover:text-white hover:bg-white/[0.03]"
                      }`}
                    >
                      <Shield size={14} />
                      Licencias de Clientes ({licenses.length})
                    </button>
                    <button
                      onClick={() => setAdminSubTab("logs")}
                      className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                        adminSubTab === "logs"
                          ? "bg-[#e5a93c]/15 text-[#e5a93c] border border-[#e5a93c]/30"
                          : "text-slate-400 hover:text-white hover:bg-white/[0.03]"
                      }`}
                    >
                      <Activity size={14} />
                      Auditoría y Logs de Accesos ({logs.length})
                    </button>
                  </div>

                  {adminSubTab === "licenses" ? (
                    <div className="flex items-center gap-2">
                      <input
                        value={licenseSearch}
                        onChange={(e) => setLicenseSearch(e.target.value)}
                        type="text"
                        placeholder="Buscar cliente o clave..."
                        className="bg-[#0d1015] border border-white/[0.06] rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-[#e5a93c]/50 font-sans w-52"
                      />
                      <button
                        onClick={() => loadLicenses()}
                        className="bg-white/[0.06] hover:bg-white/[0.1] text-slate-200 font-semibold px-2.5 py-1.5 rounded-lg text-xs flex items-center gap-1.5 border border-white/[0.08] transition-all"
                        title="Actualizar lista de licencias"
                      >
                        <RefreshCw size={13} className={loadingLicenses ? "animate-spin text-[#e5a93c]" : ""} />
                      </button>
                      <button
                        onClick={openCreateLicenseModal}
                        className="bg-[#d49a37] hover:bg-[#e5a93c] text-[#0b0d11] font-bold px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5 shadow-sm transition-all"
                      >
                        <Plus size={13} strokeWidth={3} />
                        Nueva Licencia
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <input
                        value={logSearch}
                        onChange={(e) => setLogSearch(e.target.value)}
                        type="text"
                        placeholder="Buscar por PC, IP, cliente..."
                        className="bg-[#0d1015] border border-white/[0.06] rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-[#e5a93c]/50 font-sans w-56"
                      />
                      <button
                        onClick={() => loadLogs()}
                        className="bg-white/[0.06] hover:bg-white/[0.1] text-slate-200 font-semibold px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5 border border-white/[0.08] transition-all"
                      >
                        <RefreshCw size={13} className={loadingLogs ? "animate-spin text-[#e5a93c]" : ""} />
                        Actualizar
                      </button>
                    </div>
                  )}
                </div>

                {adminSubTab === "licenses" && (
                  <>
                    {/* Header Info */}
                    <div className="flex items-center justify-between">
                      <div>
                        <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                          Administración de Licencias, Mora y Bloqueos
                        </h2>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Suma o quita días, activa Mora por atraso, bloquea por falta de pago o elimina usuarios en 1 clic.
                        </p>
                      </div>
                    </div>

                    {/* Counters (5 Tarjetas incluyendo Mora Acumulada) */}
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                      <div className="p-3 rounded-xl bg-[#0d1015] border border-white/[0.06]">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total Usuarios</span>
                        <div className="text-xl font-bold text-white font-mono mt-0.5">{licenses.length}</div>
                      </div>
                      <div className="p-3 rounded-xl bg-[#0d1015] border border-white/[0.06]">
                        <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Activas</span>
                        <div className="text-xl font-bold text-emerald-400 font-mono mt-0.5">
                          {licenses.filter((l) => l.realAccessStatus === "ACTIVE").length}
                        </div>
                      </div>
                      <div className="p-3 rounded-xl bg-[#0d1015] border border-amber-500/20">
                        <span className="text-[10px] font-bold text-[#e5a93c] uppercase tracking-wider">En Mora / Gracia</span>
                        <div className="text-xl font-bold text-[#e5a93c] font-mono mt-0.5">
                          {licenses.filter((l) => l.realAccessStatus === "GRACE" || l.realAccessStatus === "EXCEPTION").length}
                        </div>
                      </div>
                      <div className="p-3 rounded-xl bg-[#0d1015] border border-rose-500/20">
                        <span className="text-[10px] font-bold text-rose-400 uppercase tracking-wider">Bloqueadas (Impagas)</span>
                        <div className="text-xl font-bold text-rose-400 font-mono mt-0.5">
                          {licenses.filter((l) => l.realAccessStatus === "BLOCKED").length}
                        </div>
                      </div>
                      <div className="p-3 rounded-xl bg-[#0d1015] border border-[#e5a93c]/25">
                        <span className="text-[10px] font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1">
                          <DollarSign size={11} />
                          Mora Acumulada
                        </span>
                        <div className="text-xl font-bold text-amber-300 font-mono mt-0.5">
                          ${licenses.reduce((acc, l) => acc + (l.lateFeeAmount || 0), 0).toFixed(2)}
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
                            <tr className="text-slate-500 border-b border-white/[0.06] text-[11px]">
                              <th className="pb-2.5 pr-3 font-medium">Cliente</th>
                              <th className="pb-2.5 px-2 font-medium">Clave</th>
                              <th className="pb-2.5 px-2 font-medium">Estado</th>
                              <th className="pb-2.5 px-2 font-medium">Vigencia</th>
                              <th className="pb-2.5 px-2 font-medium">Mora / Recargo</th>
                              <th className="pb-2.5 px-2 font-medium text-center">Quitar / Sumar Días</th>
                              <th className="pb-2.5 pl-2 font-medium text-right">Control de Pago y Usuario</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/[0.04]">
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
                                badgeClass = "bg-amber-500/15 text-amber-300 border-amber-500/30";
                                badgeText = `EN MORA (${lic.overdueDays}d)`;
                              } else if (lic.realAccessStatus === "EXCEPTION") {
                                badgeClass = "bg-sky-500/15 text-sky-300 border-sky-500/30";
                                badgeText = "EXCEPCIÓN 24H";
                              } else if (lic.realAccessStatus === "BLOCKED") {
                                badgeClass = "bg-rose-500/15 text-rose-400 border-rose-500/30";
                                badgeText = lic.accessStatus === "DISABLED" ? "BLOQUEADO (IMPAGO)" : "BLOQUEADO (VENCIDO)";
                              }

                              const hasMora = (lic.lateFeeAmount ?? 0) > 0 || lic.realAccessStatus === "GRACE";

                              return (
                                <tr key={lic.accessId} className="hover:bg-white/[0.015] transition-colors">
                                  {/* Cliente */}
                                  <td className="py-3 pr-3">
                                    <div className="font-semibold text-white">{lic.clientName}</div>
                                    <div className="text-[10px] text-slate-500 font-mono">
                                      Últ. pago: {lic.lastPaymentAt ? new Date(lic.lastPaymentAt).toLocaleDateString("es-ES") : "Sin registro"}
                                    </div>
                                  </td>

                                  {/* Clave con botón Copiar */}
                                  <td className="py-3 px-2 font-mono">
                                    <div className="flex items-center gap-1.5">
                                      <span className="text-[#e5a93c] font-semibold">{lic.accessKey}</span>
                                      <button
                                        onClick={() => {
                                          navigator.clipboard.writeText(lic.accessKey);
                                          toast.success(`Clave de "${lic.clientName}" copiada`);
                                        }}
                                        className="p-1 rounded hover:bg-white/[0.06] text-slate-500 hover:text-slate-200 transition-colors"
                                        title="Copiar clave"
                                      >
                                        <Copy size={11} />
                                      </button>
                                    </div>
                                  </td>

                                  {/* Estado */}
                                  <td className="py-3 px-2 whitespace-nowrap">
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${badgeClass}`}>
                                      {badgeText}
                                    </span>
                                    {lic.manualAllowReason && !lic.isMaster && (
                                      <div className="text-[10px] text-slate-500 mt-0.5 max-w-[140px] truncate" title={lic.manualAllowReason}>
                                        {lic.manualAllowReason}
                                      </div>
                                    )}
                                  </td>

                                  {/* Vigencia y Días Restantes */}
                                  <td className="py-3 px-2 font-mono whitespace-nowrap">
                                    {lic.isMaster ? (
                                      <span className="text-[#e5a93c] text-xs font-semibold">Permanente</span>
                                    ) : (
                                      <div>
                                        <span className={daysLeft > 0 ? "text-emerald-400 font-bold" : "text-rose-400 font-bold"}>
                                          {daysLeft > 0 ? `${daysLeft}d restantes` : `Vencida (${lic.overdueDays}d atraso)`}
                                        </span>
                                        <div className="text-[10px] text-slate-500">
                                          Vence: {expDate.toLocaleDateString("es-ES")}
                                        </div>
                                      </div>
                                    )}
                                  </td>

                                  {/* Columna de MORA */}
                                  <td className="py-3 px-2 font-mono whitespace-nowrap">
                                    {lic.isMaster ? (
                                      <span className="text-slate-600 text-xs">—</span>
                                    ) : (
                                      <div>
                                        <div className={`font-bold text-xs flex items-center gap-1 ${hasMora ? "text-amber-300" : "text-slate-400"}`}>
                                          <span>${(lic.lateFeeAmount ?? 0).toFixed(2)} USD</span>
                                          {hasMora && (
                                            <span className="px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30 text-[9px] font-bold">
                                              MORA
                                            </span>
                                          )}
                                        </div>
                                        <div className="text-[10px] text-slate-500">
                                          ${lic.lateFeePerDay ?? 5}/día • Gracia: {lic.graceDays ?? 3}d
                                        </div>
                                      </div>
                                    )}
                                  </td>

                                  {/* Quitar Días y Sumar Días */}
                                  <td className="py-3 px-2 whitespace-nowrap">
                                    {lic.isMaster ? (
                                      <div className="text-center text-[11px] text-slate-600 italic">Licencia Root</div>
                                    ) : (
                                      <div className="flex flex-col gap-1 items-center">
                                        {/* Fila Sumar Días */}
                                        <div className="flex items-center gap-1">
                                          <button
                                            onClick={() => handleAdjustDays(lic.accessKey, 7, lic.clientName)}
                                            className="px-2 py-0.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/25 font-mono font-semibold text-[11px] rounded transition-all"
                                            title="Sumar 7 días"
                                          >
                                            +7d
                                          </button>
                                          <button
                                            onClick={() => handleAdjustDays(lic.accessKey, 15, lic.clientName)}
                                            className="px-2 py-0.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/25 font-mono font-semibold text-[11px] rounded transition-all"
                                            title="Sumar 15 días"
                                          >
                                            +15d
                                          </button>
                                          <button
                                            onClick={() => handleAdjustDays(lic.accessKey, 30, lic.clientName)}
                                            className="px-2 py-0.5 bg-[#d49a37] hover:bg-[#e5a93c] text-[#0b0d11] font-mono font-bold text-[11px] rounded transition-all shadow-sm"
                                            title="Sumar 30 días"
                                          >
                                            +30d
                                          </button>
                                          <button
                                            onClick={() => handleAdjustDays(lic.accessKey, 60, lic.clientName)}
                                            className="px-2 py-0.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/25 font-mono font-semibold text-[11px] rounded transition-all"
                                            title="Sumar 60 días"
                                          >
                                            +60d
                                          </button>
                                        </div>

                                        {/* Fila Quitar Días */}
                                        <div className="flex items-center gap-1">
                                          <button
                                            onClick={() => handleAdjustDays(lic.accessKey, -1, lic.clientName)}
                                            className="px-2 py-0.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/25 font-mono font-semibold text-[11px] rounded transition-all"
                                            title="Quitar 1 día"
                                          >
                                            -1d
                                          </button>
                                          <button
                                            onClick={() => handleAdjustDays(lic.accessKey, -7, lic.clientName)}
                                            className="px-2 py-0.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/25 font-mono font-semibold text-[11px] rounded transition-all"
                                            title="Quitar 7 días"
                                          >
                                            -7d
                                          </button>
                                          <button
                                            onClick={() => handleAdjustDays(lic.accessKey, -15, lic.clientName)}
                                            className="px-2 py-0.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/25 font-mono font-semibold text-[11px] rounded transition-all"
                                            title="Quitar 15 días"
                                          >
                                            -15d
                                          </button>
                                          <button
                                            onClick={() => handleAdjustDays(lic.accessKey, -30, lic.clientName)}
                                            className="px-2 py-0.5 bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 font-mono font-bold text-[11px] rounded transition-all"
                                            title="Quitar 30 días"
                                          >
                                            -30d
                                          </button>
                                        </div>
                                      </div>
                                    )}
                                  </td>

                                  {/* Acciones: Mora, Bloquear por falta de pago, Configurar, Borrar */}
                                  <td className="py-3 pl-2 text-right whitespace-nowrap">
                                    {lic.isMaster ? (
                                      <span className="text-[11px] text-slate-600 font-mono">Protegido</span>
                                    ) : (
                                      <div className="inline-flex items-center gap-1.5">
                                        {/* Botón Poner en Mora Rápido */}
                                        {lic.realAccessStatus !== "GRACE" && (
                                          <button
                                            onClick={() => handleQuickMora(lic)}
                                            className="px-2 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/25 text-[11px] font-semibold flex items-center gap-1 transition-all"
                                            title="Poner usuario en Mora (Periodo de Gracia con recargo)"
                                          >
                                            <AlertTriangle size={12} />
                                            Mora
                                          </button>
                                        )}

                                        {/* Botón Configurar Mora / Días Exactos */}
                                        <button
                                          onClick={() => openMoraConfigModal(lic)}
                                          className="p-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.09] text-slate-300 border border-white/[0.08] transition-all"
                                          title="Configurar Mora ($/día, días de gracia, atraso y estado)"
                                        >
                                          <SlidersHorizontal size={13} />
                                        </button>

                                        {/* Botón Bloquear / Desbloquear por falta de pago */}
                                        {lic.realAccessStatus === "BLOCKED" ? (
                                          <button
                                            onClick={() => handleToggleBlock(lic)}
                                            className="px-2.5 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 text-[11px] font-semibold flex items-center gap-1 transition-all"
                                            title="Desbloquear y reactivar usuario"
                                          >
                                            <Unlock size={12} />
                                            Desbloquear
                                          </button>
                                        ) : (
                                          <button
                                            onClick={() => handleToggleBlock(lic)}
                                            className="px-2.5 py-1 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 text-[11px] font-semibold flex items-center gap-1 transition-all"
                                            title="Bloquear acceso inmediatamente por falta de pago"
                                          >
                                            <Ban size={12} />
                                            Bloquear
                                          </button>
                                        )}

                                        {/* Botón Eliminar / Borrar Usuario */}
                                        <button
                                          onClick={() => setDeleteTarget(lic)}
                                          className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/25 text-rose-400 border border-rose-500/20 transition-all"
                                          title="Eliminar usuario permanentemente"
                                        >
                                          <Trash2 size={13} />
                                        </button>
                                      </div>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      )}
                    </div>
                  </>
                )}

                {adminSubTab === "logs" && (
                  <>
                    {/* Header Info */}
                    <div className="flex items-center justify-between">
                      <div>
                        <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                          Auditoría y Logs de Accesos
                        </h2>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Historial en vivo de peticiones: PCs de clientes, IPs, claves validadas y bloqueos de seguridad.
                        </p>
                      </div>
                    </div>

                    {/* Counters Logs */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div className="p-3 rounded-xl bg-[#0d1015] border border-white/[0.06]">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total Peticiones</span>
                        <div className="text-xl font-bold text-white font-mono mt-0.5">{logs.length}</div>
                      </div>
                      <div className="p-3 rounded-xl bg-[#0d1015] border border-white/[0.06]">
                        <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Autorizadas</span>
                        <div className="text-xl font-bold text-emerald-400 font-mono mt-0.5">
                          {logs.filter((l) => l.canRun).length}
                        </div>
                      </div>
                      <div className="p-3 rounded-xl bg-[#0d1015] border border-white/[0.06]">
                        <span className="text-[10px] font-bold text-rose-400 uppercase tracking-wider">Bloqueadas (Vencidas)</span>
                        <div className="text-xl font-bold text-rose-400 font-mono mt-0.5">
                          {logs.filter((l) => l.actionStatus === "BLOCKED").length}
                        </div>
                      </div>
                      <div className="p-3 rounded-xl bg-[#0d1015] border border-white/[0.06]">
                        <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">Inválidas / Denegadas</span>
                        <div className="text-xl font-bold text-amber-400 font-mono mt-0.5">
                          {logs.filter((l) => l.actionStatus === "INVALID" || l.actionStatus === "DENIED").length}
                        </div>
                      </div>
                    </div>

                    {/* Table of Logs */}
                    <div className="overflow-x-auto">
                      {loadingLogs ? (
                        <div className="py-8 text-center text-xs text-slate-500">Cargando registros de auditoría...</div>
                      ) : filteredLogs.length === 0 ? (
                        <div className="py-8 text-center text-xs text-slate-500">No se encontraron peticiones registradas.</div>
                      ) : (
                        <table className="w-full text-left text-xs">
                          <thead>
                            <tr className="text-slate-500 border-b border-white/[0.06] text-[11px]">
                              <th className="pb-2.5 px-2 font-medium">Fecha y Hora</th>
                              <th className="pb-2.5 px-2 font-medium">Equipo / PC</th>
                              <th className="pb-2.5 px-2 font-medium">IP</th>
                              <th className="pb-2.5 px-2 font-medium">Cliente / Licencia</th>
                              <th className="pb-2.5 px-2 font-medium">Origen</th>
                              <th className="pb-2.5 px-2 font-medium">Estado</th>
                              <th className="pb-2.5 px-2 font-medium">Mensaje / Detalle</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/[0.03]">
                            {filteredLogs.map((log) => (
                              <tr key={log.logId} className="hover:bg-white/[0.015] transition-colors">
                                <td className="py-2.5 px-2 font-mono text-[11px] text-slate-400 whitespace-nowrap">
                                  <div className="flex items-center gap-1.5">
                                    <Clock size={12} className="text-slate-500" />
                                    <span>{formatLogDate(log.createdAt)}</span>
                                  </div>
                                </td>
                                <td className="py-2.5 px-2 text-white font-medium whitespace-nowrap">
                                  <div className="flex items-center gap-1.5">
                                    <Monitor size={13} className="text-[#e5a93c]" />
                                    <span>{log.machineName || "Desconocido"}</span>
                                  </div>
                                </td>
                                <td className="py-2.5 px-2 font-mono text-[11px] text-slate-400 whitespace-nowrap">
                                  <div className="flex items-center gap-1.5">
                                    <Globe size={12} className="text-slate-500" />
                                    <span>{log.ipAddress || "Desconocida"}</span>
                                  </div>
                                </td>
                                <td className="py-2.5 px-2">
                                  <div className="font-semibold text-slate-200">
                                    {log.clientName || "Sin registrar"}
                                  </div>
                                  <div className="font-mono text-[10px] text-slate-500">
                                    {log.accessKey || "Sin clave"}
                                  </div>
                                </td>
                                <td className="py-2.5 px-2 whitespace-nowrap">
                                  <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-white/[0.04] border border-white/[0.08] text-slate-300">
                                    {log.endpoint}
                                  </span>
                                </td>
                                <td className="py-2.5 px-2 whitespace-nowrap">
                                  {renderLogStatusBadge(log.actionStatus)}
                                </td>
                                <td className="py-2.5 px-2 text-slate-400 text-[11px] max-w-xs truncate" title={log.message}>
                                  {log.message || "-"}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  </>
                )}

              </div>
            </div>
          )}

        </div>

      </main>

      {/* =====================================================================
          MODAL 1: CREAR NUEVA LICENCIA
      ===================================================================== */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-[#131720] border border-white/[0.08] rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#e5a93c]/15 border border-[#e5a93c]/30 flex items-center justify-center text-[#e5a93c]">
                  <Plus size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Nueva Licencia de Cliente</h3>
                  <p className="text-[11px] text-slate-400">Configura vigencia inicial y parámetros de Mora</p>
                </div>
              </div>
              <button
                onClick={() => setCreateModalOpen(false)}
                className="text-slate-500 hover:text-white p-1 rounded-lg"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSubmitCreateLicense} className="space-y-3.5">
              <div>
                <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                  Nombre del Cliente / Usuario
                </label>
                <input
                  type="text"
                  autoFocus
                  required
                  value={newClientName}
                  onChange={(e) => setNewClientName(e.target.value)}
                  placeholder="Ej: Carlos Oficina 2"
                  className="w-full bg-[#0b0d11] border border-white/[0.08] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#e5a93c]/60"
                />
              </div>

              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                    Días Activos
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={3650}
                    value={newClientDays}
                    onChange={(e) => setNewClientDays(e.target.value)}
                    className="w-full bg-[#0b0d11] border border-white/[0.08] rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-[#e5a93c]/60"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                    Días de Gracia
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={60}
                    value={newGraceDays}
                    onChange={(e) => setNewGraceDays(e.target.value)}
                    className="w-full bg-[#0b0d11] border border-white/[0.08] rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-[#e5a93c]/60"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                    Mora / Día (USD)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min={0}
                    value={newLateFeePerDay}
                    onChange={(e) => setNewLateFeePerDay(e.target.value)}
                    className="w-full bg-[#0b0d11] border border-white/[0.08] rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-[#e5a93c]/60"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/[0.06]">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-3.5 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-white hover:bg-white/[0.04]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg text-xs font-bold bg-[#d49a37] hover:bg-[#e5a93c] text-[#0b0d11] shadow-sm transition-all"
                >
                  Generar Licencia
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL 2: CLAVE DE LICENCIA RECIÉN GENERADA
      ===================================================================== */}
      {createdLicenseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-[#131720] border border-[#e5a93c]/30 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <Check size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">¡Licencia Creada con Éxito!</h3>
                  <p className="text-[11px] text-slate-400">Comparte esta clave de acceso con el cliente</p>
                </div>
              </div>
              <button
                onClick={() => setCreatedLicenseModal(null)}
                className="text-slate-500 hover:text-white p-1 rounded-lg"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-4 rounded-xl bg-[#0b0d11] border border-white/[0.06] space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Cliente:</span>
                <span className="text-white font-semibold">{createdLicenseModal.clientName}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Vigencia:</span>
                <span className="text-emerald-400 font-mono font-semibold">{createdLicenseModal.days} días</span>
              </div>
              <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between">
                <span className="text-xs text-slate-400">Clave:</span>
                <span className="text-base font-mono font-bold text-[#e5a93c] tracking-wider">
                  {createdLicenseModal.accessKey}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(createdLicenseModal.accessKey);
                  toast.success("Clave copiada al portapapeles");
                }}
                className="flex-1 py-2 px-4 rounded-lg bg-[#d49a37] hover:bg-[#e5a93c] text-[#0b0d11] font-bold text-xs flex items-center justify-center gap-1.5"
              >
                <Copy size={13} />
                Copiar Clave
              </button>
              <button
                onClick={() => setCreatedLicenseModal(null)}
                className="py-2 px-4 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] text-slate-200 font-semibold text-xs"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL 3: CONFIGURAR MORA, DÍAS Y ESTADO DE PAGO DEL USUARIO
      ===================================================================== */}
      {moraTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg bg-[#131720] border border-white/[0.08] rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-300">
                  <DollarSign size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">
                    Gestión de Mora, Pago y Días — {moraTarget.clientName}
                  </h3>
                  <p className="text-[11px] text-slate-400 font-mono">{moraTarget.accessKey}</p>
                </div>
              </div>
              <button
                onClick={() => setMoraTarget(null)}
                className="text-slate-500 hover:text-white p-1 rounded-lg"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveMoraModal} className="space-y-4">
              {/* Selector de Estado */}
              <div>
                <label className="text-[11px] font-semibold text-slate-300 block mb-1.5">
                  Estado de Acceso del Usuario
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() => setEditStatus("ACTIVE")}
                    className={`py-2 px-2.5 rounded-lg text-xs font-bold border transition-all ${
                      editStatus === "ACTIVE"
                        ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                        : "bg-[#0b0d11] text-slate-400 border-white/[0.06] hover:text-white"
                    }`}
                  >
                    Activa
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditStatus("GRACE")}
                    className={`py-2 px-2.5 rounded-lg text-xs font-bold border transition-all ${
                      editStatus === "GRACE"
                        ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                        : "bg-[#0b0d11] text-slate-400 border-white/[0.06] hover:text-white"
                    }`}
                  >
                    En Mora (Gracia)
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditStatus("EXCEPTION")}
                    className={`py-2 px-2.5 rounded-lg text-xs font-bold border transition-all ${
                      editStatus === "EXCEPTION"
                        ? "bg-sky-500/20 text-sky-300 border-sky-500/40"
                        : "bg-[#0b0d11] text-slate-400 border-white/[0.06] hover:text-white"
                    }`}
                  >
                    Excepción 24h
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditStatus("BLOCKED")}
                    className={`py-2 px-2.5 rounded-lg text-xs font-bold border transition-all ${
                      editStatus === "BLOCKED"
                        ? "bg-rose-500/20 text-rose-300 border-rose-500/40"
                        : "bg-[#0b0d11] text-slate-400 border-white/[0.06] hover:text-white"
                    }`}
                  >
                    Bloqueado
                  </button>
                </div>
              </div>

              {/* Parámetros de Mora */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                    Mora por Día (USD)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min={0}
                    value={editLateFeePerDay}
                    onChange={(e) => setEditLateFeePerDay(e.target.value)}
                    className="w-full bg-[#0b0d11] border border-white/[0.08] rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-[#e5a93c]/60"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                    Días de Gracia
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={90}
                    value={editGraceDays}
                    onChange={(e) => setEditGraceDays(e.target.value)}
                    className="w-full bg-[#0b0d11] border border-white/[0.08] rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-[#e5a93c]/60"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                    Días de Atraso (Mora)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={90}
                    disabled={editStatus !== "GRACE"}
                    value={editOverdueDays}
                    onChange={(e) => setEditOverdueDays(e.target.value)}
                    className="w-full bg-[#0b0d11] border border-white/[0.08] rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-[#e5a93c]/60 disabled:opacity-40"
                  />
                </div>
              </div>

              {/* Ajuste personalizado de días (+ o -) */}
              <div className="p-3 rounded-xl bg-[#0b0d11] border border-white/[0.06] space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-semibold text-slate-300 flex items-center gap-1.5">
                    <Minus size={12} className="text-rose-400" />
                    <Plus size={12} className="text-emerald-400" />
                    Sumar o Quitar Días Personalizados (Opcional)
                  </label>
                  <span className="text-[10px] text-slate-500 font-mono">Ej: -5 para quitar 5 días, 10 para sumar</span>
                </div>
                <input
                  type="number"
                  value={editCustomDays}
                  onChange={(e) => setEditCustomDays(e.target.value)}
                  placeholder="Dejar vacío para no alterar (Ej: -3 o +12)"
                  className="w-full bg-[#131720] border border-white/[0.08] rounded-lg px-3 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-[#e5a93c]/60"
                />
              </div>

              {/* Motivo / Nota */}
              <div>
                <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                  Motivo / Nota para el Cliente
                </label>
                <input
                  type="text"
                  value={editReason}
                  onChange={(e) => setEditReason(e.target.value)}
                  placeholder="Ej: En mora por falta de pago mensual"
                  className="w-full bg-[#0b0d11] border border-white/[0.08] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#e5a93c]/60"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/[0.06]">
                <button
                  type="button"
                  onClick={() => setMoraTarget(null)}
                  className="px-3.5 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-white hover:bg-white/[0.04]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg text-xs font-bold bg-[#d49a37] hover:bg-[#e5a93c] text-[#0b0d11] shadow-sm transition-all"
                >
                  Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL 4: CONFIRMAR ELIMINACIÓN DE USUARIO / LICENCIA
      ===================================================================== */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-[#131720] border border-rose-500/30 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0">
                <Trash2 size={18} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">¿Eliminar usuario permanentemente?</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Esta acción borrará la licencia y desconectará al usuario de inmediato.
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-[#0b0d11] border border-white/[0.06] text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-400">Usuario:</span>
                <span className="text-white font-semibold">{deleteTarget.clientName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Clave:</span>
                <span className="text-[#e5a93c] font-mono font-semibold">{deleteTarget.accessKey}</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-white hover:bg-white/[0.04]"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmDeleteLicense}
                className="px-4 py-2 rounded-lg text-xs font-bold bg-rose-500 hover:bg-rose-600 text-white shadow-sm transition-all flex items-center gap-1.5"
              >
                <Trash2 size={13} />
                Sí, Borrar Usuario
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL 5: CONFIRMAR LIMPIEZA DE SECUENCIAS
      ===================================================================== */}
      {clearSeqModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm bg-[#131720] border border-rose-500/30 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0">
                <Trash2 size={16} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">¿Limpiar todas las secuencias?</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Se vaciarán las {config.SECUENCIA.length} secuencias activas del bot.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setClearSeqModalOpen(false)}
                className="px-3.5 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-white hover:bg-white/[0.04]"
              >
                Cancelar
              </button>
              <button
                onClick={confirmClearSequences}
                className="px-4 py-2 rounded-lg text-xs font-bold bg-rose-500 hover:bg-rose-600 text-white shadow-sm transition-all"
              >
                Vaciar Secuencias
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
