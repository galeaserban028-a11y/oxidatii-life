import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { BottomTabBar } from "@/components/app/BottomTabBar";
import { AppHeader } from "@/components/app/AppHeader";
import { InstallBanner } from "@/components/app/InstallBanner";
import { PageTransition } from "@/components/app/PageTransition";
import { useLiveLocation } from "@/hooks/useLiveLocation";
import { TutorialOverlay } from "@/components/app/TutorialOverlay";
import logoSticker from "@/assets/logo-oxidatii.png";

export const Route = createFileRoute("/app")({
  component: AppLayout,
});

function AppLayout() {
  const nav = useNavigate();
  const { user, profile, loading } = useAuth();

  // Broadcast our live position to friends if we've granted location consent.
  useLiveLocation(user?.id ?? null, !!profile?.location_consent);

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
          o secundă
        </div>
      </main>
    );
  }

  return (
    <main
      className="min-h-screen bg-background text-foreground"
      style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 8.5rem)" }}
    >
      {/* iOS status-bar tint — solid background under the Dynamic Island / notch
          so the area never shows transparent content. Sits behind the sticky header. */}
      <div
        aria-hidden
        className="fixed top-0 inset-x-0 z-30 bg-background pointer-events-none"
        style={{ height: "env(safe-area-inset-top)" }}
      />
      <InstallBanner />
      <AppHeader />
      <PageTransition>
        <Outlet />
      </PageTransition>
      <BottomTabBar />
    </main>
  );
}

