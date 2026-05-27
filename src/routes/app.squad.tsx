import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/app/squad")({
  head: () => ({ meta: [{ title: "Squad · OXIDAȚII" }] }),
  component: () => (
    <div className="px-4 pt-6 pb-4">
      <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-neon-purple">// SQUAD</div>
      <h1 className="font-display font-black text-2xl mt-1">Gașca ta.</h1>
      <p className="text-xs text-muted-foreground mt-1">Squad system real (creare, invitații, teritorii) — Faza 4.</p>
      <div className="mt-6 rounded-2xl border border-dashed border-foreground/15 p-8 text-center">
        <div className="text-4xl mb-2">🐺</div>
        <div className="font-display font-bold">Squad real coming soon</div>
      </div>
    </div>
  ),
});
