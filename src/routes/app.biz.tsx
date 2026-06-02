import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Building2, Wallet, Rocket, Plus, TrendingUp, Eye, MousePointerClick } from "lucide-react";

export const Route = createFileRoute("/app/biz")({
  head: () => ({ meta: [{ title: "Business · OXIDAȚII" }] }),
  component: BizPage,
});

const BUSINESS_TYPES = [
  { value: "club", label: "Club" },
  { value: "bar", label: "Bar" },
  { value: "festival", label: "Festival" },
  { value: "promoter", label: "Promoter" },
  { value: "host", label: "Organizator privat" },
  { value: "beach", label: "Beach party" },
] as const;

async function loadBiz(userId: string) {
  const { data: businesses } = await supabase
    .from("business_accounts")
    .select("*")
    .eq("owner_user_id", userId)
    .order("created_at", { ascending: false });

  if (!businesses?.length) return { businesses: [], campaigns: [], parties: [] };

  const bizIds = businesses.map((b) => b.id);
  const [{ data: campaigns }, { data: parties }] = await Promise.all([
    supabase
      .from("campaigns")
      .select("*")
      .in("business_id", bizIds)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("parties")
      .select("id, title, location_text, starts_at, expires_at")
      .eq("host_id", userId)
      .gt("expires_at", new Date().toISOString())
      .order("starts_at", { ascending: false }),
  ]);

  return { businesses, campaigns: campaigns ?? [], parties: parties ?? [] };
}

function ronFromCents(c: number) {
  return (c / 100).toFixed(2);
}

function BizPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["biz", user?.id],
    enabled: !!user,
    queryFn: () => loadBiz(user!.id),
  });

  const [createOpen, setCreateOpen] = useState(false);
  const [brand, setBrand] = useState("");
  const [type, setType] = useState<(typeof BUSINESS_TYPES)[number]["value"]>("promoter");
  const [busy, setBusy] = useState(false);

  if (!user) {
    return <div className="px-4 pt-6 text-sm text-muted-foreground">Conectează-te.</div>;
  }

  const createBusiness = async () => {
    if (!brand.trim()) return;
    setBusy(true);
    const slug = brand.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const { error } = await supabase.from("business_accounts").insert({
      owner_user_id: user.id,
      brand_name: brand.trim(),
      slug: slug || null,
      type,
    });
    setBusy(false);
    if (!error) {
      setBrand("");
      setCreateOpen(false);
      qc.invalidateQueries({ queryKey: ["biz"] });
    } else {
      alert(error.message);
    }
  };

  const topup = async (bizId: string, currentBalance: number, amountRon: number) => {
    const cents = Math.round(amountRon * 100);
    const { error: lErr } = await supabase.from("wallet_ledger").insert({
      business_id: bizId,
      kind: "topup",
      amount_cents: cents,
      note: `Top-up demo +${amountRon} RON`,
    });
    if (lErr) {
      alert(lErr.message);
      return;
    }
    const { error: uErr } = await supabase
      .from("business_accounts")
      .update({ wallet_balance_cents: currentBalance + cents })
      .eq("id", bizId);
    if (uErr) alert(uErr.message);
    qc.invalidateQueries({ queryKey: ["biz"] });
  };

  return (
    <div className="px-4 pt-5 pb-24 space-y-5">
      <header className="space-y-1">
        <div className="flex items-center gap-2">
          <Building2 size={11} className="text-neon-purple" />
          <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-neon-purple">
            // BUSINESS
          </span>
        </div>
        <h1 className="font-display uppercase text-2xl leading-none tracking-tight">
          Cresci-ți <span className="text-gradient-chaos">clubul.</span>
        </h1>
        <p className="text-xs text-muted-foreground">
          Promovează evenimente, vezi audiența, plătești doar pentru rezultate.
        </p>
      </header>

      {isLoading ? (
        <div className="h-32 rounded-2xl bg-foreground/[0.04] animate-pulse" />
      ) : data?.businesses.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-foreground/15 p-6 text-center space-y-3">
          <div className="text-4xl">🏢</div>
          <div className="font-display uppercase">Niciun business încă</div>
          <p className="text-xs text-muted-foreground max-w-xs mx-auto">
            Înregistrează-ți brandul ca să poți boost-a evenimente și să intri în feed-ul orașului.
          </p>
          <button
            onClick={() => setCreateOpen(true)}
            className="inline-flex items-center gap-1.5 font-display uppercase text-[11px] tracking-widest px-4 py-2 rounded-md text-white"
            style={{ background: "var(--gradient-chaos)" }}
          >
            <Plus size={12} /> Creează business
          </button>
        </div>
      ) : (
        <>
          {data!.businesses.map((b) => {
            const bizCampaigns = data!.campaigns.filter((c) => c.business_id === b.id);
            return (
              <BusinessCard
                key={b.id}
                business={b}
                campaigns={bizCampaigns}
                parties={data!.parties}
                onTopup={(amount) => topup(b.id, b.wallet_balance_cents, amount)}
              />
            );
          })}
          <button
            onClick={() => setCreateOpen(true)}
            className="w-full font-mono text-[10px] uppercase tracking-widest px-4 py-3 rounded-md border border-dashed border-foreground/20 hover:border-neon-crimson flex items-center justify-center gap-1.5"
          >
            <Plus size={12} /> Adaugă un alt business
          </button>
        </>
      )}

      {createOpen && (
        <div className="fixed inset-0 z-50 bg-background/90 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl bg-background border border-foreground/15 p-5 space-y-4">
            <div>
              <div className="font-display uppercase text-lg">Business nou</div>
              <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                // numele tău public
              </div>
            </div>
            <input
              autoFocus
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
              placeholder="Ex: Club Form"
              className="w-full bg-foreground/5 rounded-md px-3 py-2.5 text-sm border border-foreground/10 focus:border-neon-crimson outline-none"
            />
            <div className="grid grid-cols-3 gap-2">
              {BUSINESS_TYPES.map((t) => (
                <button
                  key={t.value}
                  onClick={() => setType(t.value)}
                  className={`px-2 py-2 rounded-md text-[10px] font-mono uppercase tracking-widest border ${
                    type === t.value
                      ? "bg-neon-crimson/15 border-neon-crimson text-neon-crimson"
                      : "border-foreground/10 text-muted-foreground"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setCreateOpen(false)}
                className="flex-1 px-3 py-2.5 rounded-md border border-foreground/15 text-xs font-mono uppercase tracking-widest"
              >
                Renunță
              </button>
              <button
                disabled={busy || !brand.trim()}
                onClick={createBusiness}
                className="flex-1 px-3 py-2.5 rounded-md text-white text-xs font-display uppercase tracking-widest disabled:opacity-50"
                style={{ background: "var(--gradient-chaos)" }}
              >
                {busy ? "..." : "Creează"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function BusinessCard({
  business,
  campaigns,
  parties,
  onTopup,
}: {
  business: any;
  campaigns: any[];
  parties: any[];
  onTopup: (amount: number) => void;
}) {
  const qc = useQueryClient();
  const [boostOpen, setBoostOpen] = useState(false);
  const [selectedParty, setSelectedParty] = useState<string>("");
  const [budget, setBudget] = useState(20);
  const [bidBani, setBidBani] = useState(150); // 1.5 RON per impression
  const [busy, setBusy] = useState(false);

  const totalSpent = campaigns.reduce((s, c) => s + (c.spent_cents || 0), 0);
  const totalImpressions = campaigns.reduce((s, c) => s + (c.impressions || 0), 0);
  const totalClicks = campaigns.reduce((s, c) => s + (c.clicks || 0), 0);

  const createCampaign = async () => {
    if (!selectedParty) return;
    setBusy(true);
    const party = parties.find((p) => p.id === selectedParty);
    const { error } = await supabase.from("campaigns").insert({
      business_id: business.id,
      kind: "boost_feed",
      party_id: selectedParty,
      title: party?.title ?? "Boost",
      status: "active",
      bid_cents: bidBani,
      budget_cents: Math.round(budget * 100),
      ends_at: party?.expires_at ?? null,
    });
    setBusy(false);
    if (error) {
      alert(error.message);
      return;
    }
    setBoostOpen(false);
    setSelectedParty("");
    qc.invalidateQueries({ queryKey: ["biz"] });
  };

  const toggleCampaign = async (c: any) => {
    const next = c.status === "active" ? "paused" : "active";
    await supabase.from("campaigns").update({ status: next }).eq("id", c.id);
    qc.invalidateQueries({ queryKey: ["biz"] });
  };

  return (
    <div className="rounded-2xl bg-foreground/[0.03] border border-foreground/10 overflow-hidden">
      <div className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="font-display uppercase text-lg leading-tight truncate">
              {business.brand_name}
            </div>
            <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              {business.type} {business.verified && "· verificat"} · tier {business.tier}
            </div>
          </div>
          {business.verified ? (
            <span className="text-[9px] font-mono uppercase px-2 py-1 rounded-md bg-neon-green/15 text-neon-green border border-neon-green/30">
              verificat
            </span>
          ) : (
            <span className="text-[9px] font-mono uppercase px-2 py-1 rounded-md bg-foreground/10 text-muted-foreground border border-foreground/15">
              neverificat
            </span>
          )}
        </div>

        {/* Wallet */}
        <div className="rounded-xl bg-gradient-to-br from-neon-purple/10 to-neon-crimson/10 border border-foreground/10 p-3 flex items-center justify-between gap-3">
          <div>
            <div className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground flex items-center gap-1">
              <Wallet size={10} /> Wallet
            </div>
            <div className="font-display text-2xl leading-none mt-0.5">
              {ronFromCents(business.wallet_balance_cents)} <span className="text-xs text-muted-foreground">RON</span>
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            {[20, 100, 500].map((amt) => (
              <button
                key={amt}
                onClick={() => onTopup(amt)}
                className="font-mono text-[10px] uppercase tracking-widest px-3 py-1 rounded-md border border-foreground/15 hover:border-neon-crimson"
              >
                +{amt} RON
              </button>
            ))}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2">
          <Stat icon={<TrendingUp size={11} />} label="Spent" value={`${ronFromCents(totalSpent)} RON`} />
          <Stat icon={<Eye size={11} />} label="Views" value={totalImpressions.toLocaleString()} />
          <Stat icon={<MousePointerClick size={11} />} label="Clicks" value={totalClicks.toLocaleString()} />
        </div>

        {/* Boost button */}
        <button
          onClick={() => setBoostOpen(true)}
          disabled={parties.length === 0 || business.wallet_balance_cents < 100}
          className="w-full font-display uppercase text-[12px] tracking-widest px-4 py-2.5 rounded-md text-white flex items-center justify-center gap-1.5 disabled:opacity-50"
          style={{ background: "var(--gradient-chaos)" }}
        >
          <Rocket size={13} /> Boost o petrecere
        </button>
        {parties.length === 0 && (
          <div className="text-[10px] text-muted-foreground text-center">
            Creează o petrecere{" "}
            <Link to="/app/parties" className="underline">
              aici
            </Link>{" "}
            ca să o poți boost-a.
          </div>
        )}
        {parties.length > 0 && business.wallet_balance_cents < 100 && (
          <div className="text-[10px] text-muted-foreground text-center">
            Adaugă cel puțin 1 RON în wallet ca să pornești o campanie.
          </div>
        )}

        {/* Campaign list */}
        {campaigns.length > 0 && (
          <div className="space-y-1.5">
            <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              campanii
            </div>
            {campaigns.map((c) => (
              <div
                key={c.id}
                className="flex items-center justify-between gap-2 p-2.5 rounded-md bg-foreground/[0.03] border border-foreground/10"
              >
                <div className="min-w-0 flex-1">
                  <div className="text-xs truncate">{c.title}</div>
                  <div className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
                    {c.status} · {c.impressions} views · {ronFromCents(c.spent_cents)}/
                    {ronFromCents(c.budget_cents)} RON
                  </div>
                </div>
                <button
                  onClick={() => toggleCampaign(c)}
                  className={`text-[10px] font-mono uppercase tracking-widest px-2 py-1 rounded-md border ${
                    c.status === "active"
                      ? "border-neon-crimson text-neon-crimson"
                      : "border-neon-green text-neon-green"
                  }`}
                >
                  {c.status === "active" ? "Pause" : "Activează"}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {boostOpen && (
        <div className="fixed inset-0 z-50 bg-background/90 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl bg-background border border-foreground/15 p-5 space-y-4">
            <div>
              <div className="font-display uppercase text-lg">Boost o petrecere</div>
              <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                // apare în feed-ul prietenilor + descoperire
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                petrecere
              </label>
              <select
                value={selectedParty}
                onChange={(e) => setSelectedParty(e.target.value)}
                className="w-full bg-foreground/5 rounded-md px-3 py-2.5 text-sm border border-foreground/10 outline-none"
              >
                <option value="">— alege —</option>
                {parties.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title} · {p.location_text}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                buget (RON)
              </label>
              <div className="flex gap-2">
                {[10, 20, 50, 100].map((b) => (
                  <button
                    key={b}
                    onClick={() => setBudget(b)}
                    className={`flex-1 px-2 py-2 rounded-md text-xs font-mono uppercase border ${
                      budget === b
                        ? "bg-neon-crimson/15 border-neon-crimson text-neon-crimson"
                        : "border-foreground/10"
                    }`}
                  >
                    {b}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                bid pe impresie: {(bidBani / 100).toFixed(2)} RON
              </label>
              <input
                type="range"
                min={50}
                max={400}
                step={10}
                value={bidBani}
                onChange={(e) => setBidBani(Number(e.target.value))}
                className="w-full accent-neon-crimson"
              />
              <div className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
                ≈ {Math.floor((budget * 100) / bidBani)} oameni vor vedea petrecerea
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setBoostOpen(false)}
                className="flex-1 px-3 py-2.5 rounded-md border border-foreground/15 text-xs font-mono uppercase tracking-widest"
              >
                Renunță
              </button>
              <button
                disabled={busy || !selectedParty}
                onClick={createCampaign}
                className="flex-1 px-3 py-2.5 rounded-md text-white text-xs font-display uppercase tracking-widest disabled:opacity-50 flex items-center justify-center gap-1.5"
                style={{ background: "var(--gradient-chaos)" }}
              >
                <Rocket size={12} /> {busy ? "..." : "Lansează"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-md bg-foreground/[0.03] border border-foreground/10 p-2">
      <div className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground flex items-center gap-1">
        {icon} {label}
      </div>
      <div className="font-display text-sm mt-0.5">{value}</div>
    </div>
  );
}
