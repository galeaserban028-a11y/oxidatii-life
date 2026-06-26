import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { ArrowLeft, Crown, Lock, Clock } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/app/biz/exclusive")({
  head: () => ({ meta: [{ title: "Exclusive Partner · OXIDAȚII" }] }),
  component: ExclusivePage,
});

interface Slot {
  id: string;
  city_id: string;
  slot_index: number;
  business_id: string | null;
  claimed_at: string | null;
  locked_until: string | null;
}

function ExclusivePage() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: biz } = useQuery({
    queryKey: ["my-biz-exclusive", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("business_accounts")
        .select("id, brand_name, tier, city_id, is_exclusive_slot, exclusive_city_id")
        .eq("owner_user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
  });

  const { data: cities } = useQuery({
    queryKey: ["cities-all"],
    queryFn: async () => {
      const { data } = await supabase.from("cities").select("id, name").order("name");
      return data ?? [];
    },
  });

  const { data: slots } = useQuery({
    queryKey: ["all-exclusive-slots"],
    queryFn: async () => {
      const { data } = await supabase
        .from("exclusive_partner_slots")
        .select("*")
        .order("city_id")
        .order("slot_index");
      return (data ?? []) as Slot[];
    },
  });

  async function claim(cityId: string) {
    if (!biz?.id) return;
    if (biz.tier !== "exclusive") {
      toast.error("Necesită plan Exclusive Partner.");
      return;
    }
    const { data, error } = await (
      supabase.rpc as unknown as (
        fn: string,
        args: Record<string, unknown>,
      ) => Promise<{
        data: { ok: boolean; error?: string; slot_index?: number } | null;
        error: unknown;
      }>
    )("claim_exclusive_slot", { _business_id: biz.id, _city_id: cityId });
    if (error || !data?.ok) {
      toast.error(data?.error ?? "Nu am putut revendica slotul");
      return;
    }
    toast.success(`Slot ${data.slot_index} revendicat. Lock 30 de zile.`);
    qc.invalidateQueries({ queryKey: ["all-exclusive-slots"] });
    qc.invalidateQueries({ queryKey: ["my-biz-exclusive"] });
  }

  const byCity = new Map<string, Slot[]>();
  (slots ?? []).forEach((s) => {
    const arr = byCity.get(s.city_id) ?? [];
    arr.push(s);
    byCity.set(s.city_id, arr);
  });

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="mx-auto max-w-5xl px-4 py-6">
        <Link
          to="/app/biz"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> Înapoi
        </Link>

        <header className="mt-4">
          <span className="inline-flex items-center gap-1 rounded-full bg-[var(--tier-exclusive)]/20 px-3 py-1 text-xs font-bold uppercase tracking-widest text-[var(--tier-exclusive)]">
            <Crown className="size-3.5" /> Exclusive Partner Program
          </span>
          <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">
            3 sloturi per oraș. Când sunt ocupate, alții așteaptă.
          </h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            Slotul tău este vizibil pe homepage, pe hartă cu marker signature și are garantat top 3
            în Featured Tonight pentru orașul tău.
          </p>
        </header>

        <div className="mt-8 space-y-4">
          {(cities ?? []).map((c) => {
            const citySlots = byCity.get(c.id) ?? [];
            const free = citySlots.filter((s) => !s.business_id).length;
            return (
              <div key={c.id} className="rounded-3xl border border-border/40 bg-card/40 p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-bold">{c.name}</h3>
                    <p className="text-xs text-muted-foreground">{free} / 3 sloturi libere</p>
                  </div>
                  {biz?.tier === "exclusive" && free > 0 && (
                    <button
                      onClick={() => claim(c.id)}
                      className="rounded-2xl bg-[var(--tier-exclusive)] px-4 py-2 text-sm font-bold uppercase tracking-wider"
                      style={{ color: "oklch(0.15 0.02 30)" }}
                    >
                      Revendică
                    </button>
                  )}
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2">
                  {[1, 2, 3].map((idx) => {
                    const slot = citySlots.find((s) => s.slot_index === idx);
                    const taken = slot?.business_id;
                    return (
                      <div
                        key={idx}
                        className={`flex flex-col items-center justify-center rounded-xl border p-3 text-center text-xs ${
                          taken
                            ? "border-[var(--tier-exclusive)]/40 bg-[var(--tier-exclusive)]/10"
                            : "border-dashed border-border/40"
                        }`}
                      >
                        {taken ? (
                          <>
                            <Lock className="size-4 text-[var(--tier-exclusive)]" />
                            <span className="mt-1 font-bold">Slot {idx} · ocupat</span>
                            {slot?.locked_until && (
                              <span className="mt-1 inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                                <Clock className="size-3" />
                                până {new Date(slot.locked_until).toLocaleDateString("ro-RO")}
                              </span>
                            )}
                          </>
                        ) : (
                          <span className="text-muted-foreground">Slot {idx} · liber</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
