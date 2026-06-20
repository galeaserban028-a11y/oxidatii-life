import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Trophy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SpritzIndexDial } from "@/components/app/SpritzIndexDial";

export const Route = createFileRoute("/app/spritz-index")({
  head: () => ({
    meta: [
      { title: "Spritz Index — Indicele Național al Distracției" },
      { name: "description", content: "Cât de tare e seara ta? Vezi în timp real cel mai animat oraș din România." },
      { property: "og:title", content: "Spritz Index • România, măsurată în distracție." },
      { property: "og:description", content: "Indicele live 0-100 al distracției din orașele României." },
    ],
  }),
  component: SpritzIndexPage,
  errorComponent: ({ error }) => (
    <div className="min-h-[100svh] bg-[#050510] text-white p-6">{error.message}</div>
  ),
  notFoundComponent: () => <div className="p-6 text-white">Nu există.</div>,
});

type Row = { city_id: string; city_name: string; slug: string; score: number; vibe: string; emoji: string };

function SpritzIndexPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const { data, error } = await supabase.rpc("get_spritz_index_ranking");
      if (!cancelled) {
        if (!error && data) setRows((data as Row[]).sort((a, b) => b.score - a.score));
        setLoading(false);
      }
    };
    load();
    const id = setInterval(load, 60_000);
    return () => { cancelled = true; clearInterval(id); };
  }, []);

  return (
    <main className="relative min-h-[100svh] mx-auto max-w-md flex flex-col overflow-hidden bg-[#050510] text-white pb-24">
      <div className="absolute top-[10%] right-0 w-[60vmin] h-[60vmin] rounded-full pointer-events-none blur-[100px] bg-orange-600/20" />

      <header className="relative z-10 flex items-center justify-between px-5 pt-6 pb-3">
        <Link to="/" className="p-2.5 rounded-full bg-white/5 border border-white/10 active:scale-95 transition">
          <ArrowLeft className="w-4 h-4 text-white/70" />
        </Link>
        <span className="font-mono text-[10px] font-black tracking-[0.2em] uppercase text-white/60">Live • Actualizat 1 min</span>
        <div className="w-9" />
      </header>

      <section className="relative z-10 px-4 mt-2 mb-6">
        <SpritzIndexDial />
      </section>

      <section className="relative z-10 px-4">
        <div className="flex items-center justify-between mb-3 px-2">
          <div className="flex items-center gap-2">
            <Trophy className="w-4 h-4 text-amber-400" />
            <span className="font-mono text-[10px] font-black tracking-[0.22em] uppercase">Clasament Orașe</span>
          </div>
          <span className="font-mono text-[10px] text-white/40">{rows.length} ORAȘE</span>
        </div>

        {loading ? (
          <div className="text-center text-white/40 text-sm py-12">Se încarcă...</div>
        ) : (
          <ul className="space-y-2">
            {rows.map((r, i) => (
              <li
                key={r.city_id}
                className="flex items-center gap-3 p-4 rounded-2xl border border-white/10 bg-white/[0.03]"
              >
                <span className={`font-display font-black text-2xl w-8 text-center ${
                  i === 0 ? "text-amber-400" : i === 1 ? "text-white/70" : i === 2 ? "text-orange-700" : "text-white/30"
                }`}>
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="font-bold uppercase tracking-tight truncate">{r.city_name}</div>
                  <div className="text-[11px] text-white/50">
                    {r.emoji} <span className="font-medium">{r.vibe}</span>
                  </div>
                </div>
                <div className="font-display font-black text-2xl text-orange-400">{r.score}</div>
              </li>
            ))}
          </ul>
        )}

        <p className="text-center font-mono text-[9px] text-white/30 uppercase tracking-[0.2em] mt-8 px-6">
          Singurul indice care contează vineri seara.
        </p>
      </section>
    </main>
  );
}
