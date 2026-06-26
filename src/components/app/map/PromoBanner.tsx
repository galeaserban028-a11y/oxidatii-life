import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { X } from "lucide-react";
import { tierConfig } from "@/lib/biz/tiers";

export type PromoMeta = {
  theme: string;
  cover: string | null;
  campaignId: string;
  title: string | null;
  venueName: string | null;
  tier: string;
};

export function PromoBanner({ promotedMeta }: { promotedMeta: Record<string, PromoMeta> }) {
  const items = useMemo(() => Object.values(promotedMeta), [promotedMeta]);
  const [dismissed, setDismissed] = useState<Set<string>>(() => {
    if (typeof window === "undefined") return new Set();
    try {
      return new Set(JSON.parse(sessionStorage.getItem("oxi_dismissed_promos") || "[]"));
    } catch {
      return new Set();
    }
  });
  const [idx, setIdx] = useState(0);
  const visible = items.filter((i) => !dismissed.has(i.campaignId));
  if (visible.length === 0) return null;
  const cur = visible[idx % visible.length];

  const dismiss = (id: string) => {
    setDismissed((prev) => {
      const next = new Set(prev);
      next.add(id);
      try {
        sessionStorage.setItem("oxi_dismissed_promos", JSON.stringify([...next]));
      } catch {}
      return next;
    });
    setIdx(0);
  };

  return (
    <div className="absolute bottom-2 left-2 right-[60px] z-20 pointer-events-none">
      <div
        className="pointer-events-auto flex items-center gap-2.5 rounded-xl bg-background/95 backdrop-blur border px-2 py-2 shadow-2xl"
        style={{
          borderColor: `${cur.theme}66`,
          boxShadow: `0 8px 28px ${cur.theme}44, 0 0 0 1px ${cur.theme}22`,
        }}
      >
        <Link
          to="/app/promo/$id"
          params={{ id: cur.campaignId }}
          className="flex-1 min-w-0 flex items-center gap-2.5 active:scale-[0.99] transition"
        >
          <div
            className="h-11 w-11 rounded-lg overflow-hidden shrink-0 grid place-items-center"
            style={{ background: "#06070a", border: `2px solid ${cur.theme}` }}
          >
            {cur.cover ? (
              <img src={cur.cover} alt="" className="h-full w-full object-cover" />
            ) : (
              <span className="font-display font-black text-base" style={{ color: cur.theme }}>
                {(cur.venueName ?? cur.title ?? "?")[0]?.toUpperCase()}
              </span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span
                className="font-mono text-[8px] uppercase tracking-[0.18em] font-black px-1.5 py-0.5 rounded"
                style={{ background: cur.theme, color: "#06070a" }}
              >
                AD
              </span>
              {(() => {
                const tc = tierConfig(cur.tier);
                return (
                  <span
                    className="font-mono text-[8px] uppercase tracking-[0.18em] font-black px-1.5 py-0.5 rounded inline-flex items-center gap-0.5"
                    style={{
                      color: `hsl(${tc.color.includes("var") ? "0 0% 100%" : tc.color})`,
                      border: `1px solid ${cur.theme}66`,
                    }}
                    title={tc.name}
                  >
                    <span>{tc.badgeEmoji}</span>
                    {tc.name}
                  </span>
                );
              })()}
              <span className="font-display font-black text-[13px] truncate">
                {cur.venueName ?? "Local promovat"}
              </span>
            </div>
            {cur.title && (
              <div className="font-mono text-[10px] text-muted-foreground truncate mt-0.5">
                {cur.title}
              </div>
            )}
          </div>
          <span
            className="font-display text-[11px] font-bold shrink-0 px-2 py-1 rounded-md"
            style={{ color: cur.theme, border: `1px solid ${cur.theme}88` }}
          >
            vezi →
          </span>
        </Link>
        {visible.length > 1 && (
          <button
            onClick={() => setIdx((i) => (i + 1) % visible.length)}
            aria-label="Următoarea reclamă"
            className="h-7 w-7 grid place-items-center rounded-md border border-border text-muted-foreground shrink-0"
          >
            ›
          </button>
        )}
        <button
          onClick={() => dismiss(cur.campaignId)}
          aria-label="Ascunde reclama"
          className="h-7 w-7 grid place-items-center rounded-md border border-border text-muted-foreground shrink-0"
        >
          <X size={12} />
        </button>
      </div>
    </div>
  );
}

export function BusinessVisibilityCTA() {
  const [hidden, setHidden] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    try {
      return sessionStorage.getItem("oxi_hide_biz_cta_v3") === "1";
    } catch {
      return false;
    }
  });
  if (hidden) return null;
  const dismiss = () => {
    setHidden(true);
    try {
      sessionStorage.setItem("oxi_hide_biz_cta_v3", "1");
    } catch {}
  };
  return (
    <>
      <style>{`
        @keyframes oxi-float { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-4px) } }
        @keyframes oxi-glow {
          0%,100% { box-shadow: 0 0 12px rgba(255,176,0,0.35), 0 0 24px rgba(255,176,0,0.18); }
          50%     { box-shadow: 0 0 18px rgba(255,176,0,0.65), 0 0 36px rgba(255,176,0,0.3); }
        }
        .oxi-cta-wrap { animation: oxi-float 3.6s ease-in-out infinite; }
        .oxi-cta-pill { animation: oxi-glow 2.8s ease-in-out infinite; }
      `}</style>
      <div
        className="oxi-cta-wrap absolute left-3 z-20 will-change-transform"
        style={{ top: "calc(env(safe-area-inset-top) + 3rem)" }}
      >
        <div className="oxi-cta-pill flex items-center gap-1.5 rounded-full bg-gradient-to-r from-sunset-amber to-[#ffea00] text-black pl-2.5 pr-1 py-1 border border-black/10">
          <Link
            to="/app/biz"
            className="flex items-center gap-1.5 active:scale-[0.97] transition-transform"
          >
            <span className="text-[12px] leading-none">✨</span>
            <span className="font-display text-[11px] font-semibold leading-none whitespace-nowrap">
              Fă-ți localul vizibil
            </span>
          </Link>
          <button
            onClick={dismiss}
            aria-label="Ascunde"
            className="h-5 w-5 grid place-items-center rounded-full hover:bg-black/10 transition-colors text-black/70"
          >
            <X size={10} />
          </button>
        </div>
      </div>
    </>
  );
}
