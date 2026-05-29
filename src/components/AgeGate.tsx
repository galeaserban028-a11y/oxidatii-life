import { useState, useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import logoSticker from "@/assets/logo-oxidatii.png";


const AGE_KEY = "oxi-age-verified-v1";

export function AgeGate() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      const ok = localStorage.getItem(AGE_KEY);
      if (!ok) setOpen(true);
    } catch {
      setOpen(true);
    }
  }, []);

  const confirm = () => {
    try {
      localStorage.setItem(AGE_KEY, "1");
    } catch {}
    setOpen(false);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm px-4">
      <div className="w-full max-w-sm rounded-2xl border border-neon-crimson/30 bg-background p-6 text-center shadow-2xl">
        <div className="mx-auto mb-3 flex h-20 w-20 items-center justify-center">
          <img src={logoSticker} alt="Oxidații" className="h-20 w-20 object-contain drop-shadow-[0_4px_18px_rgba(255,49,88,0.45)]" />
        </div>


        <h2 className="font-display text-2xl font-bold tracking-tight">
          Ai peste 18 ani?
        </h2>

        <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
          Această aplicație este destinată exclusiv adulților și promovează
          consumul responsabil de alcool.
        </p>

        <div className="mt-5 space-y-2">
          <button
            onClick={confirm}
            className="w-full rounded-xl py-3.5 font-display font-bold text-sm uppercase tracking-[0.12em] text-white active:scale-[0.98] transition"
            style={{ background: "var(--gradient-sunset)" }}
          >
            Da, am 18+ ani
          </button>
          <a
            href="https://www.aa-romania.ro"
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full rounded-xl border border-border py-3 font-mono text-[10px] uppercase tracking-widest text-muted-foreground hover:bg-foreground/5 transition"
          >
            Nu, am sub 18 ani · ieși
          </a>
        </div>

        <div className="mt-4 flex items-center justify-center gap-1.5 text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
          <AlertTriangle size={12} className="text-neon-crimson" />
          Alcoolul dăunează grav sănătății
        </div>
      </div>
    </div>
  );
}
