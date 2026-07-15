import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Sparkles,
  MapPin,
  Camera,
  Wine,
  Users,
  Lock,
  Download,
  Share2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { PremiumCheckoutDialog } from "@/components/PremiumCheckoutDialog";
import { syncCheckoutToProfile } from "@/lib/premium.functions";
import { getStripeEnvironment } from "@/lib/stripe";
import { toast } from "sonner";

export const Route = createFileRoute("/app/replay")({
  head: () => ({ meta: [{ title: "Replay Night · OXIDAȚII" }] }),
  validateSearch: (
    search: Record<string, unknown>,
  ): { checkout?: string; session_id?: string } => ({
    checkout: typeof search.checkout === "string" ? search.checkout : undefined,
    session_id: typeof search.session_id === "string" ? search.session_id : undefined,
  }),
  component: ReplayPage,
});

function yesterdayDate(): string {
  const d = new Date(Date.now() - 24 * 60 * 60 * 1000);
  return d.toISOString().slice(0, 10);
}

function formatDateRo(s: string): string {
  return new Date(s).toLocaleDateString("ro-RO", { day: "numeric", month: "long" });
}

function ReplayPage() {
  const { user } = useAuth();
  const search = Route.useSearch();
  const [open, setOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const targetDate = yesterdayDate();

  const unlocksQuery = useQuery({
    queryKey: ["replay-unlocks", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("replay_unlocks")
        .select("unlock_date, purchased_at")
        .order("unlock_date", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const hasYesterday = unlocksQuery.data?.some((u) => u.unlock_date === targetDate);

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
        if (result.replayDate) {
          toast.success("Replay Night deblocat", {
            description: `Nostalgia pentru ${formatDateRo(result.replayDate)} e a ta.`,
          });
          unlocksQuery.refetch();
        }
      } finally {
        setSyncing(false);
      }
    })();
  }, [search.session_id]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="sticky top-0 z-10 bg-background/95 border-b border-foreground/10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link
            to="/app/premium"
            className="p-2 -ml-2 hover:bg-foreground/5 rounded-lg"
            aria-label="Înapoi"
          >
            <ArrowLeft size={20} />
          </Link>
          <div>
            <div className="font-display uppercase tracking-widest text-sm">Replay Night</div>
            <div className="text-xs text-muted-foreground">Nostalgia pentru noaptea trecută</div>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Hero / Buy CTA */}
        <div className="relative overflow-hidden rounded-3xl border border-neon-violet/40 bg-gradient-to-br from-neon-violet/20 via-background to-neon-cyan/10 p-6">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles size={16} className="text-neon-violet" />
            <span className="text-xs uppercase tracking-widest font-display text-neon-violet">
              Limited drop
            </span>
          </div>
          <h1 className="font-display font-black text-3xl mb-2">
            Retrăiește noaptea de {formatDateRo(targetDate)}
          </h1>
          <p className="text-sm text-muted-foreground mb-4">
            Tot ce ai făcut aseară, într-un wrap shareable: venue-urile, traseul, spritz-urile,
            pozele și prietenii. Tip Spotify Wrapped — dar pentru fiecare seară.
          </p>
          {hasYesterday ? (
            <Link
              to="/app/replay/$date"
              params={{ date: targetDate }}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-neon-violet text-white font-display font-black uppercase text-sm shadow-[0_0_24px_rgba(199,36,255,0.4)]"
            >
              <Sparkles size={16} /> Vezi wrap-ul
            </Link>
          ) : (
            <button
              onClick={() => setOpen(true)}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-neon-violet text-white font-display font-black uppercase text-sm shadow-[0_0_24px_rgba(199,36,255,0.4)] active:scale-[0.98] transition"
            >
              <Lock size={16} /> Deblochează · 9.99 RON
            </button>
          )}
        </div>

        {/* Past unlocks */}
        <div>
          <div className="font-display uppercase tracking-widest text-xs text-muted-foreground mb-3">
            Nopți deblocate
          </div>
          {unlocksQuery.isLoading ? (
            <div className="text-sm text-muted-foreground">Se încarcă…</div>
          ) : !unlocksQuery.data?.length ? (
            <div className="text-sm text-muted-foreground border border-dashed border-foreground/15 rounded-xl p-6 text-center">
              N-ai încă nicio noapte salvată. Cumpără prima ta amintire ↑
            </div>
          ) : (
            <div className="space-y-2">
              {unlocksQuery.data.map((u) => (
                <Link
                  key={u.unlock_date}
                  to="/app/replay/$date"
                  params={{ date: u.unlock_date }}
                  className="block px-4 py-3 rounded-xl bg-card border border-foreground/10 hover:border-neon-violet/40 transition"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-display font-bold">{formatDateRo(u.unlock_date)}</div>
                      <div className="text-xs text-muted-foreground">
                        Deblocat {new Date(u.purchased_at).toLocaleDateString("ro-RO")}
                      </div>
                    </div>
                    <Sparkles size={16} className="text-neon-violet" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      <PremiumCheckoutDialog
        priceId={open ? "replay_night" : null}
        title="Replay Night"
        open={open}
        onClose={() => setOpen(false)}
        extra={{ date: targetDate }}
        returnUrl={`${typeof window !== "undefined" ? window.location.origin : ""}/app/replay?checkout=success&session_id={CHECKOUT_SESSION_ID}`}
      />
    </div>
  );
}
