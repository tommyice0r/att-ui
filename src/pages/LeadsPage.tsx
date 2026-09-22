import { useState, useEffect } from "react";
import { Upload, Phone, CheckCircle, Clock } from "lucide-react";
import { uploadLeads, getLeadCounts } from "../api/clientApi";

export default function LeadsPage() {
  const [leadsText, setLeadsText] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ imported: number } | null>(null);
  const [error, setError] = useState("");
  const [counts, setCounts] = useState({ total: 0, pending: 0 });

  useEffect(() => {
    getLeadCounts()
      .then(setCounts)
      .catch(() => {});
  }, []);

  const handleUpload = async () => {
    if (!leadsText.trim()) return;
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const r = await uploadLeads(leadsText);
      setResult(r);
      setLeadsText("");
      const updated = await getLeadCounts();
      setCounts(updated);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al subir leads");
    } finally {
      setLoading(false);
    }
  };

  const card = "rounded-2xl border border-white/[0.06] bg-white/[0.025] backdrop-blur-2xl p-6 shadow-[0_8px_40px_rgba(0,0,0,0.45)]";
  const field = "w-full bg-white/[0.03] border border-white/[0.07] rounded-xl px-4 py-2.5 text-slate-200 placeholder-slate-700 focus:outline-none focus:ring-1 focus:ring-violet-500/25 focus:border-violet-500/20 transition-all text-sm";

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-xl font-semibold text-white tracking-tight">Leads</h1>
        <p className="text-slate-600 text-sm mt-0.5">Gestiona tus leads</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className={card}>
            <div className="flex items-center gap-2.5 mb-5">
              <div className="p-1.5 rounded-lg bg-violet-500/[0.1] border border-violet-500/[0.12]">
                <Upload size={12} className="text-violet-400/80" />
              </div>
              <h2 className="text-[13px] font-medium text-white/70 tracking-tight">Importar Leads</h2>
            </div>

            <textarea
              value={leadsText}
              onChange={(e) => setLeadsText(e.target.value)}
              className={`${field} h-64 resize-none font-mono text-xs leading-relaxed`}
              placeholder={`Formato: telefono:nombre:direccion:zip\nEjemplo:\n7861234567:Juan Perez:Calle 123, Miami:33101\n3059876543:Maria Garcia:Ave 456, Hialeah:33010`}
            />

            <div className="flex items-center gap-3 mt-4">
              <button
                onClick={handleUpload}
                disabled={loading || !leadsText.trim()}
                className="text-white rounded-xl px-5 py-2.5 flex items-center gap-2.5 text-sm font-medium bg-gradient-to-br from-violet-600 to-purple-700 hover:from-violet-500 hover:to-purple-600 shadow-lg shadow-violet-900/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Importando...
                  </>
                ) : (
                  <>
                    <Upload size={15} />
                    Importar Leads
                  </>
                )}
              </button>

              {leadsText.trim() && (
                <span className="text-slate-600 text-xs">
                  {leadsText.trim().split("\n").length} lead(s)
                </span>
              )}
            </div>

            {error && (
              <div className="mt-4 px-4 py-3 rounded-xl bg-rose-500/[0.07] border border-rose-500/[0.12] text-rose-300/80 text-sm">
                {error}
              </div>
            )}

            {result && (
              <div className="mt-4 px-4 py-3 rounded-xl bg-emerald-500/[0.07] border border-emerald-500/[0.12] text-emerald-300/80 text-sm flex items-center gap-2">
                <CheckCircle size={14} />
                Se importaron {result.imported} leads correctamente
              </div>
            )}
          </div>
        </div>

        <div className="space-y-5">
          <div className={card}>
            <div className="flex items-center gap-2 mb-4">
              <Phone size={14} className="text-violet-400/80" />
              <h3 className="text-sm font-medium text-white/70">Estado</h3>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between py-2 px-3 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                <span className="text-slate-500 text-xs">Total</span>
                <span className="text-white font-semibold text-sm">{counts.total.toLocaleString()}</span>
              </div>
              <div className="flex justify-between py-2 px-3 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                <span className="text-slate-500 text-xs">Pendientes</span>
                <span className="text-amber-400 font-semibold text-sm">{counts.pending.toLocaleString()}</span>
              </div>
              <div className="flex justify-between py-2 px-3 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                <span className="text-slate-500 text-xs">Procesados</span>
                <span className="text-emerald-400 font-semibold text-sm">
                  {(counts.total - counts.pending).toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          <div className={card}>
            <div className="flex items-center gap-2 mb-4">
              <Clock size={14} className="text-amber-400/80" />
              <h3 className="text-sm font-medium text-white/70">Formato</h3>
            </div>
            <div className="text-xs text-slate-500 space-y-2 leading-relaxed">
              <p>Cada línea debe tener el formato:</p>
              <code className="block bg-white/[0.03] border border-white/[0.05] rounded-lg p-3 text-slate-400 font-mono">
                telefono:nombre:direccion:zip
              </code>
              <p className="text-slate-600">Solo el teléfono es obligatorio.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
