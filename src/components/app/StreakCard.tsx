import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Flame } from "lucide-react";

type StreakStatus = {
  ok: boolean;
  current_streak: number;
  longest_streak: number;
  this_week_done: boolean;
  this_week_start: string;
  expires_at: string;
};

export function StreakCard({ compact = false }: { compact?: boolean }) {
  const { user } = useAuth();
  const { data } = useQuery({
    queryKey: ["streak-status", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_streak_status");
      if (error) throw error;
      return data as unknown as StreakStatus;
    },
    staleTime: 60_000,
  });

  const streak = data?.current_streak ?? 0;
  const done = data?.this_week_done ?? false;
  const longest = data?.longest_streak ?? 0;

  // countdown to expires_at
  const expiresAt = data?.expires_at ? new Date(data.expires_at) : null;
  const msLeft = expiresAt ? expiresAt.getTime() - Date.now() : 0;
  const daysLeft = Math.max(0, Math.floor(msLeft / (1000 * 60 * 60 * 24)));

  if (compact) {
    return (
      <div className="rounded-2xl border border-white/5 bg-[#121212] p-4 flex items-center gap-3">
        <FlameIcon streak={streak} done={done} />
        <div className="flex-1 min-w-0">
          <div className="text-[11px] font-bold uppercase tracking-wider text-white/50">
            Streak
          </div>
          <div
            className="text-2xl leading-none text-white"
            style={{ fontFamily: "'Instrument Serif', serif" }}
          >
            {streak} <span className="text-white/40 text-sm">săpt</span>
          </div>
        </div>
        {done ? (
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
            ✓ Activ
          </span>
        ) : (
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#ff6b35]">
            {daysLeft}z
          </span>
        )}
      </div>
    );
  }

  return (
    <div
      className="relative overflow-hidden rounded-3xl border border-white/10 p-5"
      style={{
        background:
          "linear-gradient(135deg, rgba(255,107,53,0.18), rgba(232,67,147,0.10) 60%, #0a0a0a)",
      }}
    >
      <div className="absolute -right-8 -top-8 text-[160px] leading-none opacity-10 select-none">
        🔥
      </div>
      <div className="relative space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-white/60">
            Streak de șprițuri
          </span>
          <span className="text-[10px] font-bold uppercase tracking-wider text-white/40">
            Record: {longest}
          </span>
        </div>

        <div className="flex items-end gap-3">
          <FlameIcon streak={streak} done={done} size="lg" />
          <div>
            <div
              className="text-[56px] leading-none text-white"
              style={{ fontFamily: "'Instrument Serif', serif" }}
            >
              {streak}
            </div>
            <div className="text-xs text-white/60 mt-1">
              {streak === 0
                ? "Bea măcar 1 șpriț în weekend (Vin-Sâm-Dum)"
                : streak === 1
                  ? "săptămână consecutivă 🍻"
                  : "săptămâni consecutive 🍻"}
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-black/40 backdrop-blur-sm border border-white/5 p-3 flex items-center justify-between">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-white/50">
              Weekendul ăsta
            </div>
            <div className="text-sm text-white font-semibold">
              {done ? (
                <span className="text-emerald-400">✓ Bifat — streak salvat</span>
              ) : (
                <span className="text-[#ff6b35]">
                  Expiră în {daysLeft}z {streak > 0 && "— nu pierde!"}
                </span>
              )}
            </div>
          </div>
          {!done && (
            <Link
              to="/app/scan"
              className="rounded-xl px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-black"
              style={{
                background: "linear-gradient(135deg, #ff6b35, #e84393)",
              }}
            >
              Bea acum
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

function FlameIcon({
  streak,
  done,
  size = "md",
}: {
  streak: number;
  done: boolean;
  size?: "md" | "lg";
}) {
  const tier =
    streak >= 52 ? "legend" : streak >= 26 ? "gold" : streak >= 12 ? "fire" : streak >= 4 ? "warm" : "cold";
  const colors: Record<string, string> = {
    legend: "from-yellow-300 via-[#ff6b35] to-[#e84393]",
    gold: "from-yellow-400 to-[#ff6b35]",
    fire: "from-[#ff6b35] to-[#e84393]",
    warm: "from-[#f7931e] to-[#ff6b35]",
    cold: "from-white/20 to-white/10",
  };
  const dim = size === "lg" ? "h-14 w-14" : "h-10 w-10";
  const icon = size === "lg" ? 28 : 20;
  return (
    <div
      className={`${dim} rounded-2xl bg-gradient-to-br ${colors[tier]} flex items-center justify-center shrink-0`}
      style={{
        boxShadow: done && streak > 0 ? "0 0 24px rgba(255,107,53,0.5)" : "none",
      }}
    >
      <Flame
        size={icon}
        strokeWidth={2.4}
        className={tier === "cold" ? "text-white/60" : "text-black"}
        fill={tier === "cold" ? "none" : "currentColor"}
      />
    </div>
  );
}
