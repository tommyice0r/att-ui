import { NavLink } from "react-router";
import { Bot, LayoutDashboard, Phone, ListOrdered, Target, Settings, LogOut } from "lucide-react";
import { clearSession } from "../auth/authApi";

const navItems = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/sequences", label: "Secuencias", icon: ListOrdered },
  { to: "/hits", label: "Hits", icon: Target },
  { to: "/config", label: "Config", icon: Settings },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const handleLogout = () => {
    clearSession();
    window.location.href = "/";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#08080f] via-[#0c0c1e] to-[#08080f] text-slate-200">
      <div className="flex">
        {/* Sidebar */}
        <aside className="w-56 min-h-screen border-r border-white/[0.05] bg-[#08080f]/50 backdrop-blur-2xl p-4 flex flex-col shrink-0">
          <div className="flex items-center gap-2.5 mb-8 px-2">
            <div className="p-1.5 rounded-lg bg-violet-600/20 border border-violet-500/[0.14]">
              <Bot className="text-violet-400" size={18} />
            </div>
            <div>
              <div className="text-sm font-semibold text-white tracking-tight">ATT BOT</div>
              <div className="text-[9px] text-slate-600">Panel operativo</div>
            </div>
          </div>

          <nav className="space-y-1 flex-1">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    isActive
                      ? "bg-violet-500/[0.1] text-violet-300 border border-violet-500/[0.14]"
                      : "text-slate-500 hover:text-slate-300 hover:bg-white/[0.03]"
                  }`
                }
              >
                <item.icon size={16} />
                {item.label}
              </NavLink>
            ))}
          </nav>

          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-600 hover:text-slate-400 hover:bg-white/[0.03] transition-all mt-2"
          >
            <LogOut size={16} />
            Salir
          </button>
        </aside>

        {/* Content */}
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
