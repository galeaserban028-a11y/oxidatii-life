import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Users, Flame, PartyPopper, Building2, Megaphone, MapPin, Wallet, Flag,
  ChevronRight, Activity, AlertTriangle,
} from "lucide-react";

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
        users: users.count ?? 0, newUsers7d: newUsers7d.count ?? 0,
        parties: parties.count ?? 0, activeParties: activeParties.count ?? 0,
        proofs: proofs.count ?? 0, proofs24h: proofs24h.count ?? 0,
        businesses: businesses.count ?? 0, verifiedBiz: verifiedBiz.count ?? 0,
        campaigns: campaigns.count ?? 0, activeCamps: activeCamps.count ?? 0,
        venues: venues.count ?? 0, cities: cities.count ?? 0,
        totalWallet, reports: reports.count ?? 0, openReports: openReports.count ?? 0,
      };
    },
  });

  if (isLoading || !data) return <div className="p-4 text-sm text-muted-foreground">Se încarcă…</div>;

  return (
    <div className="space-y-5">
      {/* Alert: open reports */}
      {data.openReports > 0 && (
        <Link
          to="/app/admin/reports"
          className="flex items-center gap-3 rounded-2xl border border-neon-crimson/40 bg-neon-crimson/10 p-3 hover:bg-neon-crimson/15 transition"
        >
          <AlertTriangle className="text-neon-crimson shrink-0" size={18} />
          <div className="min-w-0 flex-1">
            <div className="font-display text-sm">{data.openReports} rapoarte deschise</div>
            <div className="text-[11px] text-muted-foreground">Verifică și rezolvă cererile primite</div>
          </div>
          <ChevronRight size={16} className="text-neon-crimson" />
        </Link>
      )}

      {/* Pulse stats — high level */}
      <Section title="Pulsul aplicației" icon={<Activity size={11} />}>
        <div className="grid grid-cols-2 gap-2">
          <Stat icon={<Users size={14} />} label="Useri" value={data.users} sub={`+${data.newUsers7d} / 7z`} />
          <Stat icon={<PartyPopper size={14} />} label="Petreceri" value={data.parties} sub={`${data.activeParties} active`} accent="#ff3d8b" />
          <Stat icon={<Flame size={14} />} label="Sprits" value={data.proofs} sub={`+${data.proofs24h} / 24h`} accent="#ff3d8b" />
          <Stat icon={<Wallet size={14} />} label="Wallet total" value={`${(data.totalWallet / 100).toFixed(0)} RON`} sub="în business-uri" accent="#00e5ff" />
        </div>
      </Section>

      {/* Navigation map */}
      <Section title="Module admin" icon={<LayoutIcon />}>
        <div className="grid grid-cols-1 gap-2">
          <NavCard
            to="/app/admin/users" icon={<Users size={16} />} accent="#00e5ff"
            title="Useri" desc="Acordă coins, schimbă rang, dă admin / mod"
            stat={`${data.users} total`} highlight={`+${data.newUsers7d} noi`}
          />
          <NavCard
            to="/app/admin/content" icon={<Flame size={16} />} accent="#ff3d8b"
            title="Conținut" desc="Faze, sprits, comentarii — moderare"
            stat={`${data.proofs} sprits`} highlight={`+${data.proofs24h} azi`}
          />
          <NavCard
            to="/app/admin/businesses" icon={<Building2 size={16} />} accent="#00e5ff"
            title="Businesses" desc="Conturi business, verificare, tier"
            stat={`${data.businesses} total`} highlight={`${data.verifiedBiz} verificate`}
          />
          <NavCard
            to="/app/admin/campaigns" icon={<Megaphone size={16} />} accent="#c724ff"
            title="Campanii" desc="Promo, boost-uri, evenimente speciale"
            stat={`${data.campaigns} total`} highlight={`${data.activeCamps} active`}
          />
          <NavCard
            to="/app/admin/places" icon={<MapPin size={16} />} accent="#ffd166"
            title="Locații" desc="Adaugă orașe și venues"
            stat={`${data.venues} venues`} highlight={`${data.cities} orașe`}
          />
          <NavCard
            to="/app/admin/reports" icon={<Flag size={16} />} accent={data.openReports > 0 ? "#ff3d8b" : "#888"}
            title="Rapoarte" desc="Cereri de la utilizatori"
            stat={`${data.reports} total`} highlight={data.openReports > 0 ? `${data.openReports} deschise` : "0 deschise"}
            urgent={data.openReports > 0}
          />
        </div>
      </Section>
    </div>
  );
}

function LayoutIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="2" y="2" width="5" height="5" rx="1" /><rect x="9" y="2" width="5" height="5" rx="1" />
      <rect x="2" y="9" width="5" height="5" rx="1" /><rect x="9" y="9" width="5" height="5" rx="1" />
    </svg>
  );
}

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground flex items-center gap-1.5 px-1">
        {icon} {title}
      </div>
      {children}
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

function NavCard({
  to, icon, accent, title, desc, stat, highlight, urgent,
}: {
  to: string; icon: React.ReactNode; accent: string;
  title: string; desc: string; stat: string; highlight: string; urgent?: boolean;
}) {
  return (
    <Link
      to={to}
      className="group flex items-center gap-3 rounded-2xl border border-foreground/10 bg-foreground/[0.03] hover:bg-foreground/[0.07] hover:border-foreground/20 transition p-3"
    >
      <div
        className="flex items-center justify-center w-10 h-10 rounded-xl shrink-0"
        style={{ background: `${accent}1f`, color: accent, boxShadow: `inset 0 0 0 1px ${accent}33` }}
      >
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="font-display text-sm">{title}</span>
          <span
            className={`font-mono text-[9px] uppercase tracking-widest px-1.5 py-0.5 rounded ${urgent ? "bg-neon-crimson text-white" : "bg-foreground/10 text-muted-foreground"}`}
          >
            {highlight}
          </span>
        </div>
        <div className="text-[11px] text-muted-foreground truncate">{desc}</div>
        <div className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground/60 mt-0.5">{stat}</div>
      </div>
      <ChevronRight size={16} className="text-muted-foreground group-hover:text-foreground transition shrink-0" />
    </Link>
  );
}
