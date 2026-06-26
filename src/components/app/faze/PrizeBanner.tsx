import { useState } from "react";
import { createPortal } from "react-dom";
import { archivo, nextMondayMorning, useCountdown } from "./shared";
import { PrizeSheet } from "./PrizeSheet";

export function PrizeBanner() {
  const target = nextMondayMorning();
  const { d, h, m } = useCountdown(target);
  const pad = (n: number) => String(n).padStart(2, "0");
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Vezi premiul și regulile"
        className="w-full text-left relative overflow-hidden rounded-2xl border border-sunset-amber/30 bg-gradient-to-r from-sunset-orange/15 via-sunset-amber/10 to-sunset-magenta/15 active:scale-[0.99] transition"
      >
        <div
          aria-hidden
          className="absolute -top-10 -right-10 size-28 rounded-full bg-sunset-amber/25 blur-2xl"
        />
        <div
          aria-hidden
          className="absolute -bottom-10 -left-10 size-28 rounded-full bg-sunset-magenta/25 blur-2xl"
        />

        <div className="relative flex items-center gap-3 px-4 py-3.5">
          <div className="shrink-0 flex flex-col items-center justify-center rounded-xl bg-gradient-to-br from-sunset-amber to-sunset-orange px-3 py-2 text-black shadow-[0_6px_18px_-4px_rgba(245,158,11,0.6)]">
            <div className="text-xl leading-none tabular-nums" style={archivo}>
              100
            </div>
            <div
              className="text-[8px] uppercase tracking-widest leading-none mt-0.5"
              style={archivo}
            >
              lei
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span
                className="text-[9px] uppercase tracking-[0.22em] text-sunset-amber"
                style={archivo}
              >
                Premiul săptămânii
              </span>
              <span className="size-1 rounded-full bg-emerald-400 animate-pulse" />
            </div>
            <div className="text-[13px] leading-tight mt-1 truncate">
              Cea mai tare fază ia{" "}
              <span className="text-sunset-amber font-semibold">100 lei pe Revolut</span>
            </div>
            <div
              className="text-[9px] uppercase tracking-widest text-muted-foreground mt-0.5 truncate flex items-center gap-1.5"
              style={archivo}
            >
              Vezi câștigător & reguli <span aria-hidden>→</span>
            </div>
          </div>

          <div className="shrink-0 text-right">
            <div
              className="text-[8px] uppercase tracking-widest text-muted-foreground"
              style={archivo}
            >
              Se închide
            </div>
            <div className="text-sm tabular-nums text-foreground leading-tight" style={archivo}>
              {d}
              <span className="text-muted-foreground">z</span> {pad(h)}
              <span className="text-muted-foreground">h</span> {pad(m)}
              <span className="text-muted-foreground">m</span>
            </div>
          </div>
        </div>
      </button>

      {open &&
        typeof document !== "undefined" &&
        createPortal(<PrizeSheet onClose={() => setOpen(false)} />, document.body)}
    </>
  );
}
