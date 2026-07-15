import { useEffect, useRef, useState } from "react";
import { X, Share2, Download, Loader2, Flame } from "lucide-react";
import { toPng } from "html-to-image";

const MILESTONES = [3, 7, 14, 30, 100] as const;
type Milestone = (typeof MILESTONES)[number];

function milestoneCopy(m: Milestone): { title: string; sub: string; emoji: string } {
  switch (m) {
    case 3:
      return { title: "3 săpt la rând", sub: "Te-ai prins. Continuă.", emoji: "🔥" };
    case 7:
      return { title: "7 săpt streak", sub: "Asta deja înseamnă ceva.", emoji: "🔥🔥" };
    case 14:
      return { title: "14 săpt streak", sub: "Nivel: imposibil de oprit.", emoji: "⚡" };
    case 30:
      return { title: "30 săpt streak", sub: "Un sezon întreg. Legendă.", emoji: "👑" };
    case 100:
      return { title: "100 săpt streak", sub: "Te-au adăugat în manual.", emoji: "🪐" };
  }
}

/** Returns the highest milestone reached, or null if none. */
export function streakMilestoneReached(current: number): Milestone | null {
  let hit: Milestone | null = null;
  for (const m of MILESTONES) if (current >= m) hit = m;
  return hit;
}

/** Reads/writes which milestone was last shown so we don't nag. */
const SEEN_KEY = "streak_flex_seen_v1";
export function readSeenMilestone(): number {
  try {
    return Number(localStorage.getItem(SEEN_KEY) ?? "0");
  } catch {
    return 0;
  }
}
export function writeSeenMilestone(m: number) {
  try {
    localStorage.setItem(SEEN_KEY, String(m));
  } catch { /* noop */ }
}

export function StreakFlexSheet({
  current,
  milestone,
  handle,
  onClose,
}: {
  current: number;
  milestone: Milestone;
  handle?: string | null;
  onClose: () => void;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState<null | "share" | "download">(null);
  const copy = milestoneCopy(milestone);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  const generatePng = async (): Promise<Blob | null> => {
    if (!cardRef.current) return null;
    const dataUrl = await toPng(cardRef.current, {
      pixelRatio: 2,
      cacheBust: true,
      backgroundColor: "#0a0014",
    });
    const res = await fetch(dataUrl);
    return await res.blob();
  };

  const triggerDownload = (blob: Blob) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `oxidatii-streak-${milestone}sapt.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const handleShare = async () => {
    setBusy("share");
    try {
      const blob = await generatePng();
      if (!blob) return;
      const file = new File([blob], `oxidatii-streak-${milestone}.png`, { type: "image/png" });
      const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
      if (nav.canShare && nav.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: copy.title,
          text: `${copy.emoji} ${copy.title} pe Oxidații`,
        });
      } else {
        triggerDownload(blob);
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
      const b = await generatePng();
      if (b) triggerDownload(b);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4 animate-in fade-in duration-200 overflow-y-auto">
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-10 size-10 rounded-full bg-white/10 flex items-center justify-center text-white active:scale-90 transition"
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
              "linear-gradient(170deg, #100018 0%, #2d0a1a 35%, #6b1300 70%, #ff6a00 120%)",
            boxShadow: "0 30px 80px -20px rgba(255,61,139,0.5)",
          }}
        >
          <div
            className="absolute -top-24 -right-20 w-96 h-96 rounded-full blur-3xl opacity-60"
            style={{ background: "radial-gradient(circle, #ff3d8b, transparent 70%)" }}
          />
          <div
            className="absolute -bottom-24 -left-24 w-96 h-96 rounded-full blur-3xl opacity-50"
            style={{ background: "radial-gradient(circle, #ff6a00, transparent 70%)" }}
          />

          <div className="relative h-full flex flex-col p-7">
            <div className="text-[10px] font-mono uppercase tracking-[0.3em] text-white/60">
              OXIDAȚII · STREAK FLEX
            </div>

            <div className="mt-10 flex items-center gap-3">
              <Flame
                size={48}
                className="text-[#ff7a3d] drop-shadow-[0_0_18px_#ff3d8b]"
                fill="currentColor"
              />
              <div className="text-[88px] leading-[0.85] font-black tabular-nums text-white">
                {current}
              </div>
            </div>
            <div className="mt-1 text-[12px] font-mono uppercase tracking-[0.3em] text-white/70">
              săptămâni la rând
            </div>

            <div className="mt-8 space-y-2">
              <div className="text-4xl">{copy.emoji}</div>
              <h1
                className="text-[42px] leading-[0.95] text-white"
                style={{ fontFamily: "'Instrument Serif', serif" }}
              >
                <span className="italic">{copy.title}</span>
              </h1>
              <p className="text-[14px] text-white/80 leading-snug">{copy.sub}</p>
            </div>

            {handle && (
              <div className="mt-auto pt-4 text-[11px] font-mono uppercase tracking-[0.25em] text-white/70">
                @{handle}
              </div>
            )}
            <div className="mt-1 flex items-center justify-between text-[10px] font-mono uppercase tracking-[0.25em] text-white/50">
              <span>oxidatii.life</span>
              <span>#StreakFlex</span>
            </div>
          </div>
        </div>

        <div className="w-full max-w-[380px] grid grid-cols-2 gap-2">
          <button
            onClick={handleShare}
            disabled={busy !== null}
            className="py-4 rounded-2xl flex items-center justify-center gap-2 text-[12px] font-black uppercase tracking-[0.2em] text-black bg-white active:scale-95 transition disabled:opacity-60"
          >
            {busy === "share" ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Share2 size={16} />
            )}{" "}
            Share
          </button>
          <button
            onClick={handleDownload}
            disabled={busy !== null}
            className="py-4 rounded-2xl flex items-center justify-center gap-2 text-[12px] font-black uppercase tracking-[0.2em] text-white bg-white/10 border border-white/15 active:scale-95 transition disabled:opacity-60"
          >
            {busy === "download" ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Download size={16} />
            )}{" "}
            Salvează
          </button>
        </div>
      </div>
    </div>
  );
}
