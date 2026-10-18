import { useState, useEffect } from "react";
import { Settings, Save, Eye, EyeOff, Sparkles, Server, Key, ShieldCheck } from "lucide-react";
import { getConfig, saveConfig } from "../api/clientApi";

interface ParsedProxy {
  host: string;
  port: string;
  user: string;
  pass: string;
  type?: string;
  provider?: string;
}

function parseProxyString(raw: string): ParsedProxy | null {
  let str = (raw || "").trim();
  if (!str) return null;

  let type: string | undefined = undefined;

  if (/^socks5:\/\//i.test(str)) {
    type = "socks5";
    str = str.replace(/^socks5:\/\//i, "");
  } else if (/^http:\/\//i.test(str)) {
    type = "http";
    str = str.replace(/^http:\/\//i, "");
  } else if (/^https:\/\//i.test(str)) {
    type = "http";
    str = str.replace(/^https:\/\//i, "");
  }

  let host = "";
  let port = "";
  let user = "";
  let pass = "";

  if (str.includes("@")) {
    const atParts = str.split("@");
    const auth = atParts[0];
    const address = atParts.slice(1).join("@");

    const authParts = auth.split(":");
    user = authParts[0] || "";
    pass = authParts.slice(1).join(":");

    const addrParts = address.split(":");
    host = addrParts[0] || "";
    port = addrParts[1] || "";
  } else if (str.includes(":")) {
    const parts = str.split(":");
    if (parts.length >= 4) {
      host = parts[0] || "";
      port = parts[1] || "";
      user = parts[2] || "";
      pass = parts.slice(3).join(":");
    } else if (parts.length === 2) {
      host = parts[0] || "";
      port = parts[1] || "";
    }
  }

  if (!host && !user) return null;

  let provider = "Personalizado";
  const h = host.toLowerCase();
  const u = user.toLowerCase();

  if (
    h.includes("arealproxy") ||
    u.includes("arealproxy") ||
    (user.includes("-country-") && (user.includes("-session-") || user.includes("-time-"))) ||
    user.includes("<NUMERO ALEATORIO DE 6 DIGITOS>")
  ) {
    provider = "Arealproxy (Rotación 6 dígitos)";
  } else if (
    h.includes("smartproxy") ||
    u.startsWith("smart-") ||
    u.startsWith("sp-") ||
    user.includes("_area-") ||
    user.includes("_life-")
  ) {
    provider = "Smartproxy (Sesión dinámica)";
  }

  return { host, port, user, pass, type, provider };
}

function detectProvider(host?: string, user?: string): string | null {
  const h = (host || "").toLowerCase();
  const u = (user || "").toLowerCase();
  if (!h && !u) return null;

  if (
    h.includes("arealproxy") ||
    u.includes("arealproxy") ||
    (u.includes("-country-") && (u.includes("-session-") || u.includes("-time-"))) ||
    u.includes("<numero aleatorio de 6 digitos>")
  ) {
    return "Arealproxy (Rotación 6 dígitos)";
  }
  if (
    h.includes("smartproxy") ||
    u.startsWith("smart-") ||
    u.startsWith("sp-") ||
    u.includes("_area-") ||
    u.includes("_life-")
  ) {
    return "Smartproxy (Sesión dinámica)";
  }
  return null;
}

export default function ConfigPage() {
  const [config, setConfig] = useState<Record<string, string>>({});
  const [visible, setVisible] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [quickPasteBot, setQuickPasteBot] = useState("");
  const [quickPasteGen, setQuickPasteGen] = useState("");
  const [noticeBot, setNoticeBot] = useState("");
  const [noticeGen, setNoticeGen] = useState("");

  useEffect(() => {
    getConfig()
      .then((data) => {
        const map: Record<string, string> = {};
        for (const [k, v] of Object.entries(data)) {
          map[k] = v ?? "";
        }
        setConfig(map);
      })
      .catch(() => {});
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setMessage("");
    try {
      for (const [key, value] of Object.entries(config)) {
        await saveConfig(key, value);
      }
      setMessage("✓ Configuración guardada correctamente");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Error guardando configuración");
    } finally {
      setSaving(false);
      setTimeout(() => setMessage(""), 3500);
    }
  };

  // Manejador cuando se escribe/pega en el input del Servidor o en la caja de pegado rápido
  const handleApplyProxyString = (prefix: "BOT" | "GEN", rawString: string) => {
    const parsed = parseProxyString(rawString);
    if (!parsed) return false;

    if (prefix === "BOT") {
      setConfig((prev) => ({
        ...prev,
        BOT_PROXY_SERVER: parsed.host,
        BOT_PROXY_PORT: parsed.port || prev.BOT_PROXY_PORT || "",
        BOT_PROXY_USER: parsed.user || prev.BOT_PROXY_USER || "",
        BOT_PROXY_PASS: parsed.pass || prev.BOT_PROXY_PASS || "",
        BOT_PROXY_TYPE: parsed.type || prev.BOT_PROXY_TYPE || "http",
      }));
      setNoticeBot(`✓ Auto-detectado: ${parsed.provider} (${parsed.host}:${parsed.port || "?"})`);
      setTimeout(() => setNoticeBot(""), 4000);
    } else {
      setConfig((prev) => ({
        ...prev,
        PROXY_SERVER_2: parsed.host,
        PROXY_PORT_2: parsed.port || prev.PROXY_PORT_2 || "",
        PROXY_USER_2: parsed.user || prev.PROXY_USER_2 || "",
        PROXY_PASS_2: parsed.pass || prev.PROXY_PASS_2 || "",
        PROXY_TYPE_2: parsed.type || prev.PROXY_TYPE_2 || "http",
      }));
      setNoticeGen(`✓ Auto-detectado: ${parsed.provider} (${parsed.host}:${parsed.port || "?"})`);
      setTimeout(() => setNoticeGen(""), 4000);
    }
    return true;
  };

  const handleServerInput = (prefix: "BOT" | "GEN", val: string) => {
    // Si el usuario pega la cadena completa host:port:user:pass en el input de servidor
    if (val.includes(":") && val.split(":").length >= 3) {
      const applied = handleApplyProxyString(prefix, val);
      if (applied) return;
    }
    const key = prefix === "BOT" ? "BOT_PROXY_SERVER" : "PROXY_SERVER_2";
    setConfig((prev) => ({ ...prev, [key]: val }));
  };

  const card = "rounded-2xl border border-white/[0.06] bg-white/[0.025] backdrop-blur-2xl p-6 shadow-[0_8px_40px_rgba(0,0,0,0.45)] mb-6";
  const field = "w-full bg-white/[0.03] border border-white/[0.07] rounded-xl px-4 py-2.5 text-slate-200 placeholder-slate-700 focus:outline-none focus:ring-1 focus:ring-violet-500/25 focus:border-violet-500/20 transition-all text-sm";
  const labelClass = "text-xs text-slate-500 mb-1.5 block";

  const botProvider = detectProvider(config.BOT_PROXY_SERVER, config.BOT_PROXY_USER);
  const genProvider = detectProvider(config.PROXY_SERVER_2, config.PROXY_USER_2);

  return (
    <div>
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-white tracking-tight">Configuración</h1>
          <p className="text-slate-600 text-sm mt-0.5">Configuración global del sistema y proxies</p>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="text-white rounded-xl px-6 py-2.5 flex items-center gap-2.5 text-sm font-medium bg-gradient-to-br from-violet-600 to-purple-700 hover:from-violet-500 hover:to-purple-600 shadow-lg shadow-violet-900/20 transition-all disabled:opacity-50 cursor-pointer self-start md:self-auto"
        >
          {saving ? (
            <>
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Guardando...
            </>
          ) : (
            <>
              <Save size={15} />
              Guardar configuración
            </>
          )}
        </button>
      </div>

      {message && (
        <div className="mb-6 px-4 py-3 rounded-xl bg-violet-500/[0.07] border border-violet-500/[0.12] text-violet-300/90 text-sm">
          {message}
        </div>
      )}

      {/* SECCION 1: PROXY BOT (ATT WORKERS) */}
      <div className={card}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-violet-500/[0.1] border border-violet-500/[0.12]">
              <Server size={14} className="text-violet-400" />
            </div>
            <div>
              <h2 className="text-[14px] font-medium text-white/90 tracking-tight">Proxy Bot (Workers ATT)</h2>
              <p className="text-xs text-slate-500">Configuración del proxy residencial para los workers</p>
            </div>
          </div>
          {botProvider && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-500/10 border border-emerald-500/20 text-emerald-300">
              <Sparkles size={11} />
              {botProvider}
            </span>
          )}
        </div>

        {/* Pegado Rápido y Auto-detección para Bot */}
        <div className="mb-5 p-3.5 rounded-xl bg-violet-950/20 border border-violet-500/15">
          <label className="text-xs font-medium text-violet-300 mb-1.5 block flex items-center gap-1.5">
            <Sparkles size={13} className="text-violet-400" />
            Pegado Rápido / Auto-detección Proxy Bot (host:port:user:pass o URL):
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={quickPasteBot}
              onChange={(e) => setQuickPasteBot(e.target.value)}
              onPaste={(e) => {
                const pasted = e.clipboardData.getData("text");
                if (pasted) {
                  handleApplyProxyString("BOT", pasted);
                  setTimeout(() => setQuickPasteBot(""), 200);
                }
              }}
              placeholder="ej: unlimited-resi5075.proxy.arealproxy.com:32123:user:pass"
              className={field}
            />
            <button
              type="button"
              onClick={() => {
                if (quickPasteBot) {
                  handleApplyProxyString("BOT", quickPasteBot);
                  setQuickPasteBot("");
                }
              }}
              className="px-4 py-2 text-xs font-medium text-violet-200 bg-violet-500/20 hover:bg-violet-500/30 border border-violet-500/30 rounded-xl transition-all cursor-pointer whitespace-nowrap"
            >
              Auto-detectar
            </button>
          </div>
          {noticeBot && (
            <p className="text-xs text-emerald-400 font-medium mt-2 animate-fadeIn">{noticeBot}</p>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className={labelClass}>Servidor / Host (o pegar completo)</label>
            <input
              type="text"
              value={config.BOT_PROXY_SERVER ?? ""}
              onChange={(e) => handleServerInput("BOT", e.target.value)}
              className={field}
              placeholder="proxy.example.com o host:port:user:pass"
            />
          </div>

          <div>
            <label className={labelClass}>Puerto</label>
            <input
              type="text"
              value={config.BOT_PROXY_PORT ?? ""}
              onChange={(e) => setConfig({ ...config, BOT_PROXY_PORT: e.target.value })}
              className={field}
              placeholder="3120"
            />
          </div>

          <div>
            <label className={labelClass}>Tipo (http / socks5)</label>
            <input
              type="text"
              value={config.BOT_PROXY_TYPE ?? ""}
              onChange={(e) => setConfig({ ...config, BOT_PROXY_TYPE: e.target.value })}
              className={field}
              placeholder="http"
            />
          </div>

          <div>
            <label className={labelClass}>Usuario</label>
            <input
              type="text"
              value={config.BOT_PROXY_USER ?? ""}
              onChange={(e) => setConfig({ ...config, BOT_PROXY_USER: e.target.value })}
              className={field}
              placeholder="Usuario o formato con -session-"
            />
          </div>

          <div>
            <label className={labelClass}>Contraseña</label>
            <div className="relative">
              <input
                type={visible["BOT_PROXY_PASS"] ? "text" : "password"}
                value={config.BOT_PROXY_PASS ?? ""}
                onChange={(e) => setConfig({ ...config, BOT_PROXY_PASS: e.target.value })}
                className={field}
                placeholder="Contraseña"
              />
              <button
                type="button"
                onClick={() => setVisible({ ...visible, BOT_PROXY_PASS: !visible["BOT_PROXY_PASS"] })}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-400 cursor-pointer"
              >
                {visible["BOT_PROXY_PASS"] ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* SECCION 2: PROXY GENERADOR (PERFILES / LEADS) */}
      <div className={card}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-purple-500/[0.1] border border-purple-500/[0.12]">
              <Settings size={14} className="text-purple-400" />
            </div>
            <div>
              <h2 className="text-[14px] font-medium text-white/90 tracking-tight">Proxy Generador (Perfiles / Secuencias)</h2>
              <p className="text-xs text-slate-500">Configuración del proxy para el generador de perfiles</p>
            </div>
          </div>
          {genProvider && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-500/10 border border-emerald-500/20 text-emerald-300">
              <Sparkles size={11} />
              {genProvider}
            </span>
          )}
        </div>

        {/* Pegado Rápido y Auto-detección para Generador */}
        <div className="mb-5 p-3.5 rounded-xl bg-purple-950/20 border border-purple-500/15">
          <label className="text-xs font-medium text-purple-300 mb-1.5 block flex items-center gap-1.5">
            <Sparkles size={13} className="text-purple-400" />
            Pegado Rápido / Auto-detección Proxy Generador (host:port:user:pass o URL):
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={quickPasteGen}
              onChange={(e) => setQuickPasteGen(e.target.value)}
              onPaste={(e) => {
                const pasted = e.clipboardData.getData("text");
                if (pasted) {
                  handleApplyProxyString("GEN", pasted);
                  setTimeout(() => setQuickPasteGen(""), 200);
                }
              }}
              placeholder="ej: unlimited-resi5075.proxy.arealproxy.com:32123:user:pass"
              className={field}
            />
            <button
              type="button"
              onClick={() => {
                if (quickPasteGen) {
                  handleApplyProxyString("GEN", quickPasteGen);
                  setQuickPasteGen("");
                }
              }}
              className="px-4 py-2 text-xs font-medium text-purple-200 bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/30 rounded-xl transition-all cursor-pointer whitespace-nowrap"
            >
              Auto-detectar
            </button>
          </div>
          {noticeGen && (
            <p className="text-xs text-emerald-400 font-medium mt-2 animate-fadeIn">{noticeGen}</p>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className={labelClass}>Servidor / Host (o pegar completo)</label>
            <input
              type="text"
              value={config.PROXY_SERVER_2 ?? ""}
              onChange={(e) => handleServerInput("GEN", e.target.value)}
              className={field}
              placeholder="proxy.example.com o host:port:user:pass"
            />
          </div>

          <div>
            <label className={labelClass}>Puerto</label>
            <input
              type="text"
              value={config.PROXY_PORT_2 ?? ""}
              onChange={(e) => setConfig({ ...config, PROXY_PORT_2: e.target.value })}
              className={field}
              placeholder="3120"
            />
          </div>

          <div>
            <label className={labelClass}>Tipo (http / socks5)</label>
            <input
              type="text"
              value={config.PROXY_TYPE_2 ?? ""}
              onChange={(e) => setConfig({ ...config, PROXY_TYPE_2: e.target.value })}
              className={field}
              placeholder="http"
            />
          </div>

          <div>
            <label className={labelClass}>Usuario</label>
            <input
              type="text"
              value={config.PROXY_USER_2 ?? ""}
              onChange={(e) => setConfig({ ...config, PROXY_USER_2: e.target.value })}
              className={field}
              placeholder="Usuario o formato con -session-"
            />
          </div>

          <div>
            <label className={labelClass}>Contraseña</label>
            <div className="relative">
              <input
                type={visible["PROXY_PASS_2"] ? "text" : "password"}
                value={config.PROXY_PASS_2 ?? ""}
                onChange={(e) => setConfig({ ...config, PROXY_PASS_2: e.target.value })}
                className={field}
                placeholder="Contraseña"
              />
              <button
                type="button"
                onClick={() => setVisible({ ...visible, PROXY_PASS_2: !visible["PROXY_PASS_2"] })}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-400 cursor-pointer"
              >
                {visible["PROXY_PASS_2"] ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* SECCION 3: CLAVES DE ACCESO Y LICENCIAS */}
      <div className={card}>
        <div className="flex items-center gap-2.5 mb-5">
          <div className="p-1.5 rounded-lg bg-amber-500/[0.1] border border-amber-500/[0.12]">
            <Key size={14} className="text-amber-400" />
          </div>
          <div>
            <h2 className="text-[14px] font-medium text-white/90 tracking-tight">Claves de Acceso y Licencias</h2>
            <p className="text-xs text-slate-500">Credenciales maestras de servicios externos</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>GoLogin API Key</label>
            <div className="relative">
              <input
                type={visible["KEYABS"] ? "text" : "password"}
                value={config.KEYABS ?? ""}
                onChange={(e) => setConfig({ ...config, KEYABS: e.target.value })}
                className={field}
                placeholder="GoLogin API Key"
              />
              <button
                type="button"
                onClick={() => setVisible({ ...visible, KEYABS: !visible["KEYABS"] })}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-400 cursor-pointer"
              >
                {visible["KEYABS"] ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>

          <div>
            <label className={labelClass}>Cryptolens Key</label>
            <div className="relative">
              <input
                type={visible["KEY"] ? "text" : "password"}
                value={config.KEY ?? ""}
                onChange={(e) => setConfig({ ...config, KEY: e.target.value })}
                className={field}
                placeholder="Cryptolens Key"
              />
              <button
                type="button"
                onClick={() => setVisible({ ...visible, KEY: !visible["KEY"] })}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-400 cursor-pointer"
              >
                {visible["KEY"] ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
