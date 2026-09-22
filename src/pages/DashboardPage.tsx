import { useEffect, useState } from "react";
import { Users, Target, ListOrdered, Clock, Phone } from "lucide-react";
import { fetchDashboardStats, getLeadCounts, getHitCount } from "../api/clientApi";

export default function DashboardPage() {
  const [stats, setStats] = useState({ totalLeads: 0, pendingLeads: 0, hits: 0, totalSequences: 0 });
  const [leadCounts, setLeadCounts] = useState({ total: 0, pending: 0 });
  const [hitCount, setHitCount] = useState(0);
  const [online, setOnline] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const [s, lc, hc] = await Promise.all([
          fetchDashboardStats(),
          getLeadCounts(),
          getHitCount(),
        ]);
        setStats(s);
        setLeadCounts(lc);
        setHitCount(hc);
        setOnline(true);
      } catch {
        setOnline(false);
      }
    };
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, []);

  const card = "rounded-2xl border border-white/[0.06] bg-white/[0.025] backdrop-blur-2xl p-6 shadow-[0_8px_40px_rgba(0,0,0,0.45)]";

  const statCards = [
    {
      label: "Total Leads",
      value: stats.totalLeads.toLocaleString(),
      icon: Phone,
      color: "text-violet-400",
      bg: "bg-violet-500/[0.1]",
    },
    {
      label: "Pendientes",
      value: stats.pendingLeads.toLocaleString(),
      icon: Clock,
      color: "text-amber-400",
      bg: "bg-amber-500/[0.1]",
    },
    {
      label: "Hits",
      value: stats.hits.toLocaleString(),
      icon: Target,
      color: "text-emerald-400",
      bg: "bg-emerald-500/[0.1]",
    },
    {
      label: "Secuencias",
      value: stats.totalSequences,
      icon: ListOrdered,
      color: "text-indigo-400",
      bg: "bg-indigo-500/[0.1]",
    },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-xl font-semibold text-white tracking-tight">Dashboard</h1>
          <p className="text-slate-600 text-sm mt-0.5">Resumen operativo</p>
        </div>
        <div
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[11px] font-medium ${
            online
              ? "bg-emerald-500/[0.06] border-emerald-500/[0.1] text-emerald-400/70"
              : "bg-rose-500/[0.06] border-rose-500/[0.1] text-rose-400/70"
          }`}
        >
          <span
            className={`w-1.5 h-1.5 rounded-full ${online ? "bg-emerald-400 animate-pulse" : "bg-rose-400"}`}
          />
          {online ? "Conectado" : "Sin conexión"}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map((s) => (
          <div key={s.label} className={card}>
            <div className="flex items-center justify-between mb-4">
              <span className="text-slate-500 text-xs font-medium uppercase tracking-wider">{s.label}</span>
              <div className={`p-2 rounded-lg ${s.bg} border border-white/[0.06]`}>
                <s.icon size={16} className={s.color} />
              </div>
            </div>
            <span className="text-3xl font-semibold bg-gradient-to-br from-white to-slate-300 bg-clip-text text-transparent tabular-nums">
              {s.value}
            </span>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className={card}>
          <h3 className="text-sm font-medium text-white/70 mb-4">Estado de Leads</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2 px-3 rounded-xl bg-white/[0.02] border border-white/[0.05]">
              <span className="text-slate-400 text-sm">Total</span>
              <span className="text-white font-semibold">{leadCounts.total.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between py-2 px-3 rounded-xl bg-white/[0.02] border border-white/[0.05]">
              <span className="text-slate-400 text-sm">Pendientes</span>
              <span className="text-amber-400 font-semibold">{leadCounts.pending.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between py-2 px-3 rounded-xl bg-white/[0.02] border border-white/[0.05]">
              <span className="text-slate-400 text-sm">Procesados</span>
              <span className="text-emerald-400 font-semibold">
                {(leadCounts.total - leadCounts.pending).toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        <div className={card}>
          <h3 className="text-sm font-medium text-white/70 mb-4">Resumen de Hits</h3>
          <div className="flex items-center gap-4 p-4 rounded-xl bg-emerald-500/[0.04] border border-emerald-500/[0.08]">
            <div className="p-3 rounded-xl bg-emerald-500/[0.1] border border-emerald-500/[0.12]">
              <Target className="text-emerald-400" size={24} />
            </div>
            <div>
              <div className="text-3xl font-semibold text-white tabular-nums">{hitCount.toLocaleString()}</div>
              <div className="text-slate-500 text-xs mt-0.5">Total hits encontrados</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
