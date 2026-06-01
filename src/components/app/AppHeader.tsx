import { useLocation } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";
import { useTranslation } from "react-i18next";
import logoBanner from "@/assets/logo-oxidatii.png";
import { NotificationsBell } from "./NotificationsBell";

export function AppHeader() {
  const location = useLocation();
  const { t } = useTranslation();

  const isHome = location.pathname === "/app" || location.pathname === "/app/";
  const showBack = !isHome;

  return (
    <header className="sticky top-0 z-40 flex items-center justify-between gap-2 px-3 pt-[env(safe-area-inset-top)] pb-1.5 bg-background/70 backdrop-blur-md border-b border-foreground/5">
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
          alt="Oxidații"
          className="h-10 w-auto object-contain drop-shadow-[0_2px_8px_rgba(255,49,88,0.4)]"
        />
      </div>
      <div className="flex items-center gap-1">
        <NotificationsBell />
        <span className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground flicker">
          ● live
        </span>
      </div>
    </header>
  );
}
