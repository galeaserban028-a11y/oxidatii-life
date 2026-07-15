import { createFileRoute, Outlet, Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect } from "react";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import {
  LayoutDashboard,
  Users,
  Flame,
  Building2,
  Megaphone,
  MapPin,
  Flag,
  ShieldAlert,
  Bug,
} from "lucide-react";

export const Route = createFileRoute("/app/admin")({
  component: AdminLayout,
});

export const adminNav = [
  {
    to: "/app/admin",
    label: "Panou",
    icon: LayoutDashboard,
    exact: true,
    accent: "#ffffff",
    desc: "Vedere de ansamblu",
  },
  {
    to: "/app/admin/users",
    label: "Useri",
    icon: Users,
    accent: "#00e5ff",
    desc: "Acordă coins, ranguri, roluri",
  },
  {
    to: "/app/admin/content",
    label: "Conținut",
    icon: Flame,
    accent: "#ff3d8b",
    desc: "Faze, sprits, comentarii",
  },
  {
    to: "/app/admin/businesses",
    label: "Businesses",
    icon: Building2,
    accent: "#00e5ff",
    desc: "Conturi, verificare, tier",
  },
  {
    to: "/app/admin/campaigns",
    label: "Campanii",
    icon: Megaphone,
    accent: "#c724ff",
    desc: "Promo & boost-uri",
  },
  {
    to: "/app/admin/places",
    label: "Locații",
    icon: MapPin,
    accent: "#ffd166",
    desc: "Orașe & venues",
  },
  {
    to: "/app/admin/reports",
    label: "Rapoarte",
    icon: Flag,
    accent: "#ff3d8b",
    desc: "Cereri & flag-uri",
  },
  { to: "/app/admin/debug", label: "Debug", icon: Bug, accent: "#a0a0a0", desc: "Unelte tehnice" },
];

function AdminLayout() {
  const { isAdmin, isStaff, loading } = useIsAdmin();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    if (!loading && !isStaff) navigate({ to: "/app", replace: true });
  }, [loading, isStaff, navigate]);

  if (loading) return <div className="p-8 text-sm text-muted-foreground">Verific acces…</div>;
  if (!isStaff) return null;

  const current =
    adminNav.find((n) => (n.exact ? pathname === n.to : pathname.startsWith(n.to))) ?? adminNav[0];

  return (
    <div className="min-h-screen">
      {/* Sticky header + tab bar */}
      <div className="sticky top-0 z-30 bg-background/85 border-b border-foreground/10">
        <div className="px-4 pt-3 pb-2 flex items-center gap-2">
          <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-neon-crimson/15 text-neon-crimson">
            <ShieldAlert size={15} />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="font-display uppercase text-base tracking-tight leading-none">Admin</h1>
            <div className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground mt-0.5 truncate">
              {current.label} · {current.desc}
            </div>
          </div>
          <span className="font-mono text-[9px] uppercase tracking-widest px-2 py-0.5 rounded-full border border-foreground/15 text-muted-foreground shrink-0">
            {isAdmin ? "Admin total" : "Moderator"}
          </span>
        </div>

        <nav className="px-3 pb-2.5 overflow-x-auto flex gap-1.5 no-scrollbar">
          {adminNav.map((item) => {
            const active = item.exact ? pathname === item.to : pathname.startsWith(item.to);
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full whitespace-nowrap font-mono text-[10px] uppercase tracking-widest border transition shrink-0 ${
                  active
                    ? "bg-foreground text-background border-foreground shadow-sm"
                    : "bg-foreground/[0.04] border-foreground/15 hover:bg-foreground/10 text-foreground/80"
                }`}
                style={
                  active
                    ? { boxShadow: `0 0 0 1px ${item.accent}55, 0 4px 14px ${item.accent}33` }
                    : undefined
                }
              >
                <Icon size={12} style={!active ? { color: item.accent } : undefined} /> {item.label}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="px-3 pt-3 pb-24">
        <Outlet />
      </div>
    </div>
  );
}
