import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Star, Gift, Swords, Crown, Plus, Trash2, X, Check, Trophy,
  ChevronDown, MapPin, MessageSquare, BarChart3, ShieldCheck, Wallet,
} from "lucide-react";
import { BizProEmbeddedCheckout } from "@/components/StripeEmbeddedCheckout";

const BATTLE_CATEGORIES = [
  "club", "bar", "cafenea", "festival", "restaurant", "beach", "promoter",
] as const;

export function BizUniquePanel({ business }: { business: any }) {
  return (
    <div className="space-y-3 pt-4">
      {/* PRO upsell on top — the most important decision */}
      <ProUpgradeCard business={business} />

      {/* Reputation = quick glance */}
      <ReputationCard business={business} />

      {/* Power tools — collapsed by default to reduce noise */}
      <Section
        icon={<Gift size={14} className="text-neon-crimson" />}
        title="Oferte fizice"
        subtitle="Userul scanează la fața locului, primește reward."
        defaultOpen={false}
      >
        <OffersCard business={business} />
      </Section>

      <Section
        icon={<Swords size={14} className="text-neon-purple" />}
        title="Battle săptămânal"
        subtitle="Câștigătorul = spotlight gratis 7 zile pe Discover."
        defaultOpen={false}
      >
        <BattleCard business={business} />
      </Section>
    </div>
  );
}

/* ============= Reusable collapsible section ============= */
function Section({
  icon, title, subtitle, defaultOpen = false, children,
}: { icon: React.ReactNode; title: string; subtitle: string; defaultOpen?: boolean; children: React.ReactNode }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-2xl bg-zinc-900/40 border border-white/5 overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-3 p-4 text-left hover:bg-white/[0.02] transition-colors"
      >
        <div className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center flex-shrink-0">
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium">{title}</div>
          <div className="text-[11px] text-zinc-500 truncate">{subtitle}</div>
        </div>
        <ChevronDown
          size={16}
          className={`text-zinc-500 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div className="px-4 pb-4 pt-1 border-t border-white/5">{children}</div>
      )}
    </div>
  );
}

/* ============= 1. REPUTATION — hero stat ============= */
function ReputationCard({ business }: { business: any }) {
  const score = Number(business.reputation_score ?? 0);
  const reviews = business.total_reviews ?? 0;
  const visits = business.total_visits ?? 0;
  const tier = score >= 4.5 ? "ELITE" : score >= 4.0 ? "TOP" : score >= 3.0 ? "VERIFIED" : "NEW";
  const tierColor = score >= 4.5 ? "#39FF14" : score >= 4.0 ? "#FFD60A" : score >= 3.0 ? "#00D4FF" : "#9D4EDD";

  return (
    <div className="rounded-2xl bg-zinc-900/40 border border-white/5 p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-0.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star
                key={i}
                size={16}
                className={i < Math.round(score) ? "fill-yellow-400 text-yellow-400" : "text-zinc-700"}
              />
            ))}
          </div>
          <div>
            <div className="font-display text-xl leading-none">
              {score.toFixed(1)}
              <span className="text-xs text-zinc-500 ml-1">/ 5</span>
            </div>
            <div className="text-[10px] text-zinc-500 mt-0.5">
              {reviews} review · {visits} vizite
            </div>
          </div>
        </div>
        <div
          className="font-mono text-[10px] uppercase tracking-widest px-2.5 py-1 rounded-md border"
          style={{ color: tierColor, borderColor: `${tierColor}55`, background: `${tierColor}11` }}
        >
          {tier}
        </div>
      </div>
      {reviews === 0 && (
        <div className="text-[10px] text-zinc-500 italic mt-2">
          Scor mai mare = costuri mai mici pe campanii.
        </div>
      )}
    </div>
  );
}

/* ============= 2. PRO UPGRADE — the hero ============= */
function ProUpgradeCard({ business }: { business: any }) {
  const [open, setOpen] = useState(false);
  const isPro = business.pro_tier && business.pro_until && new Date(business.pro_until) > new Date();

  if (isPro) {
    return (
      <div className="rounded-2xl bg-gradient-to-br from-yellow-500/20 via-amber-500/10 to-transparent border border-yellow-500/30 p-4 flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl bg-yellow-500/20 flex items-center justify-center flex-shrink-0">
          <Crown size={20} className="text-yellow-400" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium flex items-center gap-1.5">
            Pro Business activ <ShieldCheck size={13} className="text-yellow-400" />
          </div>
          <div className="text-[11px] text-zinc-400">
            Activ până {new Date(business.pro_until).toLocaleDateString("ro-RO")}
          </div>
        </div>
      </div>
    );
  }

  const benefits = [
    { icon: Wallet, label: "primești 50 RON credite lunar" },
    { icon: ShieldCheck, label: "badge Pro pe brand" },
    { icon: MapPin, label: "mai multă încredere pe hartă" },
    { icon: BarChart3, label: "vezi ce reclame merg" },
  ];

  return (
    <>
      <div
        className="rounded-2xl p-4 space-y-4 relative overflow-hidden"
        style={{
          background: "linear-gradient(135deg, rgba(245,158,11,0.15), rgba(217,119,6,0.05) 60%, transparent)",
          border: "1px solid rgba(245,158,11,0.25)",
        }}
      >
        {/* Header */}
        <div className="flex items-start gap-3">
          <div className="w-11 h-11 rounded-xl bg-yellow-500/20 flex items-center justify-center flex-shrink-0">
            <Crown size={20} className="text-yellow-400" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold">Pro Business, fără confuzie</div>
            <div className="text-[11px] text-zinc-400 mt-0.5">
              Plătești 49 RON/lună și primești 50 RON credit pentru promovare.
            </div>
          </div>
          <div className="text-right">
            <div className="font-display text-lg leading-none text-yellow-400">49<span className="text-[11px] text-zinc-400 font-mono"> RON</span></div>
            <div className="text-[9px] text-zinc-500 uppercase tracking-widest">/ lună</div>
          </div>
        </div>

        {/* Benefits */}
        <div className="grid grid-cols-2 gap-2">
          {benefits.map((b) => (
            <div key={b.label} className="flex items-center gap-2 text-[11px] text-zinc-300">
              <b.icon size={12} className="text-yellow-400 flex-shrink-0" />
              <span className="truncate">{b.label}</span>
            </div>
          ))}
        </div>

        {/* CTA */}
        <button
          onClick={() => setOpen(true)}
          className="w-full py-3 rounded-xl font-medium text-sm text-black transition-transform active:scale-[0.98]"
          style={{ background: "linear-gradient(135deg, #fbbf24, #f59e0b)" }}
        >
          Activează Pro Business
        </button>
        <div className="text-[10px] text-zinc-500 text-center -mt-2">
          Anulezi oricând. Dacă oprești, rămâne activ până la finalul perioadei.
        </div>
      </div>

      {open && (
        <div
          className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-start justify-center overflow-y-auto p-4"
          onClick={() => setOpen(false)}>
          <div
            className="bg-zinc-950 rounded-2xl max-w-lg w-full mt-8 border border-white/10 overflow-hidden"
            onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-white/5">
              <div className="font-display uppercase text-sm flex items-center gap-2">
                <Crown size={16} className="text-yellow-400" /> Verified Pro
              </div>
              <button onClick={() => setOpen(false)} className="p-1 text-zinc-400 hover:text-white">
                <X size={16} />
              </button>
            </div>
            <BizProEmbeddedCheckout
              businessId={business.id}
              returnUrl={`${window.location.origin}/app/biz?pro=success`}
            />
          </div>
        </div>
      )}
    </>
  );
}

/* ============= 3. OFFERS ============= */
function OffersCard({ business }: { business: any }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data: offers } = useQuery({
    queryKey: ["biz-offers", business.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("business_offers")
        .select("*")
        .eq("business_id", business.id)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const deleteOffer = async (id: string) => {
    if (!confirm("Ștergi oferta?")) return;
    await supabase.from("business_offers").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["biz-offers", business.id] });
  };

  const toggleActive = async (o: any) => {
    await supabase.from("business_offers").update({ active: !o.active }).eq("id", o.id);
    qc.invalidateQueries({ queryKey: ["biz-offers", business.id] });
  };

  return (
    <div className="space-y-2 pt-3">
      {offers && offers.length > 0 ? (
        <div className="space-y-1.5">
          {offers.map((o) => {
            const used = o.max_redemptions ? `${o.redeemed_count}/${o.max_redemptions}` : `${o.redeemed_count}`;
            return (
              <div key={o.id} className="rounded-lg bg-white/[0.02] border border-white/5 p-2.5 flex items-center gap-2">
                <div className="w-8 h-8 rounded-md bg-gradient-to-br from-neon-purple/30 to-neon-crimson/30 flex items-center justify-center flex-shrink-0">
                  <Gift size={13} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium truncate">{o.title}</div>
                  <div className="font-mono text-[9px] uppercase tracking-widest text-zinc-500 truncate">
                    {o.reward_text} · {used} claim
                  </div>
                </div>
                <button onClick={() => toggleActive(o)}
                  className={`text-[10px] font-mono uppercase tracking-widest px-2 py-1 rounded-md border ${o.active ? "border-neon-green text-neon-green" : "border-zinc-600 text-zinc-500"}`}>
                  {o.active ? "ON" : "OFF"}
                </button>
                <button onClick={() => deleteOffer(o.id)} className="p-1.5 text-zinc-500 hover:text-neon-crimson">
                  <Trash2 size={11} />
                </button>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-[11px] text-zinc-500 italic text-center py-3">
          Nicio ofertă activă încă.
        </div>
      )}
      <button
        onClick={() => setOpen(true)}
        className="w-full py-2.5 rounded-xl border border-dashed border-white/15 text-[12px] text-zinc-300 hover:border-neon-crimson hover:text-neon-crimson transition-colors flex items-center justify-center gap-1.5"
      >
        <Plus size={13} /> Adaugă ofertă
      </button>

      {open && <OfferCreator businessId={business.id} onClose={() => setOpen(false)} />}
    </div>
  );
}

function OfferCreator({ businessId, onClose }: { businessId: string; onClose: () => void }) {
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [reward, setReward] = useState("");
  const [minRating, setMinRating] = useState(0);
  const [maxRedemptions, setMaxRedemptions] = useState<string>("");
  const [days, setDays] = useState(7);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!title.trim() || !reward.trim()) return;
    setBusy(true);
    const expires = new Date();
    expires.setDate(expires.getDate() + days);
    const { error } = await supabase.from("business_offers").insert({
      business_id: businessId,
      title: title.trim(),
      reward_text: reward.trim(),
      min_user_rating: minRating,
      max_redemptions: maxRedemptions ? parseInt(maxRedemptions, 10) : null,
      expires_at: expires.toISOString(),
      active: true,
    });
    setBusy(false);
    if (error) { alert(error.message); return; }
    qc.invalidateQueries({ queryKey: ["biz-offers", businessId] });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md rounded-2xl bg-zinc-950 border border-white/10 p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="font-display uppercase text-lg">Ofertă nouă</div>
          <button onClick={onClose} className="p-1 text-zinc-500"><X size={16} /></button>
        </div>
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Titlu (ex: Happy hour)"
          className="w-full bg-white/5 rounded-lg px-3 py-2.5 text-sm border border-white/10 focus:border-neon-crimson outline-none" />
        <input value={reward} onChange={(e) => setReward(e.target.value)} placeholder="Reward (ex: -50% la cocktail)"
          className="w-full bg-white/5 rounded-lg px-3 py-2.5 text-sm border border-white/10 focus:border-neon-crimson outline-none" />
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="font-mono text-[9px] uppercase tracking-widest text-zinc-500">Rating minim</label>
            <select value={minRating} onChange={(e) => setMinRating(Number(e.target.value))}
              className="w-full bg-white/5 rounded-lg px-2 py-2 text-sm border border-white/10 outline-none mt-1">
              <option value={0}>Oricine</option>
              <option value={3}>★ 3.0+</option>
              <option value={3.5}>★ 3.5+</option>
              <option value={4}>★ 4.0+ (top)</option>
              <option value={4.5}>★ 4.5+ (elite)</option>
            </select>
          </div>
          <div>
            <label className="font-mono text-[9px] uppercase tracking-widest text-zinc-500">Limită claim</label>
            <input type="number" value={maxRedemptions} onChange={(e) => setMaxRedemptions(e.target.value)} placeholder="∞"
              className="w-full bg-white/5 rounded-lg px-2 py-2 text-sm border border-white/10 outline-none mt-1" />
          </div>
        </div>
        <div>
          <label className="font-mono text-[9px] uppercase tracking-widest text-zinc-500">Expiră în</label>
          <div className="grid grid-cols-4 gap-1.5 mt-1">
            {[1, 3, 7, 30].map((d) => (
              <button key={d} onClick={() => setDays(d)}
                className={`py-2 rounded-lg text-[10px] font-mono uppercase tracking-widest border ${days === d ? "bg-neon-crimson/15 border-neon-crimson text-neon-crimson" : "border-white/10 text-zinc-400"}`}>
                {d}z
              </button>
            ))}
          </div>
        </div>
        <button onClick={submit} disabled={busy || !title.trim() || !reward.trim()}
          className="w-full py-3 rounded-lg font-display uppercase text-[12px] tracking-widest text-white disabled:opacity-50"
          style={{ background: "var(--gradient-chaos)" }}>
          {busy ? "..." : "Publică oferta"}
        </button>
      </div>
    </div>
  );
}

/* ============= 4. BATTLE MODE ============= */
function BattleCard({ business }: { business: any }) {
  const qc = useQueryClient();
  const [category, setCategory] = useState<string>("club");
  const [stake, setStake] = useState(50);

  const weekStart = (() => {
    const d = new Date();
    const day = d.getDay() || 7;
    d.setDate(d.getDate() - day + 1);
    d.setHours(0, 0, 0, 0);
    return d.toISOString().split("T")[0];
  })();

  const { data: leaderboard } = useQuery({
    queryKey: ["biz-battle", business.city_id, category, weekStart],
    queryFn: async () => {
      const { data } = await supabase
        .from("business_battles")
        .select("id, business_id, score, stake_cents, business_accounts(brand_name, logo_url)")
        .eq("category", category)
        .eq("week_start", weekStart)
        .order("score", { ascending: false })
        .limit(5);
      return data ?? [];
    },
  });

  const myEntry = leaderboard?.find((b: any) => b.business_id === business.id);

  const enterBattle = async () => {
    const { error } = await supabase.from("business_battles").upsert({
      business_id: business.id,
      city_id: business.city_id,
      category,
      week_start: weekStart,
      stake_cents: stake * 100,
    }, { onConflict: "business_id,category,week_start" });
    if (error) { alert(error.message); return; }
    qc.invalidateQueries({ queryKey: ["biz-battle"] });
  };

  return (
    <div className="space-y-3 pt-3">
      <div className="flex flex-wrap gap-1.5">
        {BATTLE_CATEGORIES.map((c) => (
          <button key={c} onClick={() => setCategory(c)}
            className={`px-2.5 py-1 rounded-full text-[10px] font-mono uppercase tracking-widest border ${category === c ? "bg-neon-purple/20 border-neon-purple text-neon-purple" : "border-white/10 text-zinc-400"}`}>
            {c}
          </button>
        ))}
      </div>

      {leaderboard && leaderboard.length > 0 ? (
        <div className="space-y-1.5">
          {leaderboard.map((row: any, idx: number) => {
            const isMe = row.business_id === business.id;
            return (
              <div key={row.id}
                className={`flex items-center gap-2 rounded-lg p-2 ${isMe ? "bg-neon-purple/10 border border-neon-purple/30" : "bg-white/[0.02]"}`}>
                <div className="w-6 text-center font-display text-sm">
                  {idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : `#${idx + 1}`}
                </div>
                <div className="flex-1 min-w-0 text-xs truncate">{row.business_accounts?.brand_name ?? "?"}</div>
                <div className="font-mono text-[10px] text-zinc-400">{row.score} pts</div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-[11px] text-zinc-500 italic text-center py-2">Nicio competiție începută. Fii primul.</div>
      )}

      {!myEntry ? (
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <label className="font-mono text-[9px] uppercase tracking-widest text-zinc-500">Miza</label>
            <select value={stake} onChange={(e) => setStake(Number(e.target.value))}
              className="w-full bg-white/5 rounded-lg px-2 py-2 text-sm border border-white/10 outline-none mt-1">
              <option value={50}>50 RON</option>
              <option value={100}>100 RON</option>
              <option value={250}>250 RON</option>
              <option value={500}>500 RON · serious</option>
            </select>
          </div>
          <button onClick={enterBattle}
            className="self-end py-2 px-4 rounded-lg font-display uppercase text-[11px] tracking-widest text-white"
            style={{ background: "var(--gradient-chaos)" }}>
            <Trophy size={12} className="inline mr-1" /> Intră
          </button>
        </div>
      ) : (
        <div className="rounded-lg bg-neon-purple/10 border border-neon-purple/30 p-2 text-[10px] text-neon-purple font-mono uppercase tracking-widest text-center">
          ✓ Înscris · miza {(myEntry.stake_cents / 100).toFixed(0)} RON
        </div>
      )}
    </div>
  );
}
