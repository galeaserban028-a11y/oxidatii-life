import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { BottomTabBar } from "@/components/app/BottomTabBar";
import { AppHeader } from "@/components/app/AppHeader";
import { AlcoholWarning } from "@/components/AlcoholWarning";
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
    <main className="min-h-screen bg-background text-foreground pb-24">
      {/* Sticky brand header — sticker logo on every app screen */}
      <header className="sticky top-0 z-40 flex items-center justify-between gap-2 px-3 pt-[env(safe-area-inset-top)] pb-1.5 bg-background/70 backdrop-blur-md border-b border-foreground/5">
        <div className="flex items-center gap-2">
          <img src={logoSticker} alt="Oxidații" className="h-9 w-9 object-contain drop-shadow-[0_2px_8px_rgba(255,49,88,0.4)]" />
          <span className="font-display font-black text-[13px] tracking-tight uppercase leading-none">
            Oxida<span className="text-gradient-chaos">ții</span>
          </span>
        </div>
        <span className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground flicker">
          ● live
        </span>
      </header>
      <Outlet />
      <BottomTabBar />
      <AlcoholWarning />
    </main>
  );

}
