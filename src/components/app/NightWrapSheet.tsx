import { useEffect } from "react";
import { X, Share2 } from "lucide-react";

export function NightWrapSheet({ wrap, onClose }: { wrap: any; onClose: () => void }) {
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  const stats = wrap.stats ?? {};
  const photos: string[] = wrap.photo_urls ?? [];
  const dateStr = new Date(wrap.night_date).toLocaleDateString("ro-RO", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  const handleShare = async () => {
    const text = `${wrap.vibe_emoji} ${wrap.title} — ${wrap.tagline ?? ""}\n\nNoaptea mea pe Oxidații.`;
    try {
      if (navigator.share) {
        await navigator.share({ title: wrap.title, text });
      } else {
        await navigator.clipboard.writeText(text);
        alert("Copiat în clipboard ✓");
      }
    } catch {
      /* user cancelled */
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-10 size-10 rounded-full bg-white/10 backdrop-blur flex items-center justify-center text-white active:scale-90 transition-transform"
        aria-label="Close"
      >
        <X size={20} />
      </button>

      <div
        className="relative w-full max-w-[380px] aspect-[9/16] rounded-[32px] overflow-hidden border border-white/10"
        style={{
          background:
            "linear-gradient(160deg, #1a0a2e 0%, #2d0f3d 30%, #4a1538 60%, #ff3d8b 120%)",
          boxShadow: "0 30px 80px -20px rgba(199,36,255,0.5)",
        }}
      >
        {/* aurora glows */}
        <div
          className="absolute -top-20 -right-20 w-80 h-80 rounded-full opacity-50 blur-3xl pointer-events-none"
          style={{ background: "radial-gradient(circle, #ff3d8b, transparent 70%)" }}
        />
        <div
          className="absolute -bottom-20 -left-20 w-80 h-80 rounded-full opacity-50 blur-3xl pointer-events-none"
          style={{ background: "radial-gradient(circle, #00e5ff, transparent 70%)" }}
        />

        <div className="relative h-full flex flex-col p-7">
          {/* header */}
          <div className="text-[10px] font-mono uppercase tracking-[0.3em] text-white/60">
            OXIDAȚII · {dateStr}
          </div>

          {/* hero title */}
          <div className="mt-8 space-y-3">
            <div className="text-5xl">{wrap.vibe_emoji}</div>
            <h1
              className="text-[44px] leading-[0.95] text-white"
              style={{ fontFamily: "'Instrument Serif', serif" }}
            >
              <span className="italic">{wrap.title}</span>
            </h1>
            {wrap.tagline && (
              <p className="text-[15px] text-white/80 leading-snug">{wrap.tagline}</p>
            )}
          </div>

          {/* photos mosaic */}
          {photos.length > 0 && (
            <div className="mt-6 grid grid-cols-3 gap-1.5">
              {photos.slice(0, 3).map((url, i) => (
                <div
                  key={i}
                  className="aspect-square rounded-xl bg-white/10 bg-cover bg-center border border-white/10"
                  style={{ backgroundImage: `url(${url})` }}
                />
              ))}
            </div>
          )}

          {/* stats grid */}
          <div className="mt-6 grid grid-cols-2 gap-3">
            <StatBox label="Check-ins" value={stats.check_ins ?? 0} />
            <StatBox label="Faze" value={stats.photos ?? 0} />
            <StatBox label="Like-uri" value={stats.likes_received ?? 0} />
            <StatBox label="Crew" value={stats.friends_present ?? 0} />
          </div>

          {stats.peak_hour !== null && stats.peak_hour !== undefined && (
            <div className="mt-4 text-[11px] font-mono uppercase tracking-[0.2em] text-white/60">
              Vârf de noapte · {String(stats.peak_hour).padStart(2, "0")}:00
            </div>
          )}

          <div className="mt-auto pt-4">
            <button
              onClick={handleShare}
              className="w-full py-4 rounded-2xl flex items-center justify-center gap-2 text-[12px] font-black uppercase tracking-[0.2em] text-black bg-white active:scale-95 transition-transform"
            >
              <Share2 size={16} /> Trimite mai departe
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatBox({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-white/10 backdrop-blur border border-white/10 px-3 py-2.5">
      <div className="text-[22px] font-bold tabular-nums text-white leading-none">{value}</div>
      <div className="mt-1 text-[9px] font-mono uppercase tracking-[0.2em] text-white/60">
        {label}
      </div>
    </div>
  );
}
