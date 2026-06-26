import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { ArrowLeft, Zap, Lock, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PremiumCheckoutDialog } from "@/components/PremiumCheckoutDialog";
import { syncCheckoutToProfile } from "@/lib/premium.functions";
import { getStripeEnvironment } from "@/lib/stripe";
import { toast } from "sonner";

export const Route = createFileRoute("/app/lastcalls")({
  head: () => ({ meta: [{ title: "Last Call · OXIDAȚII" }] }),
  validateSearch: (
    search: Record<string, unknown>,
  ): { checkout?: string; session_id?: string } => ({
    checkout: typeof search.checkout === "string" ? search.checkout : undefined,
    session_id: typeof search.session_id === "string" ? search.session_id : undefined,
  }),
  component: LastCallsPage,
});

type Ping = {
  id: string;
  created_at: string;
  expires_at: string;
  revealed_at: string | null;
  sender_id: string | null;
  sender_handle: string | null;
  sender_display_name: string | null;
  sender_avatar_url: string | null;
};

function LastCallsPage() {
  const search = Route.useSearch();
  const [revealPing, setRevealPing] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);

  const pingsQuery = useQuery({
    queryKey: ["last-calls"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_my_last_calls");
      if (error) throw error;
      return (data as Ping[]) ?? [];
    },
    refetchInterval: 30_000,
  });

  useEffect(() => {
    const sessionId = search.session_id;
    if (!sessionId || syncing) return;
    setSyncing(true);
    (async () => {
      try {
        const result = await syncCheckoutToProfile({
          data: { sessionId, environment: getStripeEnvironment() },
        });
        if (!result.success) {
          toast.error(result.error);
          return;
        }
        if (result.lastCallRevealed) {
          toast.success(
            `Era ${result.lastCallRevealed.display_name ?? "@" + result.lastCallRevealed.handle} 👀`,
          );
          pingsQuery.refetch();
        }
      } finally {
        setSyncing(false);
      }
    })();
  }, [search.session_id]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-foreground/10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link to="/app/inbox" className="p-2 -ml-2 hover:bg-foreground/5 rounded-lg">
            <ArrowLeft size={20} />
          </Link>
          <div className="flex-1">
            <div className="font-display uppercase tracking-widest text-sm flex items-center gap-2">
              <Zap size={14} className="text-neon-violet" />
              Last Call
            </div>
            <div className="text-xs text-muted-foreground">Cineva vrea să te vadă diseară</div>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-3">
        {pingsQuery.isLoading ? (
          <div className="text-sm text-muted-foreground text-center py-12">Se încarcă…</div>
        ) : !pingsQuery.data?.length ? (
          <div className="text-sm text-muted-foreground border border-dashed border-foreground/15 rounded-xl p-8 text-center">
            <Zap size={28} className="mx-auto text-neon-violet/40 mb-2" />
            <div>Niciun ping deocamdată.</div>
            <div className="text-xs mt-1">Pingurile expiră în 24h.</div>
          </div>
        ) : (
          pingsQuery.data.map((p) => <PingCard key={p.id} ping={p} onReveal={setRevealPing} />)
        )}
      </div>

      <PremiumCheckoutDialog
        priceId={revealPing ? "last_call_reveal" : null}
        title="Află cine te-a ping-uit"
        open={!!revealPing}
        onClose={() => setRevealPing(null)}
        extra={{ ping_id: revealPing ?? undefined }}
        returnUrl={`${typeof window !== "undefined" ? window.location.origin : ""}/app/lastcalls?checkout=success&session_id={CHECKOUT_SESSION_ID}`}
      />
    </div>
  );
}

function PingCard({ ping, onReveal }: { ping: Ping; onReveal: (id: string) => void }) {
  const revealed = !!ping.revealed_at;
  const expiresIn = Math.max(
    0,
    Math.floor((new Date(ping.expires_at).getTime() - Date.now()) / (60 * 60 * 1000)),
  );

  if (revealed) {
    return (
      <Link
        to="/app/user/$id"
        params={{ id: ping.sender_id! }}
        className="flex items-center gap-3 p-4 rounded-2xl bg-card border border-neon-violet/40 hover:border-neon-violet transition shadow-[0_0_18px_rgba(199,36,255,0.15)]"
      >
        {ping.sender_avatar_url ? (
          <img
            src={ping.sender_avatar_url}
            alt=""
            className="w-12 h-12 rounded-full object-cover border-2 border-neon-violet"
          />
        ) : (
          <div className="w-12 h-12 rounded-full bg-neon-violet/20 flex items-center justify-center font-display font-black">
            {(ping.sender_display_name ?? ping.sender_handle ?? "?")[0]?.toUpperCase()}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="font-display font-black text-sm flex items-center gap-1.5">
            <Sparkles size={12} className="text-neon-violet" />
            {ping.sender_display_name ?? `@${ping.sender_handle}`}
          </div>
          <div className="text-xs text-muted-foreground">A vrut să te vadă diseară</div>
        </div>
      </Link>
    );
  }

  return (
    <div className="p-4 rounded-2xl bg-gradient-to-br from-neon-violet/10 to-transparent border border-neon-violet/30">
      <div className="flex items-start gap-3">
        <div className="w-12 h-12 rounded-full bg-neon-violet/20 flex items-center justify-center">
          <Zap size={20} className="text-neon-violet" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-display font-black text-sm">Cineva vrea să te vadă diseară 👀</div>
          <div className="text-xs text-muted-foreground mt-0.5">
            Expiră în {expiresIn}h · {new Date(ping.created_at).toLocaleTimeString("ro-RO", { hour: "2-digit", minute: "2-digit" })}
          </div>
          <button
            onClick={() => onReveal(ping.id)}
            className="mt-3 px-4 py-2 rounded-lg bg-neon-violet text-white text-xs font-display font-black uppercase flex items-center gap-2 active:scale-[0.98] transition"
          >
            <Lock size={12} /> Află cine · 4.99 RON
          </button>
        </div>
      </div>
    </div>
  );
}
