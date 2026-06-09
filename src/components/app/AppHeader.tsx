import { useLocation } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";
import { useTranslation } from "react-i18next";
import logoBanner from "@/assets/logo-oxidatii.png";
import { NotificationsBell } from "./NotificationsBell";
import { ThemeToggle } from "./ThemeToggle";
import { GlobalSearch } from "./GlobalSearch";

export function AppHeader() {
  const location = useLocation();
  const { t } = useTranslation();

  const isHome = location.pathname === "/app" || location.pathname === "/app/";
  const showBack = !isHome;

  return (
    <header
      className="sticky top-0 z-40 flex items-center justify-between gap-2 pb-1.5 bg-background/70 backdrop-blur-md border-b border-foreground/5"
      style={{
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
      <div className="flex items-center gap-0.5">
        <GlobalSearch />
        <ThemeToggle />
        <NotificationsBell />
      </div>
    </header>
  );
}
