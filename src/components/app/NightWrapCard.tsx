import { useEffect, useState } from "react";
import { Sparkles, ChevronRight } from "lucide-react";
import { NightWrapSheet } from "./NightWrapSheet";

type Wrap = {
  night_date: string;
  title: string;
  tagline?: string | null;
  vibe_emoji: string;
  photo_urls?: string[] | null;
  stats?: {
    check_ins?: number;
    photos?: number;
    likes_received?: number;
    friends_present?: number;
    peak_hour?: number | null;
  } | null;
};

export function NightWrapCard({ wrap }: { wrap: Wrap }) {
  const [open, setOpen] = useState(false);
  const stats = wrap.stats ?? {};
  const previewPhoto = wrap.photo_urls?.[0];

  // Auto-open the share sheet once per night (viral loop trigger).
  useEffect(() => {
    if (!wrap?.night_date) return;
    const key = `wrap_autoopened_${wrap.night_date}`;
    try {
      if (!localStorage.getItem(key)) {
        const t = setTimeout(() => {
          setOpen(true);
          localStorage.setItem(key, "1");
        }, 900);
        return () => clearTimeout(t);
      }
    } catch {
      /* storage blocked */
    }
  }, [wrap?.night_date]);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="relative w-full overflow-hidden rounded-3xl border border-white/10 text-left active:scale-[0.99] transition-transform"
        style={{
          background:
            "linear-gradient(135deg, rgba(255,107,53,0.25), rgba(232,67,147,0.2) 40%, rgba(108,92,231,0.3) 100%), #0a0a0a",
          boxShadow: "0 20px 60px -20px rgba(232,67,147,0.4)",
        }}
      >
        {/* subtle pattern */}
        <div
          className="absolute inset-0 opacity-30 pointer-events-none"
          style={{
            background:
              "radial-gradient(circle at 20% 20%, rgba(255,107,53,0.4), transparent 50%), radial-gradient(circle at 80% 80%, rgba(108,92,231,0.4), transparent 50%)",
          }}
        />

        {previewPhoto && (
          <div
            className="absolute right-0 top-0 bottom-0 w-1/3 opacity-40 pointer-events-none"
            style={{
              backgroundImage: `url(${previewPhoto})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
              maskImage: "linear-gradient(to left, black 0%, transparent 100%)",
              WebkitMaskImage: "linear-gradient(to left, black 0%, transparent 100%)",
            }}
          />
        )}

        <div className="relative p-5 space-y-3">
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.25em] text-white/70">
            <Sparkles size={12} className="text-[#ffea00]" />
            <span>Noaptea ta de aseară</span>
            <span className="ml-auto text-white/40">{wrap.vibe_emoji}</span>
          </div>

          <h2
            className="text-[28px] leading-[1] text-white"
            style={{ fontFamily: "'Instrument Serif', serif" }}
          >
            <span className="italic">{wrap.title}</span>
          </h2>

          {wrap.tagline && (
            <p className="text-[13px] text-white/70 leading-snug max-w-[80%]">{wrap.tagline}</p>
          )}

          <div className="flex items-center gap-4 pt-2 text-[10px] font-mono uppercase tracking-widest text-white/60">
            {(stats.check_ins ?? 0) > 0 && <span>{stats.check_ins} locuri</span>}
            {(stats.photos ?? 0) > 0 && <span>{stats.photos} faze</span>}
            {(stats.likes_received ?? 0) > 0 && <span>{stats.likes_received} ❤</span>}
          </div>

          <div className="flex items-center gap-1 pt-1 text-[11px] font-bold uppercase tracking-wider text-white/90">
            Vezi wrap-ul
            <ChevronRight size={14} />
          </div>
        </div>
      </button>

      {open && <NightWrapSheet wrap={wrap} onClose={() => setOpen(false)} />}
    </>
  );
}
