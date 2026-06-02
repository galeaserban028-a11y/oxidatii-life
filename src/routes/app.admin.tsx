import { createFileRoute, Outlet, Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect } from "react";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { LayoutDashboard, Users, Flame, Building2, Megaphone, MapPin, Flag, ShieldAlert } from "lucide-react";

export const Route = createFileRoute("/app/admin")({
  component: AdminLayout,
});

const nav = [
  { to: "/app/admin", label: "Panou", icon: LayoutDashboard, exact: true },
  { to: "/app/admin/users", label: "Useri", icon: Users },
  { to: "/app/admin/content", label: "Conținut", icon: Flame },
  { to: "/app/admin/businesses", label: "Businesses", icon: Building2 },
  { to: "/app/admin/campaigns", label: "Campanii", icon: Megaphone },
  { to: "/app/admin/places", label: "Locații", icon: MapPin },
  { to: "/app/admin/reports", label: "Rapoarte", icon: Flag },
];

function AdminLayout() {
  const { isAdmin, isStaff, loading } = useIsAdmin();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    if (!loading && !isStaff) navigate({ to: "/app", replace: true });
  }, [loading, isStaff, navigate]);

  if (loading) {
    return <div className="p-8 text-sm text-muted-foreground">Verific acces…</div>;
  }
  if (!isStaff) return null;

  return (
    <div className="min-h-screen">
      <div className="px-4 pt-3 pb-2 flex items-center gap-2">
        <ShieldAlert className="text-neon-crimson" size={18} />
        <h1 className="font-display uppercase text-xl tracking-tight">Admin</h1>
        <span className="ml-auto font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
          {isAdmin ? "Admin total" : "Moderator"}
        </span>
      </div>

      <nav className="px-3 pb-3 overflow-x-auto -mx-1 flex gap-1.5 no-scrollbar">
        {nav.map((item) => {
          const active = item.exact ? pathname === item.to : pathname.startsWith(item.to);
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full whitespace-nowrap font-mono text-[10px] uppercase tracking-widest border transition ${
                active
                  ? "bg-foreground text-background border-foreground"
                  : "bg-foreground/[0.04] border-foreground/15 hover:bg-foreground/10"
              }`}
            >
              <Icon size={12} /> {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="px-3 pb-24">
        <Outlet />
      </div>
    </div>
  );
}
