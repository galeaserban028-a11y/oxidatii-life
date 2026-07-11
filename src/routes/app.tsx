import { createFileRoute, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/auth";
import { BottomTabBar } from "@/components/app/BottomTabBar";
import { AppHeader } from "@/components/app/AppHeader";
import { InstallBanner } from "@/components/app/InstallBanner";
import { PageTransition } from "@/components/app/PageTransition";
import { PullToRefresh } from "@/components/app/PullToRefresh";
import { SwipeNavigator } from "@/components/app/SwipeNavigator";

import { useLiveLocation } from "@/hooks/useLiveLocation";
import { TutorialOverlay } from "@/components/app/TutorialOverlay";
import { useCompactMode } from "@/lib/compactMode";
import logoSticker from "@/assets/logo-oxidatii.png";

export const Route = createFileRoute("/app")({
  component: AppLayout,
});

function isTransparent(color: string) {
  const m = color.match(/rgba?\((\s*\d+\s*),(\s*\d+\s*),(\s*\d+\s*)(?:,\s*([\d.]+)\s*)?\)/);
  if (!m) return color === "transparent";
  return (m[4] ? parseFloat(m[4]) : 1) === 0;
}

function resolvePageBackgroundColor(): string {
  if (typeof document === "undefined") return "var(--background)";
  const outlet = document.querySelector("[data-page-root]");
  const pageRoot = outlet?.firstElementChild as HTMLElement | null;
  const explicit = pageRoot?.getAttribute("data-header-bg");
  if (explicit) return explicit;
  if (pageRoot) {
    const bg = getComputedStyle(pageRoot).backgroundColor;
    if (bg && !isTransparent(bg)) return bg;
  }
  const main = document.querySelector("main");
  if (main) {
    const bg = getComputedStyle(main).backgroundColor;
    if (bg && !isTransparent(bg)) return bg;
  }
  return "var(--background)";
}

function AppLayout() {
  const nav = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isMe = pathname === "/app/me" || pathname.startsWith("/app/me/");
  const isReels = pathname === "/app/reels" || pathname.startsWith("/app/reels/");
  const isFullscreen = isMe || isReels;

  const { user, profile, loading } = useAuth();
  const { compact } = useCompactMode();
  const mainRef = useRef<HTMLElement>(null);
  const outletRef = useRef<HTMLDivElement>(null);
  const [headerColor, setHeaderColor] = useState("var(--background)");

  // Broadcast our live position to friends if we've granted location consent.
  useLiveLocation(user?.id ?? null, !!profile?.location_consent);

  const updateHeaderColor = useCallback(() => {
    setHeaderColor(resolvePageBackgroundColor());
  }, []);

  useLayoutEffect(() => {
    updateHeaderColor();
    const id = requestAnimationFrame(() => updateHeaderColor());
    return () => cancelAnimationFrame(id);
  }, [pathname, loading, updateHeaderColor]);

  useEffect(() => {
    const outlet = outletRef.current;
    if (!outlet) return;
    const obs = new MutationObserver(() => {
      updateHeaderColor();
    });
    const observeRoot = (root: Element | null) => {
      if (!root) return;
      obs.observe(root, { attributes: true, attributeFilter: ["class", "style", "data-header-bg"] });
    };
    obs.observe(outlet, { childList: true });
    observeRoot(outlet.firstElementChild);
    return () => obs.disconnect();
  }, [pathname, loading, updateHeaderColor]);

  useEffect(() => {
    if (loading) return;
    if (!user) nav({ to: "/login", replace: true });
    else if (profile && profile.onboarded === false) nav({ to: "/onboarding", replace: true });
  }, [user, profile, loading, nav]);

  if (loading || !user) {
    return <main className="min-h-screen bg-background" />;
  }

  return (
    <main
      ref={mainRef}
      className={`min-h-screen bg-background text-foreground overflow-x-hidden ${compact ? "oxi-compact" : ""}`}
      style={{
        ["--header-bg" as string]: headerColor,
        paddingBottom: "calc(env(safe-area-inset-bottom) + 8.5rem)",
      } as React.CSSProperties}
    >
      {/* iOS status-bar tint — solid background under the Dynamic Island / notch
          so the area never shows transparent content. Sits behind the sticky header. */}
      <div
        aria-hidden
        className="fixed top-0 inset-x-0 z-30 bg-background pointer-events-none"
        style={{ height: "env(safe-area-inset-top)", backgroundColor: "var(--header-bg)" }}
      />
      {/* Centered phone-width column: on desktop the app looks like a phone column,
          on actual phones it fills the whole screen. */}
      <div className="mx-auto w-full max-w-[480px] min-w-0">
        {!isFullscreen && <InstallBanner />}
        {!isFullscreen && <AppHeader />}
        {isReels ? (
          <div ref={outletRef} className="contents" data-page-root>
            <Outlet />
          </div>
        ) : (
          <PullToRefresh>
            <SwipeNavigator>
              <PageTransition>
                <div ref={outletRef} className="contents" data-page-root>
                  <Outlet />
                </div>
              </PageTransition>
            </SwipeNavigator>
          </PullToRefresh>
        )}
      </div>
      {!isReels && <BottomTabBar />}
      <TutorialOverlay />


    </main>
  );
}

