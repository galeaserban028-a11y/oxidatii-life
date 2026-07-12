import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Crown } from "lucide-react";
import logoLight from "@/assets/logo-oxidatii.png.asset.json";

export const Route = createFileRoute("/hall-of-fame")({
  head: () => ({
    meta: [
      { title: "Hall of Fame — Founding Members · OXIDAȚII" },
      {
        name: "description",
        content: "Cei care au adus comunitatea OXIDAȚII la viață. Founding Members forever.",
      },
      { property: "og:title", content: "Hall of Fame — Founding Members" },
      { property: "og:description", content: "Top invitatori OXIDAȚII. Forever on the wall." },
      { property: "og:url", content: "https://oxidatii.life/hall-of-fame" },
    ],
    links: [{ rel: "canonical", href: "https://oxidatii.life/hall-of-fame" }],
  }),
  component: HallOfFame,
});

type Row = {
  display_name: string | null;
  handle: string | null;
  avatar_url: string | null;
  invites: number;
  rank: number;
};

function HallOfFame() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    supabase.rpc("get_hall_of_fame").then(({ data }) => {
      setRows((data as Row[]) ?? []);
      setLoading(false);
    });
  }, []);

  return (
    <main className="min-h-[100svh] bg-[#0a0612] text-white relative overflow-hidden">
      <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[80vmin] h-[80vmin] rounded-full blur-[140px] bg-amber-500/20 pointer-events-none" />
      <div className="relative z-10 max-w-md mx-auto px-6 py-8">
        <a href="/" className="flex items-center gap-2 mb-8">
          <img src={logoLight} alt="OXIDAȚII" className="w-9 h-9" />
          <span className="font-display font-black tracking-widest text-sm">OXIDAȚII</span>
        </a>

        <div className="text-center mb-8">
          <Crown className="w-12 h-12 mx-auto text-amber-400 mb-3 drop-shadow-[0_0_20px_rgba(251,191,36,0.6)]" />
          <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-amber-400 mb-2">
            // FOREVER
          </div>
          <h1 className="font-display font-black text-3xl mb-2">HALL OF FAME</h1>
          <p className="text-sm text-white/60">
            Cei care au construit OXIDAȚII. Foreverver pe perete.
          </p>
        </div>

        {loading ? (
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 rounded-xl bg-white/5 animate-pulse" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-center text-sm text-white/50">
            Lista e încă goală. Fii primul Founding Member.
          </div>
        ) : (
          <div className="space-y-2">
            {rows.map((r) => (
              <div
                key={r.handle ?? r.display_name ?? r.rank}
                className={`flex items-center gap-3 p-3 rounded-xl border ${
                  r.rank === 1
                    ? "border-amber-400/60 bg-gradient-to-r from-amber-500/20 to-transparent"
                    : r.rank === 2
                      ? "border-slate-300/40 bg-gradient-to-r from-slate-400/15 to-transparent"
                      : r.rank === 3
                        ? "border-orange-700/50 bg-gradient-to-r from-orange-700/15 to-transparent"
                        : "border-white/10 bg-white/5"
                }`}
              >
                <div className="w-8 text-center font-display font-black text-lg">{r.rank}</div>
                {r.avatar_url ? (
                  <img src={r.avatar_url} alt="" className="w-10 h-10 rounded-full" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-white/10" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="font-bold truncate">{r.display_name || "Anonymous"}</div>
                  {r.handle && <div className="text-xs text-white/50 truncate">@{r.handle}</div>}
                </div>
                <div className="text-right">
                  <div className="font-mono font-bold text-amber-400">{r.invites}</div>
                  <div className="text-[10px] text-white/40 uppercase tracking-widest">
                    invitați
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-8 rounded-2xl border border-amber-400/30 bg-amber-500/5 p-5 text-center">
          <p className="text-sm text-white/80 mb-3">Vrei pe perete?</p>
          <p className="text-xs text-white/50 mb-4">
            Invită 10 prieteni cu codul tău și apari aici pentru totdeauna.
          </p>
          <a
            href="/app/invite"
            className="inline-block px-6 py-3 rounded-full bg-amber-500 text-black font-display font-bold uppercase tracking-widest text-sm"
          >
            Vezi codul meu
          </a>
        </div>
      </div>
    </main>
  );
}
