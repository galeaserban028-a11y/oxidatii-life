import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Rocket, Crown, Gift, PartyPopper, ArrowLeft, Check, Loader2, Beer, Sparkles } from "lucide-react";
import { AvatarFrame, FRAME_STYLES, TIER_LABEL } from "@/components/app/AvatarFrame";
import {
import { errorMessage } from "@/lib/errors";
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/app/shop")({
  head: () => ({ meta: [{ title: "Bar · OXIDAȚII" }] }),
  component: ShopPage,
});

type Tab = "boost" | "frames" | "gifts" | "party";

const drink = (n: number) => `${n} ${n === 1 ? "șpriț" : "șprițuri"}`;

type Confirm = {
  title: string;
  description: string;
  price: number;
  cta: string;
  onConfirm: () => Promise<void> | void;
} | null;

function ShopPage() {
  const { user, profile, refreshProfile } = useAuth();
  const qc = useQueryClient();
  const nav = useNavigate();
  const [tab, setTab] = useState<Tab>("boost");
  const [busy, setBusy] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<Confirm>(null);

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
      const { data } = await supabase
        .from("user_frames")
        .select("frame_id")
        .eq("user_id", user!.id);
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

  function notEnough(price: number) {
    toast.error(`Nu ai destule șprițuri. Îți trebuie ${drink(price)}, ai ${drink(balance)}.`, {
      action: { label: "Mai iau un rând", onClick: () => nav({ to: "/app/premium" }) },
    });
  }

  function ask(c: NonNullable<Confirm>) {
    setConfirm(c);
  }

  async function doBuyProfileBoost() {
    if (!user) return;
    setBusy("profile-boost");
    try {
      const { data, error } = await supabase.rpc("buy_boost", { _kind: "profile" });
      if (error) throw error;
      const newBal = (data as any)?.balance ?? 0;
      toast.success(`Profil boostat 24h! Mai ai ${drink(newBal)}`);
      await refreshProfile();
      qc.invalidateQueries({ queryKey: ["discover-suggestions"] });
    } catch (e) {
      toast.error(errorMessage(e) || "Eroare");
    } finally {
      setBusy(null);
    }
  }

  async function doBuyPartyBoost(partyId: string) {
    if (!user) return;
    setBusy(`party-${partyId}`);
    try {
      const { data, error } = await supabase.rpc("buy_boost", {
        _kind: "party",
        _target_id: partyId,
      });
      if (error) throw error;
      const newBal = (data as any)?.balance ?? 0;
      toast.success(`Petrecere boostată 12h! Mai ai ${drink(newBal)}`);
      await refreshProfile();
    } catch (e) {
      toast.error(errorMessage(e) || "Eroare");
    } finally {
      setBusy(null);
    }
  }

  async function doBuyFrame(frame: any) {
    if (!user) return;
    setBusy(`frame-${frame.id}`);
    try {
      const { data, error } = await supabase.rpc("buy_frame", { _frame_id: frame.id });
      if (error) throw error;
      const newBal = (data as any)?.balance ?? 0;
      toast.success(`Ai luat „${frame.name}" și e activă pe profil! Mai ai ${drink(newBal)}`);
      await refreshProfile();
      qc.invalidateQueries({ queryKey: ["owned-frames", user.id] });
      qc.invalidateQueries({ queryKey: ["active-frame"] });
    } catch (e) {
      toast.error(errorMessage(e) || "Eroare");
    } finally {
      setBusy(null);
    }
  }

  async function activateFrame(frame: any) {
    if (!user) return;
    const { error } = await supabase
      .from("profiles")
      .update({ active_frame_id: frame.id })
      .eq("id", user.id);
    if (error) return toast.error(error.message);
    toast.success(`Rama „${frame.name}" activată pe profil`);
    await refreshProfile();
    qc.invalidateQueries({ queryKey: ["active-frame"] });
  }

  async function deactivateFrame() {
    if (!user) return;
    await supabase.from("profiles").update({ active_frame_id: null }).eq("id", user.id);
    toast.success("Rama dezactivată");
    await refreshProfile();
  }

  // Confirmation triggers
  function askProfileBoost() {
    if (balance < 5) return notEnough(5);
    ask({
      title: "Boost profil · 24h",
      description: "Apari primul în Caută oameni și pe Discover timp de 24 de ore.",
      price: 5,
      cta: "Confirmă rândul",
      onConfirm: doBuyProfileBoost,
    });
  }
  function askPartyBoost(p: any) {
    if (balance < 15) return notEnough(15);
    ask({
      title: `Boost petrecere · ${p.title}`,
      description: "Petrecerea va apărea promovată în feed și pe hartă timp de 12 ore.",
      price: 15,
      cta: "Confirmă boost",
      onConfirm: () => doBuyPartyBoost(p.id),
    });
  }
  function askFrame(frame: any) {
    if (ownedFrames?.has(frame.id)) {
      activateFrame(frame);
      return;
    }
    const price = frame.price_coins ?? 0;
    if (balance < price) return notEnough(price);
    ask({
      title: `Cumperi „${frame.name}"`,
      description:
        price === 0
          ? "Rama este gratuită și se activează automat pe profil."
          : `Rama va fi adăugată în colecția ta și activată automat pe profil. Te va costa ${drink(price)}.`,
      price,
      cta: price === 0 ? "Activează" : "Confirmă cumpărarea",
      onConfirm: () => doBuyFrame(frame),
    });
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
      <header className="flex items-center gap-3">
        <button
          onClick={() => nav({ to: "/app/me" })}
          className="p-2 -ml-2 rounded-full hover:bg-white/5"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="font-display text-2xl tracking-wide flex-1 uppercase">Bar</h1>
        <Link
          to="/app/premium"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/15 border border-amber-500/40 text-amber-300 text-sm font-semibold"
        >
          <Beer size={16} /> {balance}
        </Link>
      </header>

      <div
        className="relative overflow-hidden rounded-2xl border border-amber-400/30 p-5"
        style={{
          background:
            "linear-gradient(135deg, oklch(0.30 0.06 50 / 0.5), oklch(0.20 0.03 30 / 0.5))",
        }}
      >
        <div className="absolute -right-4 -top-4 text-7xl opacity-15 select-none">🍺</div>
        <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-amber-300/80">
          săptămâna asta
        </div>
        <div className="mt-1 font-display uppercase text-xl leading-tight">
          1 șpriț gratis, din partea casei
        </div>
        <p className="text-[12px] text-foreground/70 mt-1 max-w-[34ch]">
          Îți pică automat în cont luni dimineața. Mai vrei? Iei un rând de mai jos.
        </p>
      </div>

      <p className="text-sm text-muted-foreground">
        Șprițurile sunt moneda din bar. Le dai pe boost-uri, rame, cadouri sau boost de petrecere.{" "}
        <Link to="/app/premium" className="underline text-amber-300">
          Mai iei un rând
        </Link>
        .
      </p>

      <nav className="flex gap-2 overflow-x-auto -mx-4 px-4">
        <TabBtn active={tab === "boost"} onClick={() => setTab("boost")} icon={<Rocket size={14} />}>
          Boost profil
        </TabBtn>
        <TabBtn active={tab === "frames"} onClick={() => setTab("frames")} icon={<Crown size={14} />}>
          Rame avatar
        </TabBtn>
        <TabBtn active={tab === "gifts"} onClick={() => setTab("gifts")} icon={<Gift size={14} />}>
          Cadouri chat
        </TabBtn>
        <TabBtn active={tab === "party"} onClick={() => setTab("party")} icon={<PartyPopper size={14} />}>
          Boost petrecere
        </TabBtn>
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
              <PriceTag price={5} />
            </div>
          </div>
          <button
            onClick={askProfileBoost}
            disabled={busy === "profile-boost"}
            className="mt-4 w-full py-3 rounded-xl bg-gradient-to-r from-fuchsia-500 to-purple-600 font-display text-sm uppercase tracking-wide text-white disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {busy === "profile-boost" ? (
              <Loader2 className="animate-spin" size={16} />
            ) : (
              <Beer size={16} />
            )}
            Dă rândul · {drink(5)}
          </button>
        </Card>
      )}

      {tab === "frames" && (
        <div className="grid grid-cols-2 gap-3">
          {(frames ?? []).map((f: any) => {
            const owned = ownedFrames?.has(f.id);
            const active = profile?.active_frame_id === f.id;
            const meta = FRAME_STYLES[f.id];
            const tier = meta?.tier ?? "starter";
            const price = f.price_coins ?? 0;
            return (
              <div
                key={f.id}
                className="relative overflow-hidden rounded-2xl border border-white/10 p-4"
                style={{
                  background:
                    "radial-gradient(circle at 50% 0%, rgba(255,255,255,0.06), rgba(0,0,0,0.25) 70%)",
                }}
              >
                {/* Tier badge */}
                <div className="absolute top-2 right-2 z-10">
                  <span
                    className={`text-[9px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-full border ${tierBadgeClass(
                      tier,
                    )}`}
                  >
                    {TIER_LABEL[tier]}
                  </span>
                </div>

                <div className="flex flex-col items-center gap-3 py-2">
                  <div className="p-2">
                    <AvatarFrame
                      frameId={f.id}
                      size={88}
                      innerClassName="bg-gradient-to-br from-purple-500/40 to-pink-500/40 grid place-items-center text-3xl"
                    >
                      {f.emoji ?? "👤"}
                    </AvatarFrame>
                  </div>

                  <div className="text-center">
                    <div className="font-display text-base leading-tight">{f.name}</div>
                    <div className="mt-1 inline-flex items-center gap-1 text-amber-300 text-[13px] font-semibold">
                      {price === 0 ? (
                        <span className="text-emerald-300">Gratis</span>
                      ) : (
                        <>
                          <Beer size={12} /> {drink(price)}
                        </>
                      )}
                    </div>
                  </div>

                  {active ? (
                    <button
                      onClick={deactivateFrame}
                      className="w-full py-2 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs flex items-center justify-center gap-1.5"
                    >
                      <Check size={14} /> Activă · scoate
                    </button>
                  ) : owned ? (
                    <button
                      onClick={() => askFrame(f)}
                      disabled={busy === `frame-${f.id}`}
                      className="w-full py-2 rounded-lg bg-white/10 border border-white/20 text-white text-xs disabled:opacity-50 flex items-center justify-center gap-1.5"
                    >
                      <Sparkles size={12} /> Activează
                    </button>
                  ) : (
                    <button
                      onClick={() => askFrame(f)}
                      disabled={busy === `frame-${f.id}`}
                      className="w-full py-2 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-200 text-xs disabled:opacity-50 flex items-center justify-center gap-1.5"
                    >
                      {busy === `frame-${f.id}` ? (
                        <Loader2 className="animate-spin" size={12} />
                      ) : (
                        <Beer size={12} />
                      )}
                      {price === 0 ? "Activează gratis" : `Cumpără · ${drink(price)}`}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {tab === "gifts" && (
        <Card>
          <div className="font-display text-base mb-2 uppercase">Cadouri pentru chat</div>
          <p className="text-xs text-muted-foreground mb-3">
            Trimite un cadou într-o conversație din butonul 🎁. Catalog & prețuri:
          </p>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {(gifts ?? []).map((g: any) => (
              <div
                key={g.id}
                className="rounded-xl border border-white/10 bg-white/5 p-3 text-center"
              >
                <div className="text-3xl">{g.emoji}</div>
                <div className="text-xs mt-1">{g.name}</div>
                <div className="text-[11px] text-amber-300 flex items-center justify-center gap-1 mt-1 font-semibold">
                  <Beer size={10} /> {drink(g.price_coins)}
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
              <PriceTag price={15} suffix="/ petrecere" />
            </div>
          </div>
          {!myParties?.length ? (
            <div className="text-sm text-muted-foreground text-center py-6">
              Nu ai nicio petrecere activă.{" "}
              <Link to="/app/parties" className="text-fuchsia-300 underline">
                Creează una
              </Link>
              .
            </div>
          ) : (
            <div className="space-y-2">
              {myParties.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/5 p-3"
                >
                  <div className="min-w-0">
                    <div className="font-medium truncate">{p.title}</div>
                    <div className="text-[11px] text-muted-foreground">
                      expiră {new Date(p.expires_at).toLocaleString("ro-RO")}
                    </div>
                  </div>
                  <button
                    onClick={() => askPartyBoost(p)}
                    disabled={busy === `party-${p.id}`}
                    className="px-3 py-2 rounded-lg bg-pink-500/20 border border-pink-500/40 text-pink-200 text-xs disabled:opacity-50 flex items-center gap-1.5 shrink-0"
                  >
                    {busy === `party-${p.id}` ? (
                      <Loader2 className="animate-spin" size={12} />
                    ) : (
                      <Rocket size={12} />
                    )}
                    Boost · {drink(15)}
                  </button>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Confirmation dialog */}
      <AlertDialog open={!!confirm} onOpenChange={(o) => !o && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirm?.title}</AlertDialogTitle>
            <AlertDialogDescription>{confirm?.description}</AlertDialogDescription>
          </AlertDialogHeader>
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 flex items-center justify-between">
            <span className="text-xs uppercase tracking-wider text-amber-300/80 font-mono">Cost</span>
            <span className="flex items-center gap-1.5 text-amber-200 font-display">
              <Beer size={14} />
              {confirm ? (confirm.price === 0 ? "Gratis" : drink(confirm.price)) : ""}
            </span>
          </div>
          <div className="flex items-center justify-between text-[11px] text-muted-foreground -mt-1">
            <span>Sold actual</span>
            <span>{drink(balance)}</span>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Anulează</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                const c = confirm;
                setConfirm(null);
                if (c) await c.onConfirm();
              }}
            >
              {confirm?.cta ?? "Confirmă"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function PriceTag({ price, suffix }: { price: number; suffix?: string }) {
  return (
    <div className="mt-1 inline-flex items-center gap-1.5 text-amber-300 text-sm font-semibold">
      <Beer size={13} /> {drink(price)} {suffix && <span className="text-muted-foreground font-normal text-xs">{suffix}</span>}
    </div>
  );
}

function tierBadgeClass(tier: string) {
  switch (tier) {
    case "mythic":
      return "bg-rose-500/15 border-rose-400/50 text-rose-200";
    case "legendary":
      return "bg-cyan-500/15 border-cyan-400/50 text-cyan-200";
    case "epic":
      return "bg-amber-500/15 border-amber-400/50 text-amber-200";
    case "rare":
      return "bg-violet-500/15 border-violet-400/50 text-violet-200";
    default:
      return "bg-white/10 border-white/20 text-white/70";
  }
}

function TabBtn({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
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
