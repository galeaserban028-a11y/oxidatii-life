import { Link, useLocation } from "@tanstack/react-router";
import { Newspaper, Trophy, Camera, User, MapPin } from "lucide-react";

type Tab = { to: string; icon: typeof Newspaper; label: string; primary?: boolean; exact?: boolean };
const tabs: Tab[] = [
  { to: "/app", icon: Newspaper, label: "Live", exact: true },
  { to: "/app/top", icon: Trophy, label: "Top" },
  { to: "/app/scan", icon: Camera, label: "Șpriț", primary: true },
  { to: "/app/map", icon: MapPin, label: "Hartă" },
  { to: "/app/me", icon: User, label: "Eu" },
];

export function BottomTabBar() {
  const loc = useLocation();
  return (
    <nav className="fixed bottom-0 inset-x-0 z-50 pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto max-w-md">
        <div className="m-2 rounded-2xl glass border border-foreground/10 grid grid-cols-5 backdrop-blur-xl">
          {tabs.map(t => {
            const active = t.exact ? loc.pathname === t.to : (loc.pathname === t.to || loc.pathname.startsWith(t.to + "/"));
            const Icon = t.icon;
            return (
              <Link key={t.to} to={t.to as any}
                className="flex flex-col items-center gap-0.5 py-2.5 relative">
                <div className={`flex items-center justify-center rounded-xl transition ${
                  t.primary
                    ? "h-11 w-11 -mt-5 bg-gradient-to-br from-neon-crimson to-neon-purple text-white shadow-[0_0_20px_var(--neon-crimson)]"
                    : `h-7 w-7 ${active ? "text-neon-crimson" : "text-muted-foreground"}`
                }`}>
                  <Icon size={t.primary ? 22 : 20} strokeWidth={2.2} />
                </div>
                <span className={`text-[10px] font-mono uppercase tracking-wider ${
                  active && !t.primary ? "text-neon-crimson" : "text-muted-foreground"
                }`}>{t.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
