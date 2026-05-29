import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { BottomTabBar } from "@/components/app/BottomTabBar";
import { AppHeader } from "@/components/app/AppHeader";
import logoSticker from "@/assets/logo-oxidatii.png";

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
      <main className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <img src={logoSticker} alt="Oxidații" className="h-24 w-24 object-contain animate-pulse drop-shadow-[0_4px_22px_rgba(198,107,255,0.5)]" />
        <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
          se încarcă...
        </div>
      </main>
    );
  }


  return (
    <main className="min-h-screen bg-background text-foreground pb-28">
      <AppHeader />
      <Outlet />
      <BottomTabBar />
    </main>
  );

}
