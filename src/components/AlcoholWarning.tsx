import { AlertTriangle } from "lucide-react";

export function AlcoholWarning() {
  return (
    <div className="sticky bottom-0 z-50 border-t border-neon-crimson/20 bg-background/95 backdrop-blur-sm px-4 py-2.5">
      <div className="mx-auto flex max-w-3xl items-center justify-center gap-2 text-center">
        <AlertTriangle size={12} className="shrink-0 text-neon-crimson" />
        <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          Alcoolul dăunează grav sănătății. Consumați responsabil.
        </span>
      </div>
    </div>
  );
}
