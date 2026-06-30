import { Link, useLocation } from "@tanstack/react-router";
import { ChevronLeft, Minimize2, Maximize2, Wand2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import logoBanner from "@/assets/logo-oxidatii.png";

import { GlobalSearch } from "./GlobalSearch";
import { HeaderSpritzPill } from "./HeaderSpritzPill";
import { useCompactMode } from "@/lib/compactMode";

export function AppHeader() {
  const location = useLocation();
  const { t } = useTranslation();
  const { compact, toggle } = useCompactMode();

  const isHome = location.pathname === "/app" || location.pathname === "/app/";
  const showBack = !isHome;

  return (
    <header
      className="sticky top-0 z-40 flex items-center justify-between gap-2 pb-1.5 bg-background"
      style={{
        backgroundColor: "var(--header-bg)",
        paddingTop: "calc(env(safe-area-inset-top) + 0.375rem)",
        paddingLeft: "calc(env(safe-area-inset-left) + 0.75rem)",
        paddingRight: "calc(env(safe-area-inset-right) + 0.75rem)",
      }}
    >
      <div className="flex items-center gap-1 min-w-0">
        {showBack && (
          <button
            onClick={() => window.history.back()}
            className="h-9 w-9 -ml-1 flex items-center justify-center rounded-full hover:bg-foreground/5 active:scale-95 transition shrink-0"
            aria-label={t("back")}
          >
            <ChevronLeft size={22} className="text-foreground" />
          </button>
        )}
        <img
          src={logoBanner}
          alt="Logo OXIDAȚII — nightlife România"
          className="h-14 w-auto object-contain drop-shadow-[0_4px_14px_rgba(255,49,88,0.55)]"
        />
      </div>
      <div className="flex items-center gap-1.5">
        <Link
          to="/app/camera"
          aria-label="AI Camera"
          className="h-8 w-8 flex items-center justify-center rounded-full bg-gradient-to-br from-fuchsia-500 to-cyan-400 text-black shadow-[0_0_14px_-2px_rgba(217,70,239,0.7)] active:scale-95 transition"
          title="AI Camera"
        >
          <Wand2 size={15} />
        </Link>
        <button
          onClick={toggle}
          aria-label={compact ? "Dezactivează modul compact" : "Activează modul compact"}
          aria-pressed={compact}
          className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-foreground/5 active:scale-95 transition text-foreground/70"
          title={compact ? "Mod compact: ON" : "Mod compact: OFF"}
        >
          {compact ? <Maximize2 size={15} /> : <Minimize2 size={15} />}
        </button>
        <HeaderSpritzPill />
        <GlobalSearch />
      </div>
    </header>
  );
}
