import { useEffect, useRef, useState } from "react";

type Props = {
  src: string;
  className?: string;
  onTapZone?: () => void; // optional: e.g. open zoom; not called when toggling sound
};

/**
 * Autoplaying muted looping video tile.
 * - Plays/pauses based on visibility (IntersectionObserver).
 * - Tap toggles mute (unmuted videos pause others via a window event).
 * - Speaker icon shows current mute state.
 */
export default function VideoTile({ src, className }: Props) {
  const ref = useRef<HTMLVideoElement>(null);
  const [muted, setMuted] = useState(true);
  const [visible, setVisible] = useState(false);

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

  // When this video unmutes, mute others.
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
      <button
        type="button"
        onClick={toggleMute}
        aria-label={muted ? "Activează sunetul" : "Oprește sunetul"}
        className="absolute bottom-3 left-3 size-9 rounded-full backdrop-blur-xl bg-black/50 border border-white/15 grid place-items-center text-white active:scale-90 transition pointer-events-auto"
      >
        {muted ? (
          <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>
        ) : (
          <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>
        )}
      </button>
    </div>
  );
}
