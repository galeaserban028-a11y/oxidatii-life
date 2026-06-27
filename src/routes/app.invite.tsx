import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Crown, Copy, Share2, ChevronLeft, Sparkles } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/app/invite")({
  head: () => ({ meta: [{ title: "Invită prieteni · OXIDAȚII" }] }),
  component: InvitePage,
});

type Stats = {
  ok: boolean;
  code: string;
  count: number;
  founding_unlocked: boolean;
  hall_of_fame: boolean;
  rank: number | null;
  next_milestone: number | null;
};

function InvitePage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase.rpc("get_my_referral_stats").then(({ data }) => setStats(data as Stats));
  }, [user]);

  const link = stats?.code ? `https://oxidatii.life/?ref=${stats.code}` : "";
  const message = `Hai pe OXIDAȚII cu mine 🍹. Cod: ${stats?.code} sau ${link}`;

  const copy = async () => {
    await navigator.clipboard.writeText(link);
    toast.success("Link copiat");
  };
  const share = async () => {
    try {
      if (navigator.share) await navigator.share({ title: "OXIDAȚII", text: message, url: link });
      else { await navigator.clipboard.writeText(message); toast.success("Mesaj copiat"); }
    } catch {}
  };

  const progress = stats ? Math.min((stats.count / (stats.next_milestone || 10)) * 100, 100) : 0;

  return (
    <main className="min-h-[100svh] bg-[#050510] text-white px-5 pt-4 pb-24">
      <Link to="/app/me" className="inline-flex items-center gap-1 text-xs text-white/60 mb-4">
        <ChevronLeft size={16} /> înapoi
      </Link>

      <div className="text-center mb-6">
        <Crown className={`w-12 h-12 mx-auto mb-2 ${stats?.founding_unlocked ? "text-amber-400 drop-shadow-[0_0_20px_rgba(251,191,36,0.7)]" : "text-white/30"}`} />
        <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-amber-400 mb-1">// FOUNDING MEMBER</div>
        <h1 className="font-display font-black text-2xl">Invită & primește ramă exclusivă</h1>
      </div>

      {/* Code card */}
      <div className="rounded-3xl border border-amber-400/30 bg-gradient-to-br from-amber-500/15 via-fuchsia-500/5 to-transparent p-6 mb-4">
        <div className="text-xs uppercase tracking-widest text-white/50 mb-2">Codul tău</div>
        <div className="flex items-center justify-between gap-3">
          <div className="font-display font-black text-4xl tracking-widest tabular-nums">{stats?.code || "—"}</div>
          <button onClick={copy} className="p-3 rounded-full bg-white/10 border border-white/20">
            <Copy className="w-4 h-4" />
          </button>
        </div>
        <button onClick={share} className="mt-4 w-full py-3 rounded-full bg-gradient-to-r from-amber-500 to-pink-500 text-black font-display font-bold uppercase tracking-widest text-sm flex items-center justify-center gap-2">
          <Share2 className="w-4 h-4" /> Trimite invitație
        </button>
      </div>

      {/* Progress */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-5 mb-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs uppercase tracking-widest text-white/60">Progres</span>
          <span className="font-mono text-sm">{stats?.count ?? 0} / {stats?.next_milestone ?? "∞"}</span>
        </div>
        <div className="h-2 rounded-full bg-white/10 overflow-hidden">
          <div className="h-full bg-gradient-to-r from-amber-400 to-pink-500 transition-all" style={{ width: `${progress}%` }} />
        </div>

        <div className="mt-5 space-y-3">
          <Milestone done={!!stats && stats.count >= 1} title="Primul invitat" subtitle="+25 șprițuri / invitație" />
          <Milestone done={!!stats?.founding_unlocked} title="3 invitați → Ramă Founding Member" subtitle="Exclusivă. Nu se mai poate cumpăra niciodată." icon={<Sparkles className="w-4 h-4" />} />
          <Milestone done={!!stats?.hall_of_fame} title="10 invitați → Hall of Fame" subtitle="Numele tău public pe oxidatii.life/hall-of-fame, forever." />
        </div>

        {stats?.rank && (
          <div className="mt-4 pt-4 border-t border-white/10 text-center text-sm">
            Ești pe locul <span className="font-display font-black text-amber-400">#{stats.rank}</span> în clasamentul de invitatori
          </div>
        )}
      </div>

      {/* How it works */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-5 text-sm text-white/70 space-y-2">
        <p className="font-bold text-white mb-2">Cum merge:</p>
        <p>1. Trimiți codul/linkul prietenilor.</p>
        <p>2. Ei se înscriu și pun codul tău în onboarding.</p>
        <p>3. Tu primești <b>25 șprițuri</b>, ei primesc <b>50</b>.</p>
        <p>4. La 3 invitați primești rama <b>Founding Member</b> permanent.</p>
        <p>5. La 10 invitați intri pe wall-ul public Hall of Fame.</p>
      </div>

      <a href="/hall-of-fame" target="_blank" className="mt-4 block text-center text-xs text-amber-400 underline">
        Vezi Hall of Fame →
      </a>
    </main>
  );
}

function Milestone({ done, title, subtitle, icon }: { done: boolean; title: string; subtitle: string; icon?: React.ReactNode }) {
  return (
    <div className={`flex items-start gap-3 p-3 rounded-xl border ${done ? "border-amber-400/40 bg-amber-500/5" : "border-white/10 bg-transparent opacity-60"}`}>
      <div className={`mt-0.5 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${done ? "bg-amber-400 text-black" : "bg-white/10 text-white/50"}`}>
        {done ? "✓" : icon ?? "•"}
      </div>
      <div>
        <div className="text-sm font-bold">{title}</div>
        <div className="text-xs text-white/60">{subtitle}</div>
      </div>
    </div>
  );
}
