import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { BottomTabBar } from "@/components/app/BottomTabBar";
import { InboxFab } from "@/components/app/InboxFab";

export const Route = createFileRoute("/app")({
  component: AppLayout,
});

function AppLayout() {
  const nav = useNavigate();
  const { user, profile, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (!user) nav({ to: "/login", replace: true });
    else if (profile && !profile.onboarded) nav({ to: "/onboarding", replace: true });
  }, [user, profile, loading, nav]);

  if (loading || !user) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center">
        <div className="font-mono text-xs uppercase tracking-[0.3em] text-muted-foreground animate-pulse">
          loading...
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background text-foreground pb-24">
      <Outlet />
      <InboxFab />
      <BottomTabBar />
    </main>
  );
}
