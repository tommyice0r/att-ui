import { useState, useEffect } from "react";
import { Target, Search, Download } from "lucide-react";
import { getHits } from "../api/clientApi";

export default function HitsPage() {
  const [hits, setHits] = useState<
    Array<{
      id: number;
      phoneNumber: string;
      fullName: string | null;
      address: string | null;
      zipCode: string | null;
      deviceMessage: string | null;
      hitType: string | null;
      createdAt: string;
    }>
  >([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getHits()
      .then(setHits)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = search
    ? hits.filter(
        (h) =>
          h.phoneNumber.includes(search) ||
          h.fullName?.toLowerCase().includes(search.toLowerCase())
      )
    : hits;

  const card = "rounded-2xl border border-white/[0.06] bg-white/[0.025] backdrop-blur-2xl p-6 shadow-[0_8px_40px_rgba(0,0,0,0.45)]";
  const field = "w-full bg-white/[0.03] border border-white/[0.07] rounded-xl px-4 py-2.5 text-slate-200 placeholder-slate-700 focus:outline-none focus:ring-1 focus:ring-violet-500/25 focus:border-violet-500/20 transition-all text-sm";

  const downloadCSV = () => {
    const header = "PhoneNumber,FullName,Address,ZipCode,DeviceMessage,HitType,CreatedAt\n";
    const csv = header + filtered
      .map(
        (h) =>
          `"${h.phoneNumber}","${h.fullName ?? ""}","${h.address ?? ""}","${h.zipCode ?? ""}","${h.deviceMessage ?? ""}","${h.hitType ?? ""}","${h.createdAt}"`
      )
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `hits_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-xl font-semibold text-white tracking-tight">Hits</h1>
          <p className="text-slate-600 text-sm mt-0.5">Números elegibles detectados</p>
        </div>
        {hits.length > 0 && (
          <button
            onClick={downloadCSV}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/[0.09] border border-emerald-500/[0.14] text-emerald-300/80 text-sm font-medium hover:bg-emerald-500/[0.15] transition-all"
          >
            <Download size={14} />
            Exportar CSV
          </button>
        )}
      </div>

      <div className={card}>
        <div className="flex items-center gap-3 mb-5">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-600" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={`${field} pl-10`}
              placeholder="Buscar por teléfono o nombre..."
            />
          </div>
          <div className="text-slate-500 text-xs">
            {filtered.length} de {hits.length}
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <svg className="animate-spin h-6 w-6 text-violet-400/50" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
              <path className="opacity-60" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12">
            <Target className="mx-auto text-slate-700 mb-3" size={32} />
            <p className="text-slate-600 text-sm">
              {search ? "Sin resultados" : "Aún no hay hits registrados"}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.05]">
                  <th className="text-left py-3 px-2 text-slate-600 font-medium text-xs uppercase tracking-wider">Teléfono</th>
                  <th className="text-left py-3 px-2 text-slate-600 font-medium text-xs uppercase tracking-wider">Nombre</th>
                  <th className="text-left py-3 px-2 text-slate-600 font-medium text-xs uppercase tracking-wider">Dirección</th>
                  <th className="text-left py-3 px-2 text-slate-600 font-medium text-xs uppercase tracking-wider">Zip</th>
                  <th className="text-left py-3 px-2 text-slate-600 font-medium text-xs uppercase tracking-wider">Dispositivo</th>
                  <th className="text-left py-3 px-2 text-slate-600 font-medium text-xs uppercase tracking-wider">Tipo</th>
                  <th className="text-left py-3 px-2 text-slate-600 font-medium text-xs uppercase tracking-wider">Fecha</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((hit) => (
                  <tr key={hit.id} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                    <td className="py-3 px-2 font-mono text-violet-300/80 text-xs">{hit.phoneNumber}</td>
                    <td className="py-3 px-2 text-slate-300 text-xs">{hit.fullName || "-"}</td>
                    <td className="py-3 px-2 text-slate-500 text-xs max-w-[200px] truncate">{hit.address || "-"}</td>
                    <td className="py-3 px-2 text-slate-500 text-xs">{hit.zipCode || "-"}</td>
                    <td className="py-3 px-2 text-slate-500 text-xs max-w-[200px] truncate">{hit.deviceMessage || "-"}</td>
                    <td className="py-3 px-2">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                          hit.hitType === "HIT"
                            ? "bg-emerald-500/[0.1] text-emerald-400/80"
                            : "bg-amber-500/[0.1] text-amber-400/80"
                        }`}
                      >
                        {hit.hitType || "-"}
                      </span>
                    </td>
                    <td className="py-3 px-2 text-slate-600 text-xs">
                      {new Date(hit.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
