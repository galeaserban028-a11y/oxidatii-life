import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { ChevronLeft, Share2, Download } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/app/wrapped")({
  head: () => ({ meta: [{ title: "Wrapped · OXIDAȚII" }] }),
  component: WrappedPage,
});

type Wrap = {
  ok: boolean;
  month_start: string;
  proofs: number;
  nights: number;
  top_venue: { id: string; name: string; visits: number } | null;
  top_crew: Array<{ id: string; display_name: string; avatar_url: string | null }>;
  badge: string;
};

const MONTHS = [
  "Ianuarie",
  "Februarie",
  "Martie",
  "Aprilie",
  "Mai",
  "Iunie",
  "Iulie",
  "August",
  "Septembrie",
  "Octombrie",
  "Noiembrie",
  "Decembrie",
];

function WrappedPage() {
  const { user, profile } = useAuth();
  const [wrap, setWrap] = useState<Wrap | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;
    supabase
      .rpc("get_monthly_wrap", { _month_start: null as unknown as string })
      .then(({ data }) => setWrap(data as Wrap));
  }, [user]);

  const monthName = wrap ? MONTHS[new Date(wrap.month_start).getMonth()] : "";
  const year = wrap ? new Date(wrap.month_start).getFullYear() : "";

  const share = async () => {
    const text = `🍹 ${wrap?.proofs ?? 0} șprițuri, ${wrap?.nights ?? 0} nopți în ${monthName}. Badge: ${wrap?.badge}. Pe OXIDAȚII.`;
    try {
      if (navigator.share)
        await navigator.share({ title: "Wrapped OXIDAȚII", text, url: "https://oxidatii.life" });
      else {
        await navigator.clipboard.writeText(text);
        toast.success("Copiat");
      }
    } catch {}
  };

  return (
    <main className="min-h-[100svh] bg-[#050510] text-white px-5 pt-4 pb-24">
      <Link to="/app/me" className="inline-flex items-center gap-1 text-xs text-white/60 mb-4">
        <ChevronLeft size={16} /> înapoi
      </Link>

      <div className="text-center mb-4">
        <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-fuchsia-400 mb-1">
          // WRAPPED
        </div>
        <h1 className="font-display font-black text-2xl">
          {monthName} {year}
        </h1>
      </div>

      {/* Shareable card */}
      <div
        ref={cardRef}
        className="relative rounded-[2rem] overflow-hidden border border-white/10 aspect-[9/16] max-h-[70vh] mx-auto"
        style={{
          background: "linear-gradient(160deg, #1a0633 0%, #3d0a4d 40%, #6b0840 80%, #ff6b00 100%)",
        }}
      >
        {/* glows */}
        <div className="absolute -top-20 -right-20 w-60 h-60 rounded-full blur-3xl bg-pink-500/40" />
        <div className="absolute -bottom-20 -left-20 w-60 h-60 rounded-full blur-3xl bg-orange-500/30" />

        <div className="relative h-full flex flex-col p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="font-mono text-[9px] uppercase tracking-[0.3em] text-white/60">
              OXIDAȚII WRAPPED
            </div>
            <div className="font-mono text-[9px] uppercase tracking-widest text-white/60">
              {monthName} '{String(year).slice(2)}
            </div>
          </div>

          {profile?.display_name && (
            <div className="flex items-center gap-2 mb-6">
              {profile.avatar_url && (
                <img
                  src={profile.avatar_url}
                  alt=""
                  className="w-10 h-10 rounded-full border-2 border-white/30"
                />
              )}
              <span className="font-bold text-lg">{profile.display_name}</span>
            </div>
          )}

          <div className="flex-1 flex flex-col justify-center">
            <div className="font-display font-black text-7xl tabular-nums leading-none drop-shadow-[0_4px_20px_rgba(255,107,0,0.5)]">
              {wrap?.proofs ?? 0}
            </div>
            <div className="text-xs uppercase tracking-[0.3em] text-white/70 mt-2 mb-6">
              șprițuri băute
            </div>

            <div className="grid grid-cols-2 gap-3 mb-6">
              <div className="rounded-xl bg-white/10 backdrop-blur p-3">
                <div className="font-display font-black text-2xl">{wrap?.nights ?? 0}</div>
                <div className="text-[10px] uppercase tracking-widest text-white/60">nopți</div>
              </div>
              <div className="rounded-xl bg-white/10 backdrop-blur p-3">
                <div className="font-display font-black text-sm truncate">
                  {wrap?.top_venue?.name || "—"}
                </div>
                <div className="text-[10px] uppercase tracking-widest text-white/60">top venue</div>
              </div>
            </div>

            {wrap?.top_crew && wrap.top_crew.length > 0 && (
              <div className="mb-4">
                <div className="text-[10px] uppercase tracking-widest text-white/60 mb-2">
                  Crew-ul tău
                </div>
                <div className="flex -space-x-2">
                  {wrap.top_crew
                    .slice(0, 5)
                    .map((m) =>
                      m.avatar_url ? (
                        <img
                          key={m.id}
                          src={m.avatar_url}
                          alt=""
                          className="w-9 h-9 rounded-full border-2 border-[#3d0a4d]"
                        />
                      ) : (
                        <div
                          key={m.id}
                          className="w-9 h-9 rounded-full bg-white/20 border-2 border-[#3d0a4d]"
                        />
                      ),
                    )}
                </div>
              </div>
            )}

            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-amber-400 to-pink-500 text-black font-display font-black text-sm uppercase tracking-widest w-fit">
              🏆 {wrap?.badge ?? "—"}
            </div>
          </div>

          <div className="mt-4 text-center font-mono text-[9px] uppercase tracking-[0.3em] text-white/40">
            oxidatii.life
          </div>
        </div>
      </div>

      <div className="mt-5 flex gap-2 max-w-md mx-auto">
        <button
          onClick={share}
          className="flex-1 py-3 rounded-full bg-gradient-to-r from-fuchsia-500 to-orange-500 font-display font-bold uppercase tracking-widest text-sm flex items-center justify-center gap-2"
        >
          <Share2 className="w-4 h-4" /> Share
        </button>
        <button
          onClick={() => toast.info("Screenshot manual pentru moment 📸")}
          className="px-4 py-3 rounded-full bg-white/10 border border-white/20"
        >
          <Download className="w-4 h-4" />
        </button>
      </div>

      <p className="text-center text-[10px] text-white/30 font-mono mt-4 uppercase tracking-widest">
        Reset lunar · automat
      </p>
    </main>
  );
}
