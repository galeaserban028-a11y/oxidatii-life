import { useLocation } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";
import { useTranslation } from "react-i18next";
import logoBanner from "@/assets/logo-header.png";

import { GlobalSearch } from "./GlobalSearch";
import { HeaderSpritzPill } from "./HeaderSpritzPill";

export function AppHeader() {
  const location = useLocation();
  const { t } = useTranslation();

  const isHome = location.pathname === "/app" || location.pathname === "/app/";
  const showBack = !isHome;

  return (
    <header
      className="sticky top-0 z-40 flex items-center justify-between gap-2"
      style={{
        backgroundColor: "var(--header-bg, var(--background))",
        borderBottom: "1px solid var(--oxi-hairline, rgba(255,255,255,0.08))",
        paddingTop: "calc(env(safe-area-inset-top) + 0.35rem)",
        paddingBottom: "0.45rem",
        paddingLeft: "calc(env(safe-area-inset-left) + 0.85rem)",
        paddingRight: "calc(env(safe-area-inset-right) + 0.85rem)",
      }}
    >
      <div className="flex items-center gap-2 min-w-0">
        {showBack && (
          <button
            onClick={() => window.history.back()}
            className="h-9 w-9 -ml-1.5 flex items-center justify-center rounded-full active:bg-white/10 transition shrink-0"
            aria-label={t("back")}
          >
            <ChevronLeft size={22} className="text-white" strokeWidth={1.75} />
          </button>
        )}
        <span className="h-5 w-5 shrink-0 overflow-hidden rounded-[5px] inline-flex">
          <img
            src={logoBanner}
            alt="OXIDAȚII"
            width={20}
            height={20}
            decoding="async"
            className="h-full w-full object-cover"
          />
        </span>
        {isHome && (
          <span
            className="font-display font-semibold text-[15px] tracking-tight text-white truncate"
            style={{ letterSpacing: "-0.02em" }}
          >
            OXIDAȚII
          </span>
        )}
      </div>
      <div className="flex items-center gap-1">
        <HeaderSpritzPill />
        <GlobalSearch />
      </div>
    </header>
  );
}
