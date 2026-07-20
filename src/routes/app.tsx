import { createFileRoute, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/auth";
import { BottomTabBar } from "@/components/app/BottomTabBar";
import { AppHeader } from "@/components/app/AppHeader";
import { InstallBanner } from "@/components/app/InstallBanner";
import { PageTransition } from "@/components/app/PageTransition";
import { PullToRefresh } from "@/components/app/PullToRefresh";
import { SwipeNavigator } from "@/components/app/SwipeNavigator";

import { TutorialOverlay } from "@/components/app/TutorialOverlay";
import { useCompactMode } from "@/lib/compactMode";
import { usePerfLevel } from "@/hooks/usePerfLevel";
import { isNative, setNativeChromeColor } from "@/lib/native";
import { saveLastAppPath } from "@/integrations/supabase/auth-storage";

export const Route = createFileRoute("/app")({
  component: AppLayout,
});

function isTransparent(color: string) {
  const m = color.match(/rgba?\((\s*\d+\s*),(\s*\d+\s*),(\s*\d+\s*)(?:,\s*([\d.]+)\s*)?\)/);
  if (!m) return color === "transparent";
  return (m[4] ? parseFloat(m[4]) : 1) === 0;
}

/** Prefer near-black for main tabs so Android nav never stays gray-violet. */
function routeFallbackHex(pathname: string): string {
  if (
    pathname === "/app" ||
    pathname === "/app/" ||
    pathname.startsWith("/app/map") ||
    pathname.startsWith("/app/top") ||
    pathname.startsWith("/app/squad") ||
    pathname.startsWith("/app/inbox") ||
    pathname.startsWith("/app/me") ||
    pathname.startsWith("/app/feed") ||
    pathname.startsWith("/app/reels")
  ) {
    return "#050505";
  }
  return "#050505";
}

/** Read the active page background so status/nav bars match that page. */
function resolvePageBackgroundColor(pathname: string): string {
  if (typeof document === "undefined") return routeFallbackHex(pathname);
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
  // Resolve theme --background to a real rgb() (var() alone can't set Android bars).
  const probe = document.createElement("div");
  probe.style.backgroundColor = "var(--background)";
  probe.style.position = "fixed";
  probe.style.left = "-9999px";
  document.body.appendChild(probe);
  const resolvedBg = getComputedStyle(probe).backgroundColor;
  probe.remove();
  if (resolvedBg && !isTransparent(resolvedBg)) return resolvedBg;
  return routeFallbackHex(pathname);
}

/** Convert css rgb()/rgba()/#hex to #rrggbb for Capacitor / Android chrome. */
function toHexColor(cssColor: string): string | null {
  if (!cssColor || cssColor.startsWith("var(")) return null;
  if (/^#[0-9a-fA-F]{6}$/.test(cssColor)) return cssColor.toLowerCase();
  if (/^#[0-9a-fA-F]{3}$/.test(cssColor)) {
    const s = cssColor.slice(1);
    return `#${s[0]}${s[0]}${s[1]}${s[1]}${s[2]}${s[2]}`.toLowerCase();
  }
  const m = cssColor.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
  if (!m) return null;
  const h = (n: string) => Number(n).toString(16).padStart(2, "0");
  return `#${h(m[1])}${h(m[2])}${h(m[3])}`;
}

function AppLayout() {
  const nav = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isMe = pathname === "/app/me" || pathname.startsWith("/app/me/");
  const isReels = pathname === "/app/reels" || pathname.startsWith("/app/reels/");
  const isFullscreen = isMe || isReels;

  const { user, profile, loading } = useAuth();
  const { compact } = useCompactMode();
  const perf = usePerfLevel();
  const mainRef = useRef<HTMLElement>(null);
  const outletRef = useRef<HTMLDivElement>(null);
  const [headerColor, setHeaderColor] = useState("#050505");
  const lastChromeRef = useRef<string>("");

  const updateHeaderColor = useCallback(() => {
    const next = resolvePageBackgroundColor(pathname);
    setHeaderColor(next);
    // Keep Android status + 3-button nav bar in sync with the page (no gray strip).
    if (isNative()) {
      const hex = toHexColor(next) ?? routeFallbackHex(pathname);
      if (hex && hex !== lastChromeRef.current) {
        lastChromeRef.current = hex;
        void setNativeChromeColor(hex);
      }
    }
  }, [pathname]);

  useLayoutEffect(() => {
    updateHeaderColor();
    const id = requestAnimationFrame(() => updateHeaderColor());
    return () => cancelAnimationFrame(id);
  }, [pathname, loading, updateHeaderColor]);

  useEffect(() => {
    if (perf === "low") return;
    const outlet = outletRef.current;
    if (!outlet) return;
    let raf = 0;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const schedule = () => {
      if (timer) return;
      timer = setTimeout(() => {
        timer = null;
        raf = requestAnimationFrame(updateHeaderColor);
      }, 120);
    };
    const obs = new MutationObserver(schedule);
    const observeRoot = (root: Element | null) => {
      if (!root) return;
      obs.observe(root, {
        attributes: true,
        attributeFilter: ["class", "style", "data-header-bg"],
      });
    };
    obs.observe(outlet, { childList: true });
    observeRoot(outlet.firstElementChild);
    return () => {
      obs.disconnect();
      if (timer) clearTimeout(timer);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [pathname, loading, updateHeaderColor, perf]);

  useEffect(() => {
    if (loading) return;
    if (!user) nav({ to: "/login", replace: true });
    else if (profile && profile.onboarded === false) nav({ to: "/onboarding", replace: true });
  }, [user, profile, loading, nav]);

  // Remember last in-app screen so reopen lands inside the app, not marketing home.
  useEffect(() => {
    if (!user || loading) return;
    if (pathname.startsWith("/app")) void saveLastAppPath(pathname);
  }, [pathname, user, loading]);

  if (loading || !user) {
    return <main className="min-h-screen bg-background" />;
  }

  return (
    <main
      ref={mainRef}
      className={`min-h-screen bg-background text-foreground ${compact ? "oxi-compact" : ""}`}
      style={
        {
          ["--header-bg" as string]: headerColor,
          paddingBottom: "calc(var(--oxi-bottom-inset, env(safe-area-inset-bottom, 0px)) + 6.75rem)",
          WebkitOverflowScrolling: "touch",
          touchAction: "auto",
        } as React.CSSProperties
      }
    >
      {/* Status-bar strip — same color as the current page */}
      <div
        aria-hidden
        className="fixed top-0 inset-x-0 z-30 pointer-events-none"
        style={{ height: "env(safe-area-inset-top)", backgroundColor: "var(--header-bg)" }}
      />
      <div className={`mx-auto w-full min-w-0 ${isNative() ? "max-w-none" : "max-w-[480px]"}`}>
        {!isFullscreen && !isNative() && <InstallBanner />}
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
      {/* System nav gap under the floating tab bar — matches page, not a random black */}
      <div
        aria-hidden
        className="fixed inset-x-0 bottom-0 z-40 pointer-events-none"
        style={{
          height: "var(--oxi-bottom-inset, env(safe-area-inset-bottom, 0px))",
          backgroundColor: "var(--header-bg)",
        }}
      />
      <TutorialOverlay />
    </main>
  );
}
