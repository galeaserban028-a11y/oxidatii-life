import { useLocation } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";
import logoSticker from "@/assets/logo-oxidatii.png";

export function AppHeader() {
  const location = useLocation();

  const isHome = location.pathname === "/app" || location.pathname === "/app/";
  const showBack = !isHome;

  return (
    <header className="sticky top-0 z-40 flex items-center justify-between gap-2 px-3 pt-[env(safe-area-inset-top)] pb-1.5 bg-background/70 backdrop-blur-md border-b border-foreground/5">
      <div className="flex items-center gap-1 min-w-0">
        {showBack && (
          <button
            onClick={() => window.history.back()}
            className="h-9 w-9 -ml-1 flex items-center justify-center rounded-full hover:bg-foreground/5 active:scale-95 transition shrink-0"
            aria-label="Înapoi"
          >
            <ChevronLeft size={22} className="text-foreground" />
          </button>
        )}
        <img
          src={logoSticker}
          alt="Oxidații"
          className="h-9 w-9 object-contain drop-shadow-[0_2px_8px_rgba(255,49,88,0.4)]"
        />
        <span className="font-display font-black text-[13px] tracking-tight uppercase leading-none">
          Oxida<span className="text-gradient-chaos">ții</span>
        </span>
      </div>
      <span className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground flicker">
        ● live
      </span>
    </header>
  );
}
