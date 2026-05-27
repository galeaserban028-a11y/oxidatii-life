import { createFileRoute } from "@tanstack/react-router";
import { Camera, Sparkles } from "lucide-react";

export const Route = createFileRoute("/app/scan")({
  head: () => ({ meta: [{ title: "Scanează șpriț · OXIDAȚII" }] }),
  component: ScanPage,
});

function ScanPage() {
  return (
    <div className="px-4 pt-6 pb-4 space-y-4">
      <header>
        <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-neon-crimson">// SCAN · PROOF AI</div>
        <h1 className="font-display font-black text-2xl mt-1">Dovedește șprițul.</h1>
        <p className="text-xs text-muted-foreground mt-1">Poza paharului → AI confirmă → +1 în top.</p>
      </header>

      <label className="block aspect-[4/5] rounded-3xl border-2 border-dashed border-neon-crimson/40 bg-gradient-to-br from-neon-crimson/10 via-neon-purple/10 to-neon-blue/10 flex items-center justify-center cursor-pointer active:scale-[0.99] transition">
        <input type="file" accept="image/*" capture="environment" className="sr-only" disabled />
        <div className="text-center px-6">
          <Camera size={48} className="mx-auto text-neon-crimson mb-3" />
          <div className="font-display font-bold text-lg">Deschide camera</div>
          <div className="text-xs text-muted-foreground mt-1">Pahar înalt, vin alb, sifon, bule. AI-ul vede tot.</div>
        </div>
      </label>

      <div className="rounded-2xl bg-foreground/5 border border-foreground/10 p-4 space-y-2">
        <div className="flex items-center gap-2">
          <Sparkles size={14} className="text-neon-green" />
          <div className="font-mono text-[10px] uppercase tracking-widest text-neon-green">// urmează — Faza 3</div>
        </div>
        <p className="text-xs text-muted-foreground">
          Scanarea reală cu cameră + verificare AI (Gemini vision) + anti-cheat se livrează în următoarea fază.
          Schema, storage și RLS sunt deja gata în backend.
        </p>
      </div>
    </div>
  );
}
