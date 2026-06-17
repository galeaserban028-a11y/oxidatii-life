import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { BottomTabBar } from "@/components/app/BottomTabBar";
import { AppHeader } from "@/components/app/AppHeader";
import { InstallBanner } from "@/components/app/InstallBanner";

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
    return <main className="min-h-screen bg-background" />;
  }

  return (
    <main
      className="min-h-screen bg-background text-foreground overflow-x-hidden"
      style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 8.5rem)" }}
    >
      {/* iOS status-bar tint — solid background under the Dynamic Island / notch
          so the area never shows transparent content. Sits behind the sticky header. */}
      <div
        aria-hidden
        className="fixed top-0 inset-x-0 z-30 bg-background pointer-events-none"
        style={{ height: "env(safe-area-inset-top)" }}
      />
      {/* Centered phone-width column: on desktop the app looks like a phone column,
          on actual phones it fills the whole screen. */}
      <div className="mx-auto w-full max-w-[480px] min-w-0">
        <InstallBanner />
        <AppHeader />
        <Outlet />
      </div>
      <BottomTabBar />
      <TutorialOverlay />
    </main>
  );
}


