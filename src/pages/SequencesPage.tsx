import { useState, useEffect } from "react";
import { ListOrdered, Plus, CheckCircle, XCircle, Clock, MapPin, Loader } from "lucide-react";
import { getSequences, createSequence } from "../api/clientApi";

export default function SequencesPage() {
  const [sequences, setSequences] = useState<Array<{
    id: number;
    sequence: string;
    stateCode: string | null;
    stateName: string | null;
    totalLeads: number;
    status: string;
    createdAt: string;
    completedAt: string | null;
  }>>([]);
  const [newSeq, setNewSeq] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const loadSequences = async () => {
    try {
      const data = await getSequences();
      setSequences(data);
    } catch {}
  };

  useEffect(() => { loadSequences(); }, []);

  const handleCreate = async () => {
    if (!newSeq.trim()) return;
    setLoading(true);
    setMessage("");
    try {
      await createSequence(newSeq.trim());
      setNewSeq("");
      setMessage("✓ Secuencia creada — el bot la procesara cuando este disponible");
      await loadSequences();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(false);
      setTimeout(() => setMessage(""), 4000);
    }
  };

  const card = "rounded-2xl border border-white/[0.06] bg-white/[0.025] backdrop-blur-2xl p-6 shadow-[0_8px_40px_rgba(0,0,0,0.45)]";
  const field = "w-full bg-white/[0.03] border border-white/[0.07] rounded-xl px-4 py-2.5 text-slate-200 placeholder-slate-700 focus:outline-none focus:ring-1 focus:ring-violet-500/25 focus:border-violet-500/20 transition-all text-sm";

  const statusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return { icon: CheckCircle, color: "text-emerald-400 bg-emerald-500/[0.1] border-emerald-500/[0.2]" };
      case "processing":
        return { icon: Loader, color: "text-amber-400 bg-amber-500/[0.1] border-amber-500/[0.2]" };
      case "failed":
        return { icon: XCircle, color: "text-rose-400 bg-rose-500/[0.1] border-rose-500/[0.2]" };
      default:
        return { icon: Clock, color: "text-slate-400 bg-white/[0.04] border-white/[0.08]" };
    }
  };

  const statusText = (status: string) => {
    switch (status) {
      case "completed": return "Completada";
      case "processing": return "En progreso";
      case "failed": return "Fallida";
      default: return "Pendiente";
    }
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-xl font-semibold text-white tracking-tight">Secuencias</h1>
        <p className="text-slate-600 text-sm mt-0.5">Agrega secuencias NPA-NXX. El bot las procesa automaticamente.</p>
      </div>

      {message && (
        <div className="mb-6 px-4 py-3 rounded-xl bg-violet-500/[0.07] border border-violet-500/[0.12] text-violet-300/90 text-sm">
          {message}
        </div>
      )}

      <div className={card}>
        <div className="flex items-center gap-2.5 mb-5">
          <div className="p-1.5 rounded-lg bg-indigo-500/[0.1] border border-indigo-500/[0.12]">
            <ListOrdered size={12} className="text-indigo-400/80" />
          </div>
          <h2 className="text-[13px] font-medium text-white/70 tracking-tight">Nueva secuencia</h2>
        </div>

        <div className="flex gap-3 mb-6">
          <input
            value={newSeq}
            onChange={(e) => setNewSeq(e.target.value)}
            className={field}
            placeholder="Ej: 786200"
            maxLength={6}
          />
          <button
            onClick={handleCreate}
            disabled={loading || !newSeq.trim()}
            className="shrink-0 text-white rounded-xl px-5 py-2.5 flex items-center gap-2 text-sm font-medium bg-gradient-to-br from-violet-600 to-purple-700 hover:from-violet-500 hover:to-purple-600 shadow-lg shadow-violet-900/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus size={15} />
            Agregar
          </button>
        </div>

        <div className="border-t border-white/[0.05] pt-5">
          <h3 className="text-xs font-medium text-slate-500 mb-3 uppercase tracking-wider">
            Historial ({sequences.length})
          </h3>
          {sequences.length === 0 ? (
            <p className="text-slate-700 text-sm py-8 text-center">No hay secuencias todavia</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {sequences.map((seq) => {
                const badge = statusBadge(seq.status);
                const Icon = badge.icon;
                return (
                  <div key={seq.id} className="bg-white/[0.02] border border-white/[0.05] rounded-xl p-4 hover:bg-white/[0.04] transition-all">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-mono font-semibold text-violet-300/90 text-sm">{seq.sequence}</span>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-semibold ${badge.color}`}>
                        <Icon size={10} className={seq.status === "processing" ? "animate-spin" : ""} />
                        {statusText(seq.status)}
                      </span>
                    </div>
                    {seq.stateName && (
                      <div className="flex items-center gap-1 text-xs text-slate-500 mb-2">
                        <MapPin size={10} />
                        {seq.stateName} ({seq.stateCode})
                      </div>
                    )}
                    <div className="flex items-center justify-between text-xs text-slate-600">
                      <span>{seq.totalLeads > 0 ? `${seq.totalLeads.toLocaleString()} leads` : "—"}</span>
                      <span>{new Date(seq.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
