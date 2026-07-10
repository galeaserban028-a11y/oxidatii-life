import { useAuth } from "@/lib/auth";
import { useEntitlements } from "@/lib/entitlements";
import { supabase } from "@/integrations/supabase/client";
import { Rocket, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { errorMessage } from "@/lib/errors";

/**
 * Profile Boost claim card — Pro/Elite get a 24h Discover boost once per 7 days.
 * Eligibility uses useEntitlements() so an expired subscription hides the card.
 */
export function ProfileBoostCard() {
  const { profile, refreshProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const { isPro: eligible } = useEntitlements();
  const boostUntil = profile?.boost_until ? new Date(profile.boost_until) : null;
  const lastBoostAt = profile?.last_boost_at ? new Date(profile.last_boost_at) : null;
  const now = new Date();
  const isActive = boostUntil && boostUntil > now;
  const nextAvailable = lastBoostAt
    ? new Date(lastBoostAt.getTime() + 7 * 24 * 60 * 60 * 1000)
    : null;
  const onCooldown = nextAvailable && nextAvailable > now;

  async function claim() {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc("claim_profile_boost" as any);
      if (error) throw error;
      const res = data as any;
      if (!res?.ok) {
        if (res?.error === "requires_pro") toast.error("Boost-ul e doar pentru Pro și Elite.");
        else if (res?.error === "cooldown")
          toast.error("Mai trebuie să aștepți până la următorul boost.");
        else toast.error("Nu pot da boost acum.");
        return;
      }
      toast.success("Boost activ 24h — ești featured pe Discover.");
      await refreshProfile();
    } catch (e) {
      toast.error(errorMessage(e, "Eroare"));
    } finally {
      setLoading(false);
    }
  }

  if (!eligible) return null;

  return (
    <div className="rounded-2xl border border-foreground/15 p-4 bg-foreground/[0.03]">
      <div className="flex items-center gap-2">
        <Rocket size={16} className="text-neon-purple" />
        <div className="font-display uppercase text-sm tracking-wide">Profile Boost</div>
      </div>
      <p className="text-xs text-muted-foreground mt-1">
        1 boost / săptămână · 24h featured pe Discover.
      </p>
      {isActive ? (
        <div className="mt-3 text-xs text-emerald-400 font-mono">
          Activ până la {boostUntil!.toLocaleString("ro-RO")}
        </div>
      ) : onCooldown ? (
        <div className="mt-3 text-xs text-muted-foreground font-mono">
          Disponibil din {nextAvailable!.toLocaleString("ro-RO")}
        </div>
      ) : (
        <button
          onClick={claim}
          disabled={loading}
          className="mt-3 w-full h-10 rounded-full bg-neon-purple text-white font-display uppercase text-xs tracking-widest active:scale-[0.98] transition flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> : <Rocket size={14} />}
          Activează boost
        </button>
      )}
    </div>
  );
}
