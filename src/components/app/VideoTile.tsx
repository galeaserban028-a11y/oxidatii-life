import { useEffect, useRef, useState } from "react";

type Props = {
  src: string;
  className?: string;
  onTapZone?: () => void;
};

/**
 * Autoplaying muted looping video tile with custom scrub bar.
 */
export default function VideoTile({ src, className }: Props) {
  const ref = useRef<HTMLVideoElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const [muted, setMuted] = useState(true);
  const [visible, setVisible] = useState(false);
  const [progress, setProgress] = useState(0); // 0..1
  const [duration, setDuration] = useState(0);
  const [current, setCurrent] = useState(0);
  const [scrubbing, setScrubbing] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) setVisible(e.isIntersecting && e.intersectionRatio > 0.4);
      },
      { threshold: [0, 0.4, 0.8] },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (visible) {
      el.play().catch(() => {});
    } else {
      el.pause();
      if (!muted) {
        el.muted = true;
        setMuted(true);
      }
    }
  }, [visible, muted]);

  useEffect(() => {
    const onUnmute = (e: Event) => {
      const target = (e as CustomEvent).detail as HTMLVideoElement | null;
      if (target !== ref.current && ref.current && !ref.current.muted) {
        ref.current.muted = true;
        setMuted(true);
      }
    };
    window.addEventListener("oxy:video-unmute", onUnmute as EventListener);
    return () => window.removeEventListener("oxy:video-unmute", onUnmute as EventListener);
  }, []);

  // Track time
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onTime = () => {
      if (scrubbing) return;
      setCurrent(el.currentTime);
      if (el.duration > 0) setProgress(el.currentTime / el.duration);
    };
    const onMeta = () => setDuration(el.duration || 0);
    el.addEventListener("timeupdate", onTime);
    el.addEventListener("loadedmetadata", onMeta);
    el.addEventListener("durationchange", onMeta);
    return () => {
      el.removeEventListener("timeupdate", onTime);
      el.removeEventListener("loadedmetadata", onMeta);
      el.removeEventListener("durationchange", onMeta);
    };
  }, [scrubbing]);

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    const el = ref.current;
    if (!el) return;
    const next = !el.muted;
    el.muted = next;
    setMuted(next);
    if (!next) {
      el.play().catch(() => {});
      window.dispatchEvent(new CustomEvent("oxy:video-unmute", { detail: el }));
    }
  };

  const seekFromClientX = (clientX: number) => {
    const bar = barRef.current;
    const el = ref.current;
    if (!bar || !el || !el.duration) return;
    const rect = bar.getBoundingClientRect();
    const p = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    setProgress(p);
    setCurrent(p * el.duration);
    el.currentTime = p * el.duration;
  };

  const onPointerDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setScrubbing(true);
    seekFromClientX(e.clientX);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!scrubbing) return;
    e.stopPropagation();
    seekFromClientX(e.clientX);
  };
  const onPointerUp = (e: React.PointerEvent) => {
    if (!scrubbing) return;
    e.stopPropagation();
    setScrubbing(false);
  };

  const fmt = (s: number) => {
    if (!isFinite(s) || s < 0) s = 0;
    const m = Math.floor(s / 60);
    const r = Math.floor(s % 60);
    return `${m}:${r.toString().padStart(2, "0")}`;
  };

  return (
    <div className={`relative w-full h-full ${className ?? ""}`}>
      <video
        ref={ref}
        src={src}
        className="w-full h-full object-cover"
        playsInline
        muted
        loop
        preload="metadata"
        onClick={toggleMute}
      />

      {/* Mute button */}
      <button
        type="button"
        onClick={toggleMute}
        aria-label={muted ? "Activează sunetul" : "Oprește sunetul"}
        className="absolute bottom-7 left-3 size-9 rounded-full backdrop-blur-xl bg-black/50 border border-white/15 grid place-items-center text-white active:scale-90 transition pointer-events-auto"
      >
        {muted ? (
          <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>
        ) : (
          <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>
        )}
      </button>

      {/* Time pill while scrubbing */}
      {scrubbing && duration > 0 && (
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 px-2.5 py-1 rounded-full text-[11px] font-medium text-white bg-black/70 backdrop-blur-xl border border-white/15 tabular-nums">
          {fmt(current)} / {fmt(duration)}
        </div>
      )}

      {/* Custom scrub bar */}
      <div
        ref={barRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onClick={(e) => e.stopPropagation()}
        className="absolute left-0 right-0 bottom-0 px-3 pb-2 pt-4 touch-none cursor-pointer select-none"
      >
        <div className={`relative h-[3px] rounded-full bg-white/25 overflow-visible transition-all ${scrubbing ? "h-[5px]" : ""}`}>
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-amber-300 via-orange-400 to-rose-500"
            style={{ width: `${progress * 100}%` }}
          />
          <div
            className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 rounded-full bg-white shadow-[0_0_0_3px_rgba(0,0,0,0.35)] transition-all ${scrubbing ? "size-3.5" : "size-2.5 opacity-90"}`}
            style={{ left: `${progress * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
}
