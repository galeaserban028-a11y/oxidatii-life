import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/app/squad")({
  head: () => ({ meta: [{ title: "Grupuri de șprițari · OXIDAȚII" }] }),
  component: () => (
    <div className="px-4 pt-6 pb-4">
      <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-neon-purple">// GRUPURI DE ȘPRIȚARI</div>
      <h1 className="font-display font-black text-2xl mt-1">Grupuri de șprițari.</h1>
      <p className="text-xs text-muted-foreground mt-1">Fă-ți grupul tău de șprițari, luați teritoriu și urcați împreună în top.</p>
      <div className="mt-6 rounded-2xl border border-dashed border-foreground/15 p-8 text-center">
        <div className="text-4xl mb-2">🍷</div>
        <div className="font-display font-bold">Grupurile reale vin curând</div>
        <p className="text-xs text-muted-foreground mt-2">Vei putea crea un grup, invita băieții, alege un nume și un teritoriu.</p>
      </div>
    </div>
  ),
});
