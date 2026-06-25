import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Flame, TrendingUp, TrendingDown, Minus, MapPin, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type HeatCell = {
  cell_id: string;
  lat: number;
  lng: number;
  heat_score: number;
  trend: "rising" | "flat" | "cooling";
  recent_count: number;
  prior_count: number;
  top_venue_id: string | null;
  top_venue_name: string | null;
};

export function HeatNowButton({
  cityId,
  onFocus,
}: {
  cityId?: string | null;
  onFocus?: (lat: number, lng: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const [enabled, setEnabled] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("oxi-heat-now") === "1";
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem("oxi-heat-now", enabled ? "1" : "0");
  }, [enabled]);

  const { data: cells = [] } = useQuery({
    queryKey: ["heat-now", cityId ?? "all"],
    enabled: enabled,
    refetchInterval: 60_000,
    queryFn: async () => {
      const args: Record<string, unknown> = {};
      if (cityId && cityId !== "all") args._city_id = cityId;
      const { data, error } = await supabase.rpc("get_heat_now", args as never);
      if (error) throw error;
      return (data ?? []) as HeatCell[];
    },
  });

  // Alert on new hot zones
  const knownRef = useRef<Set<string>>(new Set());
  const lastAlertRef = useRef(0);
  useEffect(() => {
    if (!enabled) return;
    const now = Date.now();
    const fresh = cells.filter(
      (c) =>
        !knownRef.current.has(c.cell_id) &&
        (c.heat_score >= 75 || (c.trend === "rising" && c.heat_score >= 55)),
    );
    cells.forEach((c) => knownRef.current.add(c.cell_id));
    if (fresh.length && now - lastAlertRef.current > 180_000) {
      lastAlertRef.current = now;
      const top = fresh[0];
      toast(`🔥 Hotspot nou: ${top.top_venue_name ?? "zonă activă"}`, {
        description: `Heat ${top.heat_score} • ${top.recent_count} mișcări/90min`,
        action: top.top_venue_id
          ? {
              label: "Vezi",
              onClick: () => onFocus?.(top.lat, top.lng),
            }
          : undefined,
      });
    }
  }, [cells, enabled, onFocus]);

  const hotCount = useMemo(() => cells.filter((c) => c.heat_score >= 60).length, [cells]);

  return (
    <>
      <button
        onClick={() => {
          if (!enabled) setEnabled(true);
          setOpen(true);
        }}
        aria-label="Heat Now"
        style={{ top: "calc(env(safe-area-inset-top) + 0.75rem)", right: "calc(env(safe-area-inset-right) + 3rem)" }}
        className={`absolute z-20 h-8 px-2.5 flex items-center gap-1.5 rounded-full backdrop-blur-xl border transition active:scale-95 ${
          enabled
            ? "bg-gradient-to-r from-[#ff3d8b]/30 to-[#ffb000]/30 border-[#ff3d8b]/50 text-[#ffea00]"
            : "bg-black/45 border-white/10 text-white/70"
        }`}
      >
        <Flame size={13} className={enabled ? "text-[#ff3d8b]" : ""} />
        <span className="text-[10px] font-bold uppercase tracking-wider">
          {enabled && hotCount > 0 ? `${hotCount} hot` : "Heat"}
        </span>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[60] flex items-end justify-center bg-black/70"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-md max-h-[80vh] overflow-hidden rounded-t-3xl bg-[#0c0a18] border-t border-white/10 flex flex-col"
            onClick={(e) => e.stopPropagation()}
            style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Flame size={18} className="text-[#ff3d8b]" />
                <div>
                  <div className="font-bold text-white">Heat Now</div>
                  <div className="text-[10px] uppercase tracking-widest text-white/40">
                    ultimele 90 min
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setEnabled((v) => !v)}
                  className={`text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-full border ${
                    enabled
                      ? "border-[#39ffd2]/50 text-[#39ffd2]"
                      : "border-white/15 text-white/40"
                  }`}
                >
                  {enabled ? "ON" : "OFF"}
                </button>
                <button
                  onClick={() => setOpen(false)}
                  className="h-7 w-7 grid place-items-center rounded-full border border-white/15 text-white/60"
                >
                  <X size={13} />
                </button>
              </div>
            </div>

            <div className="overflow-y-auto p-3 space-y-2">
              {cells.length === 0 ? (
                <div className="text-center text-white/40 text-sm py-10">
                  Nicio zonă activă în acest moment.
                </div>
              ) : (
                cells.slice(0, 30).map((c) => (
                  <button
                    key={c.cell_id}
                    onClick={() => {
                      onFocus?.(c.lat, c.lng);
                      setOpen(false);
                    }}
                    className="w-full text-left p-3 rounded-2xl bg-white/[0.04] border border-white/10 hover:border-[#ff3d8b]/40 transition flex items-center gap-3"
                  >
                    <div
                      className="h-12 w-12 shrink-0 rounded-full grid place-items-center font-black text-lg"
                      style={{
                        background: `radial-gradient(circle at 30% 30%, rgba(255,61,139,${
                          0.15 + c.heat_score / 200
                        }), rgba(255,176,0,${0.08 + c.heat_score / 250}))`,
                        border: `1px solid rgba(255,61,139,${0.3 + c.heat_score / 200})`,
                        color: c.heat_score >= 70 ? "#ffea00" : "#fff",
                      }}
                    >
                      {c.heat_score}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-white text-sm truncate flex items-center gap-1.5">
                        <MapPin size={11} className="text-[#ff3d8b] shrink-0" />
                        {c.top_venue_name ?? `Zonă ${c.cell_id.slice(0, 10)}`}
                      </div>
                      <div className="text-[10px] text-white/50 mt-0.5">
                        {c.recent_count} mișcări • {c.prior_count} înainte
                      </div>
                    </div>
                    <TrendBadge trend={c.trend} />
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function TrendBadge({ trend }: { trend: HeatCell["trend"] }) {
  if (trend === "rising")
    return (
      <div className="flex items-center gap-1 text-[10px] uppercase font-bold text-[#39ffd2]">
        <TrendingUp size={12} /> sus
      </div>
    );
  if (trend === "cooling")
    return (
      <div className="flex items-center gap-1 text-[10px] uppercase font-bold text-white/40">
        <TrendingDown size={12} /> jos
      </div>
    );
  return (
    <div className="flex items-center gap-1 text-[10px] uppercase font-bold text-white/40">
      <Minus size={12} /> stabil
    </div>
  );
}
