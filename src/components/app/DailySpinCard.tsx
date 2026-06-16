import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { Sparkles } from "lucide-react";

type SpinResult = {
  ok: boolean;
  error?: string;
  next_at?: string;
  reward_kind?: string;
  reward_amount?: number;
  reward_label?: string;
};

export function DailySpinCard() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [spinning, setSpinning] = useState(false);
  const [angle, setAngle] = useState(0);
  const [now, setNow] = useState(Date.now());

  // ticker for countdown
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);

  // check today's spin
  const today = new Date(
    new Date().toLocaleString("en-US", { timeZone: "Europe/Bucharest" }),
  )
    .toISOString()
    .slice(0, 10);

  const { data: todaySpin } = useQuery({
    queryKey: ["daily-spin", user?.id, today],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("daily_spins")
        .select("*")
        .eq("user_id", user!.id)
        .eq("spin_date", today)
        .maybeSingle();
      return data;
    },
    staleTime: 30_000,
  });

  const alreadySpun = !!todaySpin;

  // tomorrow at 00:00 Bucharest
  const tomorrowMs = (() => {
    const buc = new Date(
      new Date().toLocaleString("en-US", { timeZone: "Europe/Bucharest" }),
    );
    buc.setHours(24, 0, 0, 0);
    // approximate; user's local time differs but countdown is informative
    return buc.getTime() + (Date.now() - buc.getTime() < 0 ? 0 : 0);
  })();
  const msLeft = Math.max(0, tomorrowMs - now);
  const hLeft = Math.floor(msLeft / 3_600_000);
  const mLeft = Math.floor((msLeft % 3_600_000) / 60_000);

  async function handleSpin() {
    if (spinning || alreadySpun) return;
    setSpinning(true);
    // big random rotation for animation
    const spinTo = angle + 1440 + Math.floor(Math.random() * 360);
    setAngle(spinTo);

    const { data, error } = await supabase.rpc("claim_daily_spin");
    if (error) {
      toast.error(error.message);
      setSpinning(false);
      return;
    }
    const res = data as unknown as SpinResult;

    setTimeout(() => {
      setSpinning(false);
      if (res.ok) {
        toast.success(`🎰 ${res.reward_label}`, {
          description:
            res.reward_kind === "coins"
              ? `+${res.reward_amount} șprițuri în portofel`
              : res.reward_kind === "boost"
                ? "Profilul tău e boost-uit 24h"
                : `+${res.reward_amount} aură`,
        });
      } else if (res.error === "already_spun") {
        toast.info("Ai învârtit deja azi. Revino mâine.");
      } else {
        toast.error(res.error ?? "Ceva nu a mers");
      }
      qc.invalidateQueries({ queryKey: ["daily-spin"] });
      qc.invalidateQueries({ queryKey: ["wallet"] });
      qc.invalidateQueries({ queryKey: ["profile"] });
    }, 2200);
  }

  return (
    <div
      className="relative overflow-hidden rounded-3xl border border-white/10 p-5"
      style={{
        background:
          "linear-gradient(135deg, rgba(108,92,231,0.18), rgba(232,67,147,0.10) 60%, #0a0a0a)",
      }}
    >
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-white/60">
            Roata zilnică
          </span>
          <Sparkles size={14} className="text-[#f7931e]" />
        </div>

        <div className="flex items-center gap-4">
          {/* The wheel */}
          <div className="relative h-24 w-24 shrink-0">
            <div
              className="absolute inset-0 rounded-full"
              style={{
                background:
                  "conic-gradient(#ff6b35 0deg 60deg, #f7931e 60deg 120deg, #e84393 120deg 180deg, #6c5ce7 180deg 240deg, #ff6b35 240deg 300deg, #f7931e 300deg 360deg)",
                transform: `rotate(${angle}deg)`,
                transition: spinning
                  ? "transform 2.1s cubic-bezier(.17,.84,.27,1)"
                  : "none",
                boxShadow:
                  "0 0 30px rgba(255,107,53,0.35), inset 0 0 0 3px rgba(255,255,255,0.1)",
              }}
            />
            <div className="absolute inset-3 rounded-full bg-[#0a0a0a] flex items-center justify-center text-2xl">
              🎰
            </div>
            {/* pointer */}
            <div
              className="absolute -top-1 left-1/2 -translate-x-1/2 w-0 h-0"
              style={{
                borderLeft: "7px solid transparent",
                borderRight: "7px solid transparent",
                borderTop: "10px solid #fff",
                filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.6))",
              }}
            />
          </div>

          <div className="flex-1 min-w-0">
            {alreadySpun ? (
              <>
                <div className="text-sm text-white/90 font-semibold leading-tight">
                  {todaySpin?.reward_label}
                </div>
                <div className="text-[11px] text-white/50 mt-1">
                  Revino mâine în {hLeft}h {mLeft}m
                </div>
              </>
            ) : (
              <>
                <div
                  className="text-xl leading-tight text-white"
                  style={{ fontFamily: "'Instrument Serif', serif" }}
                >
                  Învârte și
                  <br />
                  <span className="italic text-[#f7931e]">câștigă șprițuri</span>
                </div>
                <div className="text-[11px] text-white/50 mt-1">
                  Gratis · 1× pe zi
                </div>
              </>
            )}
          </div>
        </div>

        <button
          onClick={handleSpin}
          disabled={spinning || alreadySpun}
          className="w-full rounded-2xl py-3 text-[12px] font-bold uppercase tracking-wider text-black disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98] transition-transform"
          style={{
            background: alreadySpun
              ? "rgba(255,255,255,0.08)"
              : "linear-gradient(135deg, #f7931e, #e84393)",
            color: alreadySpun ? "rgba(255,255,255,0.6)" : "#000",
          }}
        >
          {spinning ? "Învârte..." : alreadySpun ? "Învârtită azi" : "Învârte roata"}
        </button>
      </div>
    </div>
  );
}
