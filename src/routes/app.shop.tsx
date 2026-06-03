import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Rocket, Crown, Gift, PartyPopper, ArrowLeft, Check, Loader2, Beer } from "lucide-react";

export const Route = createFileRoute("/app/shop")({
  head: () => ({ meta: [{ title: "Bar · OXIDAȚII" }] }),
  component: ShopPage,
});

type Tab = "boost" | "frames" | "gifts" | "party";

// thematic helper — "5 șprițuri" / "1 șpriț"
const drink = (n: number) => `${n} ${n === 1 ? "șpriț" : "șprițuri"}`;

function ShopPage() {
  const { user, profile, refreshProfile } = useAuth();
  const qc = useQueryClient();
  const nav = useNavigate();
  const [tab, setTab] = useState<Tab>("boost");
  const [busy, setBusy] = useState<string | null>(null);

  const balance = profile?.coin_balance ?? 0;

  const { data: frames } = useQuery({
    queryKey: ["avatar-frames"],
    queryFn: async () => {
      const { data } = await supabase.from("avatar_frames").select("*").order("price_coins");
      return data ?? [];
    },
  });

  const { data: gifts } = useQuery({
    queryKey: ["chat-gift-catalog"],
    queryFn: async () => {
      const { data } = await supabase.from("chat_gift_catalog").select("*").order("price_coins");
      return data ?? [];
    },
  });

  const { data: ownedFrames } = useQuery({
    queryKey: ["owned-frames", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("user_frames").select("frame_id").eq("user_id", user!.id);
      return new Set((data ?? []).map((r: any) => r.frame_id));
    },
  });

  const { data: myParties } = useQuery({
    queryKey: ["my-parties", user?.id],
    enabled: !!user && tab === "party",
    queryFn: async () => {
      const { data } = await supabase
        .from("parties")
        .select("id,title,expires_at")
        .eq("host_id", user!.id)
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  async function spend(amount: number, kind: string, refId?: string) {
    const { data, error } = await supabase.rpc("spend_coins", {
      _amount: amount, _kind: kind, _ref_id: refId,
    });
    if (error) throw new Error(error.message);
    return data as number;
  }

  async function buyProfileBoost() {
    if (!user) return;
    setBusy("profile-boost");
    try {
      const newBal = await spend(5, "boost_profile");
      const expires = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      const { error } = await supabase.from("coin_boosts").insert({
        user_id: user.id, kind: "profile", expires_at: expires, cost_coins: 5,
      });
      if (error) throw error;
      toast.success(`Profil boostat 24h! Mai ai ${drink(newBal)}`);
      await refreshProfile();
      qc.invalidateQueries({ queryKey: ["discover-suggestions"] });
    } catch (e: any) {
      toast.error(e.message || "Eroare");
    } finally { setBusy(null); }
  }

  async function buyPartyBoost(partyId: string) {
    if (!user) return;
    setBusy(`party-${partyId}`);
    try {
      const newBal = await spend(15, "boost_party", partyId);
      const expires = new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString();
      const { error } = await supabase.from("coin_boosts").insert({
        user_id: user.id, kind: "party", target_id: partyId, expires_at: expires, cost_coins: 15,
      });
      if (error) throw error;
      toast.success(`Petrecere boostată 12h! Mai ai ${drink(newBal)}`);
      await refreshProfile();
    } catch (e: any) {
      toast.error(e.message || "Eroare");
    } finally { setBusy(null); }
  }

  async function buyFrame(frame: any) {
    if (!user) return;
    if (ownedFrames?.has(frame.id)) {
      const { error } = await supabase.from("profiles").update({ active_frame_id: frame.id }).eq("id", user.id);
      if (error) return toast.error(error.message);
      toast.success(`Rama "${frame.name}" activată`);
      await refreshProfile();
      return;
    }
    setBusy(`frame-${frame.id}`);
    try {
      const newBal = await spend(frame.price_coins, "frame", frame.id);
      const { error: e1 } = await supabase.from("user_frames").insert({ user_id: user.id, frame_id: frame.id });
      if (e1) throw e1;
      await supabase.from("profiles").update({ active_frame_id: frame.id }).eq("id", user.id);
      toast.success(`Ai luat „${frame.name}"! Mai ai ${drink(newBal)}`);
      await refreshProfile();
      qc.invalidateQueries({ queryKey: ["owned-frames"] });
    } catch (e: any) {
      toast.error(e.message || "Eroare");
    } finally { setBusy(null); }
  }

  async function deactivateFrame() {
    if (!user) return;
    await supabase.from("profiles").update({ active_frame_id: null }).eq("id", user.id);
    toast.success("Rama dezactivată");
    await refreshProfile();
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
      <header className="flex items-center gap-3">
        <button onClick={() => nav({ to: "/app/me" })} className="p-2 -ml-2 rounded-full hover:bg-white/5">
          <ArrowLeft size={20} />
        </button>
        <h1 className="font-display text-2xl tracking-wide flex-1 uppercase">Bar</h1>
        <Link to="/app/premium" className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/15 border border-amber-500/40 text-amber-300 text-sm font-semibold">
          <Beer size={16} /> {balance}
        </Link>
      </header>

      {/* Weekly free drink — the new headline idea */}
      <div className="relative overflow-hidden rounded-2xl border border-amber-400/30 p-5"
        style={{ background: "linear-gradient(135deg, oklch(0.30 0.06 50 / 0.5), oklch(0.20 0.03 30 / 0.5))" }}>
        <div className="absolute -right-4 -top-4 text-7xl opacity-15 select-none">🍺</div>
        <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-amber-300/80">săptămâna asta</div>
        <div className="mt-1 font-display uppercase text-xl leading-tight">
          1 șpriț gratis, din partea casei
        </div>
        <p className="text-[12px] text-foreground/70 mt-1 max-w-[34ch]">
          Îți pică automat în cont luni dimineața. Mai vrei? Iei un rând de mai jos.
        </p>
        <div className="mt-3 inline-flex items-center gap-2 text-[10px] font-mono uppercase tracking-wider text-amber-300/70">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-300 animate-pulse" />
          în curând — runda săptămânală
        </div>
      </div>

      <p className="text-sm text-muted-foreground">
        Șprițurile sunt moneda din bar. Le dai pe boost-uri, rame, cadouri în chat, sau pe boost de petrecere.
        Rămân la tine — nu expiră. Mai vrei? <Link to="/app/premium" className="underline text-amber-300">Mai iei un rând</Link>.
      </p>

      <nav className="flex gap-2 overflow-x-auto -mx-4 px-4">
        <TabBtn active={tab === "boost"} onClick={() => setTab("boost")} icon={<Rocket size={14} />}>Boost profil</TabBtn>
        <TabBtn active={tab === "frames"} onClick={() => setTab("frames")} icon={<Crown size={14} />}>Rame avatar</TabBtn>
        <TabBtn active={tab === "gifts"} onClick={() => setTab("gifts")} icon={<Gift size={14} />}>Cadouri chat</TabBtn>
        <TabBtn active={tab === "party"} onClick={() => setTab("party")} icon={<PartyPopper size={14} />}>Boost petrecere</TabBtn>
      </nav>

      {tab === "boost" && (
        <Card>
          <div className="flex items-start gap-3">
            <div className="h-12 w-12 rounded-2xl bg-fuchsia-500/20 border border-fuchsia-500/40 grid place-items-center">
              <Rocket className="text-fuchsia-300" />
            </div>
            <div className="flex-1">
              <div className="font-display text-lg uppercase">Boost profil · 24h</div>
              <div className="text-sm text-muted-foreground">
                Apari primul în <em>Caută oameni</em> și pe Discover timp de 24 de ore.
              </div>
            </div>
          </div>
          <button
            onClick={buyProfileBoost}
            disabled={!!busy || balance < 5}
            className="mt-4 w-full py-3 rounded-xl bg-gradient-to-r from-fuchsia-500 to-purple-600 font-display text-sm uppercase tracking-wide text-white disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {busy === "profile-boost" ? <Loader2 className="animate-spin" size={16} /> : <Beer size={16} />}
            Dă rândul · {drink(5)}
          </button>
        </Card>
      )}

      {tab === "frames" && (
        <div className="grid grid-cols-2 gap-3">
          {(frames ?? []).map((f: any) => {
            const owned = ownedFrames?.has(f.id);
            const active = profile?.active_frame_id === f.id;
            return (
              <Card key={f.id}>
                <div className="flex flex-col items-center gap-3 py-2">
                  <div className={`h-20 w-20 rounded-full bg-gradient-to-br from-purple-500/40 to-pink-500/40 ${f.css_class} grid place-items-center text-3xl`}>
                    {f.emoji ?? "👤"}
                  </div>
                  <div className="font-display text-base">{f.name}</div>
                  {active ? (
                    <button onClick={deactivateFrame} className="w-full py-2 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs flex items-center justify-center gap-1.5">
                      <Check size={14} /> Activă · scoate
                    </button>
                  ) : (
                    <button
                      onClick={() => buyFrame(f)}
                      disabled={!!busy || (!owned && balance < f.price_coins)}
                      className="w-full py-2 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-200 text-xs disabled:opacity-50 flex items-center justify-center gap-1.5"
                    >
                      {busy === `frame-${f.id}` ? <Loader2 className="animate-spin" size={12} /> : <Beer size={12} />}
                      {owned ? "Activează" : drink(f.price_coins)}
                    </button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {tab === "gifts" && (
        <Card>
          <div className="font-display text-base mb-2 uppercase">Cadouri pentru chat</div>
          <p className="text-xs text-muted-foreground mb-3">
            Trimite un cadou într-o conversație din butonul 🎁. Catalogul:
          </p>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {(gifts ?? []).map((g: any) => (
              <div key={g.id} className="rounded-xl border border-white/10 bg-white/5 p-3 text-center">
                <div className="text-3xl">{g.emoji}</div>
                <div className="text-xs mt-1">{g.name}</div>
                <div className="text-[11px] text-amber-300 flex items-center justify-center gap-1 mt-1">
                  <Beer size={10} /> {g.price_coins}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {tab === "party" && (
        <Card>
          <div className="flex items-start gap-3 mb-4">
            <div className="h-12 w-12 rounded-2xl bg-pink-500/20 border border-pink-500/40 grid place-items-center">
              <PartyPopper className="text-pink-300" />
            </div>
            <div className="flex-1">
              <div className="font-display text-lg uppercase">Boost petrecere · 12h</div>
              <div className="text-sm text-muted-foreground">
                Petrecerea ta apare promovată în feed și pe hartă timp de 12 ore.
              </div>
              <div className="text-xs text-amber-300 mt-1">{drink(15)} / petrecere</div>
            </div>
          </div>
          {!myParties?.length ? (
            <div className="text-sm text-muted-foreground text-center py-6">
              Nu ai nicio petrecere activă. <Link to="/app/parties" className="text-fuchsia-300 underline">Creează una</Link>.
            </div>
          ) : (
            <div className="space-y-2">
              {myParties.map((p) => (
                <div key={p.id} className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/5 p-3">
                  <div className="min-w-0">
                    <div className="font-medium truncate">{p.title}</div>
                    <div className="text-[11px] text-muted-foreground">
                      expiră {new Date(p.expires_at).toLocaleString("ro-RO")}
                    </div>
                  </div>
                  <button
                    onClick={() => buyPartyBoost(p.id)}
                    disabled={!!busy || balance < 15}
                    className="px-3 py-2 rounded-lg bg-pink-500/20 border border-pink-500/40 text-pink-200 text-xs disabled:opacity-50 flex items-center gap-1.5 shrink-0"
                  >
                    {busy === `party-${p.id}` ? <Loader2 className="animate-spin" size={12} /> : <Rocket size={12} />}
                    Boost · {drink(15)}
                  </button>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}
    </div>
  );
}

function TabBtn({ active, onClick, icon, children }: { active: boolean; onClick: () => void; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-full border text-xs font-display uppercase tracking-wide transition ${
        active
          ? "bg-fuchsia-500/25 border-fuchsia-400/60 text-white"
          : "bg-white/5 border-white/10 text-muted-foreground hover:text-white"
      }`}
    >
      {icon} {children}
    </button>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return <div className="rounded-2xl border border-white/10 bg-white/5 p-4">{children}</div>;
}
