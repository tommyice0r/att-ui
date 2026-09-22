import { useState, useEffect } from "react";
import { Settings, Save, Eye, EyeOff } from "lucide-react";
import { getConfig, saveConfig } from "../api/clientApi";

const CONFIG_KEYS = [
  { key: "KEYABS", label: "GoLogin API Key", type: "password" },
  { key: "KEY", label: "Cryptolens Key", type: "password" },
  { key: "PROXY_TYPE_2", label: "Proxy Generador Tipo", type: "text" },
  { key: "PROXY_SERVER_2", label: "Proxy Generador Servidor", type: "text" },
  { key: "PROXY_PORT_2", label: "Proxy Generador Puerto", type: "text" },
  { key: "PROXY_USER_2", label: "Proxy Generador Usuario", type: "text" },
  { key: "PROXY_PASS_2", label: "Proxy Generador Contraseña", type: "password" },
];

export default function ConfigPage() {
  const [config, setConfig] = useState<Record<string, string>>({});
  const [visible, setVisible] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

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
      setMessage("✓ Configuración guardada");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Error");
    } finally {
      setSaving(false);
      setTimeout(() => setMessage(""), 3000);
    }
  };

  const card = "rounded-2xl border border-white/[0.06] bg-white/[0.025] backdrop-blur-2xl p-6 shadow-[0_8px_40px_rgba(0,0,0,0.45)]";
  const field = "w-full bg-white/[0.03] border border-white/[0.07] rounded-xl px-4 py-2.5 text-slate-200 placeholder-slate-700 focus:outline-none focus:ring-1 focus:ring-violet-500/25 focus:border-violet-500/20 transition-all text-sm";

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-xl font-semibold text-white tracking-tight">Configuración</h1>
        <p className="text-slate-600 text-sm mt-0.5">Configuración global del sistema</p>
      </div>

      {message && (
        <div className="mb-6 px-4 py-3 rounded-xl bg-violet-500/[0.07] border border-violet-500/[0.12] text-violet-300/90 text-sm">
          {message}
        </div>
      )}

      <div className={card}>
        <div className="flex items-center gap-2.5 mb-5">
          <div className="p-1.5 rounded-lg bg-violet-500/[0.1] border border-violet-500/[0.12]">
            <Settings size={12} className="text-violet-400/80" />
          </div>
          <h2 className="text-[13px] font-medium text-white/70 tracking-tight">Parámetros</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {CONFIG_KEYS.map(({ key, label, type }) => (
            <div key={key}>
              <label className="text-xs text-slate-500 mb-1.5 block">{label}</label>
              <div className="relative">
                <input
                  type={visible[key] ? "text" : type}
                  value={config[key] ?? ""}
                  onChange={(e) => setConfig({ ...config, [key]: e.target.value })}
                  className={field}
                  placeholder={label}
                />
                {type === "password" && (
                  <button
                    onClick={() => setVisible({ ...visible, [key]: !visible[key] })}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-400"
                  >
                    {visible[key] ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="text-white rounded-xl px-6 py-2.5 flex items-center gap-2.5 text-sm font-medium bg-gradient-to-br from-violet-600 to-purple-700 hover:from-violet-500 hover:to-purple-600 shadow-lg shadow-violet-900/20 transition-all disabled:opacity-50"
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
    </div>
  );
}
