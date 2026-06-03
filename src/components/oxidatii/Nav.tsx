import { Link } from "@tanstack/react-router";
import logoUrl from "@/assets/logo-oxidatii.png";

export function Nav() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-background/80 backdrop-blur-xl">
      <div className="mx-auto max-w-7xl px-4 md:px-6 py-2.5 flex items-center justify-between gap-3">
        <Link to="/" className="flex items-center gap-2 min-w-0">
          <img
            src={logoUrl}
            alt="OXIDAȚII"
            width={56}
            height={56}
            className="h-14 w-14 object-contain shrink-0 drop-shadow-[0_4px_14px_rgba(255,49,88,0.45)]"
          />
        </Link>

        <div className="flex items-center gap-2">
          <Link
            to="/login"
            className="hidden sm:inline-flex font-mono text-[11px] uppercase tracking-widest px-3 py-2 text-muted-foreground hover:text-foreground transition"
          >
            Login
          </Link>
          <Link
            to="/signup"
            className="font-display uppercase text-[11px] tracking-[0.15em] px-4 py-2 rounded-sm text-primary-foreground"
            style={{ background: "var(--gradient-sunset)" }}
          >
            Fă-ți cont
          </Link>
        </div>
      </div>
    </header>
  );
}
