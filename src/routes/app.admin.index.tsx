import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Users, Flame, PartyPopper, Building2, Megaphone, MapPin, Wallet, Eye } from "lucide-react";

export const Route = createFileRoute("/app/admin/")({
  component: AdminDashboard,
});

async function count(table: string, filter?: (q: any) => any) {
  let q = supabase.from(table).select("*", { count: "exact", head: true });
  if (filter) q = filter(q);
  const { count } = await q;
  return count ?? 0;
}

function AdminDashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const nowIso = new Date().toISOString();
      const dayAgo = new Date(Date.now() - 86400000).toISOString();
      const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();

      const [users, newUsers7d, parties, activeParties, proofs, proofs24h,
        businesses, verifiedBiz, campaigns, activeCamps, venues, cities,
        walletSum, reports, openReports] = await Promise.all([
        count("profiles"),
        count("profiles", (q) => q.gte("created_at", weekAgo)),
        count("parties"),
        count("parties", (q) => q.gt("expires_at", nowIso)),
        count("sprit_proofs"),
        count("sprit_proofs", (q) => q.gte("created_at", dayAgo)),
        count("business_accounts"),
        count("business_accounts", (q) => q.eq("verified", true)),
        count("campaigns"),
        count("campaigns", (q) => q.eq("status", "active")),
        count("venues"),
        count("cities"),
        supabase.from("business_accounts").select("wallet_balance_cents"),
        count("reports"),
        count("reports", (q) => q.eq("status", "pending")),
      ]);

      const totalWallet = (walletSum.data ?? []).reduce(
        (a: number, b: any) => a + (b.wallet_balance_cents ?? 0),
        0
      );

      return {
        users, newUsers7d, parties, activeParties, proofs, proofs24h,
        businesses, verifiedBiz, campaigns, activeCamps, venues, cities,
        totalWallet, reports, openReports,
      };
    },
  });

  if (isLoading || !data) return <div className="p-4 text-sm text-muted-foreground">Se încarcă…</div>;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <Stat icon={<Users size={14} />} label="Useri" value={data.users} sub={`+${data.newUsers7d} / 7z`} />
        <Stat icon={<PartyPopper size={14} />} label="Petreceri" value={data.parties} sub={`${data.activeParties} active`} accent="#FF2D55" />
        <Stat icon={<Flame size={14} />} label="Sprits" value={data.proofs} sub={`+${data.proofs24h} / 24h`} accent="#FF8A00" />
        <Stat icon={<Building2 size={14} />} label="Businesses" value={data.businesses} sub={`${data.verifiedBiz} verificate`} accent="#00C2FF" />
        <Stat icon={<Megaphone size={14} />} label="Campanii" value={data.campaigns} sub={`${data.activeCamps} active`} accent="#C66BFF" />
        <Stat icon={<MapPin size={14} />} label="Locații" value={data.venues} sub={`${data.cities} orașe`} />
        <Stat icon={<Wallet size={14} />} label="Wallet total" value={`${(data.totalWallet / 100).toFixed(0)} RON`} sub="în business-uri" accent="#00FF95" />
        <Stat icon={<Flag size={14} />} label="Rapoarte" value={data.reports} sub={`${data.openReports} deschise`} accent={data.openReports > 0 ? "#FF2D55" : undefined} />
      </div>

      <div className="rounded-2xl border border-foreground/10 p-4 space-y-2">
        <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground flex items-center gap-1">
          <Eye size={11} /> Acțiuni rapide
        </div>
        <p className="text-sm text-foreground/80">
          Folosește tab-urile de mai sus ca să moderezi useri, conținut, businesses, campanii, locații și să rezolvi rapoartele primite.
        </p>
      </div>
    </div>
  );
}

function Stat({ icon, label, value, sub, accent }: { icon: React.ReactNode; label: string; value: number | string; sub?: string; accent?: string }) {
  return (
    <div className="rounded-xl border border-foreground/10 bg-foreground/[0.03] p-3 space-y-1.5">
      <div className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground flex items-center gap-1">
        <span style={{ color: accent }}>{icon}</span> {label}
      </div>
      <div className="font-display text-2xl leading-none" style={{ color: accent }}>{value}</div>
      {sub && <div className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground/80">{sub}</div>}
    </div>
  );
}

// re-export Flag icon (since used in stats)
import { Flag } from "lucide-react";
