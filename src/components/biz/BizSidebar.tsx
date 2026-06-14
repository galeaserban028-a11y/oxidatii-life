import { Link } from "@tanstack/react-router";
import {
  LayoutDashboard, Calendar, Megaphone, Activity, Settings2,
  BarChart3, Eye, ShieldCheck, Sparkles, Rocket, Zap,
} from "lucide-react";

const NAV = [
  { id: "dashboard",   label: "Dashboard",       icon: LayoutDashboard },
  { id: "events",      label: "Evenimente",      icon: Calendar },
  { id: "campaigns",   label: "Campanii",        icon: Megaphone },
  { id: "live",        label: "Live Activities", icon: Activity },
  { id: "manager",     label: "Manager",         icon: Settings2 },
  { id: "stats",       label: "Statistici",      icon: BarChart3 },
  { id: "visibility",  label: "Vizibilitate",    icon: Eye },
  { id: "reputation",  label: "Reputație",       icon: ShieldCheck },
  { id: "recom",       label: "Recomandări",     icon: Sparkles },
  { id: "promo",       label: "Promovare",       icon: Rocket },
] as const;

function scrollTo(id: string) {
  const el = document.getElementById(`biz-${id}`);
  if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
}

export function BizSidebar() {
  return (
    <aside className="hidden lg:flex flex-col w-[220px] shrink-0 sticky top-4 self-start gap-6 h-[calc(100vh-2rem)]">
      {/* Logo */}
      <div className="flex items-center gap-2 px-2">
        <div className="w-7 h-7 rounded-lg grid place-items-center" style={{ background: "var(--gradient-sunset)" }}>
          <Zap size={14} className="text-black" strokeWidth={2.5} />
        </div>
        <span className="font-display uppercase text-sm tracking-[0.2em] text-white">Nightlife</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 flex flex-col gap-1 overflow-y-auto px-1">
        {NAV.map((n, i) => (
          <button key={n.id} onClick={() => scrollTo(n.id)}
            className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all ${
              i === 0
                ? "bg-gradient-to-r from-sunset-magenta/20 to-transparent border border-sunset-magenta/30 text-white"
                : "text-zinc-400 hover:text-white hover:bg-white/[0.03] border border-transparent"
            }`}>
            <n.icon size={14} className={i === 0 ? "text-sunset-magenta" : ""} />
            <span className="text-[12px] font-medium">{n.label}</span>
          </button>
        ))}
      </nav>

      {/* Upsell */}
      <div className="rounded-2xl p-4 bg-gradient-to-br from-sunset-magenta/15 via-violet-500/10 to-transparent border border-sunset-magenta/20 backdrop-blur">
        <div className="font-display uppercase text-[13px] leading-tight">
          Du-ți clubul la nivelul următor!
        </div>
        <p className="text-[10px] text-zinc-400 mt-1.5 leading-snug">
          Upgradează la un plan superior și domnește orașul.
        </p>
        <Link to="/app/biz/plans"
          className="mt-3 inline-flex items-center gap-1 px-3 py-2 rounded-xl text-[10px] font-mono uppercase tracking-widest font-bold text-white"
          style={{ background: "var(--gradient-sunset)" }}>
          Vezi Planuri
        </Link>
      </div>
    </aside>
  );
}
