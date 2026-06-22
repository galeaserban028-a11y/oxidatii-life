import { useEffect, useRef, useState } from "react";

type Props = {
  src: string;
  className?: string;
  onTapZone?: () => void;
  /** Px of space at the bottom reserved for overlays (action pill, tab bar, etc). */
  bottomInset?: number;
};

/**
 * Autoplaying muted looping video tile with custom scrub bar.
 * Scrub is rAF-throttled and writes directly to the DOM to feel 1:1.
 */
export default function VideoTile({ src, className, bottomInset = 72 }: Props) {
  const ref = useRef<HTMLVideoElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const fillRef = useRef<HTMLDivElement>(null);
  const knobRef = useRef<HTMLDivElement>(null);
  const pillRef = useRef<HTMLDivElement>(null);

  const [muted, setMuted] = useState(true);
  const [visible, setVisible] = useState(false);
  const [scrubbing, setScrubbing] = useState(false);
  const [duration, setDuration] = useState(0);

  // Mutable scrub state (no re-renders)
  const rectRef = useRef<DOMRect | null>(null);
  const pendingXRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const scrubbingRef = useRef(false);
  const wasPlayingRef = useRef(false);
  const lastSeekAtRef = useRef(0);

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
    if (visible && !scrubbing) {
      el.play().catch(() => {});
    } else if (!visible) {
      el.pause();
      if (!muted) {
        el.muted = true;
        setMuted(true);
      }
    }
  }, [visible, muted, scrubbing]);

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

  // Update progress UI (direct DOM writes — no re-render)
  const paintProgress = (p: number, t: number) => {
    const pct = (p * 100).toFixed(3);
    if (fillRef.current) fillRef.current.style.width = `${pct}%`;
    if (knobRef.current) knobRef.current.style.left = `${pct}%`;
    if (pillRef.current && scrubbingRef.current) {
      pillRef.current.textContent = `${fmt(t)} / ${fmt(duration || ref.current?.duration || 0)}`;
    }
  };

  // Sync from video timeupdate when not scrubbing
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onTime = () => {
      if (scrubbingRef.current) return;
      const d = el.duration || 0;
      if (d > 0) paintProgress(el.currentTime / d, el.currentTime);
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
  }, [duration]);

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

  const applySeek = () => {
    rafRef.current = null;
    const x = pendingXRef.current;
    const rect = rectRef.current;
    const el = ref.current;
    if (x == null || !rect || !el || !el.duration) return;
    const p = Math.max(0, Math.min(1, (x - rect.left) / rect.width));
    const t = p * el.duration;
    paintProgress(p, t);
    // Throttle actual seeks to ~60Hz; use fastSeek when available
    const now = performance.now();
    if (now - lastSeekAtRef.current >= 16) {
      lastSeekAtRef.current = now;
      const fs = (el as HTMLVideoElement & { fastSeek?: (t: number) => void }).fastSeek;
      if (typeof fs === "function") fs.call(el, t);
      else el.currentTime = t;
    }
  };

  const scheduleSeek = (clientX: number) => {
    pendingXRef.current = clientX;
    if (rafRef.current == null) rafRef.current = requestAnimationFrame(applySeek);
  };

  const onPointerDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    const bar = barRef.current;
    const el = ref.current;
    if (!bar || !el) return;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    rectRef.current = bar.getBoundingClientRect();
    scrubbingRef.current = true;
    wasPlayingRef.current = !el.paused;
    el.pause();
    setScrubbing(true);
    scheduleSeek(e.clientX);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!scrubbingRef.current) return;
    e.stopPropagation();
    scheduleSeek(e.clientX);
  };

  const onPointerUp = (e: React.PointerEvent) => {
    if (!scrubbingRef.current) return;
    e.stopPropagation();
    // Flush any pending seek synchronously
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    const x = pendingXRef.current;
    const rect = rectRef.current;
    const el = ref.current;
    if (x != null && rect && el && el.duration) {
      const p = Math.max(0, Math.min(1, (x - rect.left) / rect.width));
      el.currentTime = p * el.duration;
    }
    scrubbingRef.current = false;
    pendingXRef.current = null;
    rectRef.current = null;
    setScrubbing(false);
    if (wasPlayingRef.current && el) el.play().catch(() => {});
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
        style={{ bottom: `calc(${bottomInset}px + env(safe-area-inset-bottom) - 14px)` }}
        className="absolute left-3 size-8 rounded-full backdrop-blur-xl bg-black/50 border border-white/15 grid place-items-center text-white active:scale-90 transition pointer-events-auto"
      >

        {muted ? (
          <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>
        ) : (
          <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>
        )}
      </button>

      {/* Time pill while scrubbing */}
      {scrubbing && (
        <div
          ref={pillRef}
          style={{ bottom: `calc(${bottomInset}px + env(safe-area-inset-bottom) + 18px)` }}
          className="absolute left-1/2 -translate-x-1/2 px-2.5 py-1 rounded-full text-[11px] font-medium text-white bg-black/70 backdrop-blur-xl border border-white/15 tabular-nums pointer-events-none"
        >
          0:00 / {fmt(duration)}
        </div>
      )}

      {/* Custom scrub bar — bigger touch target, direct DOM updates */}
      <div
        ref={barRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onClick={(e) => e.stopPropagation()}
        className="absolute left-[64px] right-0 pl-3 pr-3 pb-2 pt-5 touch-none cursor-pointer select-none"
        style={{ touchAction: "none", bottom: `calc(${bottomInset}px + env(safe-area-inset-bottom))` }}
      >

        <div className={`relative rounded-full bg-white/25 ${scrubbing ? "h-[5px]" : "h-[3px]"}`} style={{ willChange: "height" }}>
          <div
            ref={fillRef}
            className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-amber-300 via-orange-400 to-rose-500"
            style={{ width: "0%", willChange: "width" }}
          />
          <div
            ref={knobRef}
            className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 rounded-full bg-white shadow-[0_0_0_3px_rgba(0,0,0,0.35)] ${scrubbing ? "size-3.5" : "size-2.5 opacity-90"}`}
            style={{ left: "0%", willChange: "left" }}
          />
        </div>
      </div>
    </div>
  );
}

function fmt(s: number) {
  if (!isFinite(s) || s < 0) s = 0;
  const m = Math.floor(s / 60);
  const r = Math.floor(s % 60);
  return `${m}:${r.toString().padStart(2, "0")}`;
}
