import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Users, Flame, PartyPopper, Building2, Megaphone, MapPin, Wallet, Eye, Flag } from "lucide-react";

export const Route = createFileRoute("/app/admin/")({
  component: AdminDashboard,
});

function AdminDashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const nowIso = new Date().toISOString();
      const dayAgo = new Date(Date.now() - 86400000).toISOString();
      const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();
      const head = { count: "exact" as const, head: true };

      const [
        users, newUsers7d, parties, activeParties, proofs, proofs24h,
        businesses, verifiedBiz, campaigns, activeCamps, venues, cities,
        walletSum, reports, openReports,
      ] = await Promise.all([
        supabase.from("profiles").select("*", head),
        supabase.from("profiles").select("*", head).gte("created_at", weekAgo),
        supabase.from("parties").select("*", head),
        supabase.from("parties").select("*", head).gt("expires_at", nowIso),
        supabase.from("sprit_proofs").select("*", head),
        supabase.from("sprit_proofs").select("*", head).gte("created_at", dayAgo),
        supabase.from("business_accounts").select("*", head),
        supabase.from("business_accounts").select("*", head).eq("verified", true),
        supabase.from("campaigns").select("*", head),
        supabase.from("campaigns").select("*", head).eq("status", "active"),
        supabase.from("venues").select("*", head),
        supabase.from("cities").select("*", head),
        supabase.from("business_accounts").select("wallet_balance_cents"),
        supabase.from("reports").select("*", head),
        supabase.from("reports").select("*", head).eq("status", "pending"),
      ]);

      const totalWallet = (walletSum.data ?? []).reduce(
        (a: number, b: { wallet_balance_cents: number | null }) => a + (b.wallet_balance_cents ?? 0),
        0
      );

      return {
        users: users.count ?? 0,
        newUsers7d: newUsers7d.count ?? 0,
        parties: parties.count ?? 0,
        activeParties: activeParties.count ?? 0,
        proofs: proofs.count ?? 0,
        proofs24h: proofs24h.count ?? 0,
        businesses: businesses.count ?? 0,
        verifiedBiz: verifiedBiz.count ?? 0,
        campaigns: campaigns.count ?? 0,
        activeCamps: activeCamps.count ?? 0,
        venues: venues.count ?? 0,
        cities: cities.count ?? 0,
        totalWallet,
        reports: reports.count ?? 0,
        openReports: openReports.count ?? 0,
      };
    },
  });

  if (isLoading || !data) return <div className="p-4 text-sm text-muted-foreground">Se încarcă…</div>;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <Stat icon={<Users size={14} />} label="Useri" value={data.users} sub={`+${data.newUsers7d} / 7z`} />
        <Stat icon={<PartyPopper size={14} />} label="Petreceri" value={data.parties} sub={`${data.activeParties} active`} accent="#ff3d8b" />
        <Stat icon={<Flame size={14} />} label="Sprits" value={data.proofs} sub={`+${data.proofs24h} / 24h`} accent="#ff3d8b" />
        <Stat icon={<Building2 size={14} />} label="Businesses" value={data.businesses} sub={`${data.verifiedBiz} verificate`} accent="#00e5ff" />
        <Stat icon={<Megaphone size={14} />} label="Campanii" value={data.campaigns} sub={`${data.activeCamps} active`} accent="#c724ff" />
        <Stat icon={<MapPin size={14} />} label="Locații" value={data.venues} sub={`${data.cities} orașe`} />
        <Stat icon={<Wallet size={14} />} label="Wallet total" value={`${(data.totalWallet / 100).toFixed(0)} RON`} sub="în business-uri" accent="#00e5ff" />
        <Stat icon={<Flag size={14} />} label="Rapoarte" value={data.reports} sub={`${data.openReports} deschise`} accent={data.openReports > 0 ? "#ff3d8b" : undefined} />
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
