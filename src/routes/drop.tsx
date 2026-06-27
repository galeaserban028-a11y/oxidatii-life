import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Flame, Trophy, Users, Share2 } from "lucide-react";
import logoLight from "@/assets/logo-oxidatii-light.png";

export const Route = createFileRoute("/drop")({
  head: () => ({
    meta: [
      { title: "Spritz Drop — Săptămâna asta în România · OXIDAȚII" },
      {
        name: "description",
        content:
          "Câte șprițuri s-au băut în România săptămâna asta. Top orașe fierbinți și faza săptămânii. Live, actualizat în timp real.",
      },
      { property: "og:title", content: "Spritz Drop — Live în România" },
      {
        property: "og:description",
        content: "Vezi orașul cel mai fierbinte și faza săptămânii. Live pe oxidatii.life",
      },
      { property: "og:url", content: "https://oxidatii.life/drop" },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "canonical", href: "https://oxidatii.life/drop" }],
  }),
  component: DropPage,
});

type DropStats = {
  total_spritz: number;
  active_users: number;
  top_cities: Array<{ city: string; count: number }>;
  top_proof: { id: string; image_url: string; caption: string | null; likes_count: number; display_name: string | null; handle: string | null; avatar_url: string | null } | null;
  week_start: string;
};

function DropPage() {
  const [stats, setStats] = useState<DropStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const { data } = await supabase.rpc("get_drop_stats");
      if (mounted && data) setStats(data as DropStats);
      setLoading(false);
    };
    load();
    const t = setInterval(load, 30000);
    return () => { mounted = false; clearInterval(t); };
  }, []);

  const share = async () => {
    const text = `🍹 ${stats?.total_spritz ?? 0} șprițuri băute săptămâna asta în România. Care e orașul tău? oxidatii.life/drop`;
    try {
      if (navigator.share) await navigator.share({ title: "Spritz Drop", text, url: "https://oxidatii.life/drop" });
      else { await navigator.clipboard.writeText(text); }
    } catch {}
  };

  const medals = ["🥇", "🥈", "🥉"];

  return (
    <main className="min-h-[100svh] bg-[#050510] text-white relative overflow-hidden">
      <div className="absolute -top-20 -right-20 w-[60vmin] h-[60vmin] rounded-full blur-[120px] bg-orange-600/30 pointer-events-none" />
      <div className="absolute bottom-0 -left-20 w-[50vmin] h-[50vmin] rounded-full blur-[120px] bg-pink-600/20 pointer-events-none" />

      <div className="relative z-10 max-w-md mx-auto px-6 py-8">
        <header className="flex items-center justify-between mb-8">
          <a href="/" className="flex items-center gap-2">
            <img src={logoLight} alt="OXIDAȚII" className="w-9 h-9" />
            <span className="font-display font-black tracking-widest text-sm">OXIDAȚII</span>
          </a>
          <button onClick={share} className="p-2 rounded-full bg-white/5 border border-white/10">
            <Share2 className="w-4 h-4" />
          </button>
        </header>

        <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.3em] text-orange-400">
          // LIVE · săptămâna asta
        </div>
        <h1 className="font-display font-black text-4xl leading-tight mb-1">SPRITZ DROP</h1>
        <p className="text-sm text-white/60 mb-8">Cât bea România chiar acum.</p>

        {loading ? (
          <div className="h-40 rounded-2xl bg-white/5 animate-pulse" />
        ) : (
          <>
            {/* Big counter */}
            <div className="rounded-3xl border border-orange-500/30 bg-gradient-to-br from-orange-600/20 via-pink-600/10 to-transparent p-6 mb-4">
              <div className="flex items-center gap-2 text-xs text-orange-300 uppercase tracking-widest font-mono mb-2">
                <Flame className="w-3 h-3" /> Total șprițuri
              </div>
              <div className="font-display font-black text-6xl tabular-nums leading-none">
                {(stats?.total_spritz ?? 0).toLocaleString("ro-RO")}
              </div>
              <div className="mt-3 flex items-center gap-2 text-xs text-white/60">
                <Users className="w-3 h-3" /> {stats?.active_users ?? 0} oameni activi
              </div>
            </div>

            {/* Top cities */}
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5 mb-4">
              <div className="flex items-center gap-2 text-xs text-pink-300 uppercase tracking-widest font-mono mb-4">
                <Trophy className="w-3 h-3" /> Top orașe
              </div>
              {stats?.top_cities?.length ? (
                <div className="space-y-3">
                  {stats.top_cities.map((c, i) => (
                    <div key={c.city} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{medals[i]}</span>
                        <span className="font-bold text-lg">{c.city}</span>
                      </div>
                      <span className="font-mono text-sm text-white/70">{c.count}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-white/40">Încă nimeni n-a băut săptămâna asta. Fii primul.</p>
              )}
            </div>

            {/* Top proof */}
            {stats?.top_proof && (
              <div className="rounded-2xl overflow-hidden border border-white/10 bg-white/5 mb-4">
                <div className="px-5 pt-4 pb-3 flex items-center gap-2 text-xs text-fuchsia-300 uppercase tracking-widest font-mono">
                  ⚡ Faza săptămânii
                </div>
                <img src={stats.top_proof.image_url} alt="" className="w-full aspect-square object-cover" />
                <div className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    {stats.top_proof.avatar_url && (
                      <img src={stats.top_proof.avatar_url} alt="" className="w-8 h-8 rounded-full" />
                    )}
                    <span className="font-bold text-sm">
                      {stats.top_proof.display_name || "@" + stats.top_proof.handle}
                    </span>
                    <span className="ml-auto text-xs text-white/50">❤ {stats.top_proof.likes_count ?? 0}</span>
                  </div>
                  {stats.top_proof.caption && <p className="text-sm text-white/70">{stats.top_proof.caption}</p>}
                </div>
              </div>
            )}

            {/* CTA */}
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5 text-center mt-6">
              <p className="text-sm text-white/70 mb-3">Vrei să fii pe lista săptămâna viitoare?</p>
              <a href="/signup" className="inline-block px-6 py-3 rounded-full bg-gradient-to-r from-orange-500 to-pink-600 font-display font-bold uppercase tracking-widest text-sm">
                Intră în haos →
              </a>
            </div>

            <p className="text-center text-[10px] text-white/30 font-mono mt-6 uppercase tracking-widest">
              Updated la fiecare 30s · Doar +18
            </p>
          </>
        )}
      </div>
    </main>
  );
}
