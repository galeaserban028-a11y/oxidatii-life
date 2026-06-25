import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Flame } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { HeatNowCell } from "./RomaniaMap3D";

type HeatCell = HeatNowCell & {
  trend: "rising" | "flat" | "cooling";
  recent_count: number;
  prior_count: number;
  top_venue_id: string | null;
  top_venue_name: string | null;
};

export function HeatNowButton({
  cityId,
  onFocus,
  onCellsChange,
}: {
  cityId?: string | null;
  onFocus?: (lat: number, lng: number) => void;
  onCellsChange?: (cells: HeatNowCell[]) => void;
}) {
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

  // Push cells (or empty when disabled) to the parent so the map can render them.
  useEffect(() => {
    onCellsChange?.(enabled ? cells : []);
  }, [cells, enabled, onCellsChange]);

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
    <button
      onClick={() => {
        const next = !enabled;
        setEnabled(next);
        if (next && cells.length > 0) {
          // Jump to hottest zone the first time you turn it on
          const top = [...cells].sort((a, b) => b.heat_score - a.heat_score)[0];
          if (top) onFocus?.(top.lat, top.lng);
        }
      }}
      aria-label="Heat Now"
      aria-pressed={enabled}
      style={{
        top: "calc(env(safe-area-inset-top) + 0.75rem)",
        right: "calc(env(safe-area-inset-right) + 3rem)",
      }}
      className={`absolute z-20 h-8 px-2.5 flex items-center gap-1.5 rounded-full backdrop-blur-xl border transition active:scale-95 ${
        enabled
          ? "bg-gradient-to-r from-[#ff3d8b]/30 to-[#ffb000]/30 border-[#ff3d8b]/50 text-[#ffea00]"
          : "bg-black/45 border-white/10 text-white/70"
      }`}
    >
      <Flame size={13} className={enabled ? "text-[#ff3d8b] animate-pulse" : ""} />
      <span className="text-[10px] font-bold uppercase tracking-wider">
        {enabled ? (hotCount > 0 ? `${hotCount} hot` : "live") : "Heat"}
      </span>
    </button>
  );
}
