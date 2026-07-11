import { useEffect, useRef, useState } from "react";
import { X, Share2, Download, Loader2 } from "lucide-react";
import { toPng } from "html-to-image";

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

export function NightWrapSheet({ wrap, onClose }: { wrap: Wrap; onClose: () => void }) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState<null | "share" | "download">(null);

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

  const generatePng = async (): Promise<Blob | null> => {
    if (!cardRef.current) return null;
    // Render at 2x for crisp IG-story export
    const dataUrl = await toPng(cardRef.current, {
      pixelRatio: 2,
      cacheBust: true,
      backgroundColor: "#0a0014",
    });
    const res = await fetch(dataUrl);
    return await res.blob();
  };

  const handleShareImage = async () => {
    setBusy("share");
    try {
      const { haptic, nativeShare, isNative } = await import("@/lib/native");
      haptic("light");
      const blob = await generatePng();
      if (!blob) return;
      const file = new File([blob], `oxidatii-night-${wrap.night_date}.png`, { type: "image/png" });
      const nav = navigator as Navigator & { canShare?: (data: ShareData) => boolean };
      if (!isNative() && nav.canShare && nav.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: wrap.title,
          text: `${wrap.vibe_emoji} ${wrap.title} — pe Oxidații`,
        });
      } else {
        // Native (iOS/Android) sau browser fără file share: descarcă + share text+URL
        triggerDownload(blob);
        await nativeShare({
          title: wrap.title,
          text: `${wrap.vibe_emoji} ${wrap.title} — pe Oxidații`,
          url: typeof window !== "undefined" ? window.location.href : undefined,
        });
      }
    } catch {
      /* user cancelled */
    } finally {
      setBusy(null);
    }
  };

  const handleDownload = async () => {
    setBusy("download");
    try {
      const blob = await generatePng();
      if (blob) triggerDownload(blob);
    } finally {
      setBusy(null);
    }
  };

  const triggerDownload = (blob: Blob) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `oxidatii-night-${wrap.night_date}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200 overflow-y-auto">
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-10 size-10 rounded-full bg-white/10 backdrop-blur flex items-center justify-center text-white active:scale-90 transition-transform"
        aria-label="Close"
      >
        <X size={20} />
      </button>

      <div className="flex flex-col items-center gap-4 my-auto">
        <div
          ref={cardRef}
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

            {/* watermark */}
            <div className="mt-auto pt-4 flex items-center justify-between text-[10px] font-mono uppercase tracking-[0.25em] text-white/50">
              <span>oxidatii.life</span>
              <span>#NightVerdict</span>
            </div>
          </div>
        </div>

        {/* actions — OUTSIDE the captured card */}
        <div className="w-full max-w-[380px] grid grid-cols-2 gap-2">
          <button
            onClick={handleShareImage}
            disabled={busy !== null}
            className="py-4 rounded-2xl flex items-center justify-center gap-2 text-[12px] font-black uppercase tracking-[0.2em] text-black bg-white active:scale-95 transition-transform disabled:opacity-60"
          >
            {busy === "share" ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Share2 size={16} />
            )}
            Share
          </button>
          <button
            onClick={handleDownload}
            disabled={busy !== null}
            className="py-4 rounded-2xl flex items-center justify-center gap-2 text-[12px] font-black uppercase tracking-[0.2em] text-white bg-white/10 border border-white/15 active:scale-95 transition-transform disabled:opacity-60"
          >
            {busy === "download" ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Download size={16} />
            )}
            Salvează
          </button>
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
