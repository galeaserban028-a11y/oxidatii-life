import { useRef, useState } from "react";

type Props = {
  src: string;
  alt?: string;
  className?: string;
  /** Optional callback when user single-taps (not while zooming). */
  onTap?: () => void;
};

/**
 * Inline pinch-to-zoom image. Two-finger pinch scales + pans in place,
 * release smoothly snaps back. No fullscreen modal.
 */
export default function PinchImage({ src, alt, className, onTap }: Props) {
  const imgRef = useRef<HTMLImageElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const startDist = useRef(0);
  const startScale = useRef(1);
  const startMid = useRef({ x: 0, y: 0 });
  const startTx = useRef(0);
  const startTy = useRef(0);
  const lastTap = useRef(0);
  const [zooming, setZooming] = useState(false);

  const tx = useRef(0);
  const ty = useRef(0);
  const scale = useRef(1);

  const paint = (animated = false) => {
    const el = imgRef.current;
    if (!el) return;
    el.style.transition = animated ? "transform 220ms cubic-bezier(.22,1,.36,1)" : "none";
    el.style.transform = `translate3d(${tx.current}px, ${ty.current}px, 0) scale(${scale.current})`;
  };

  const reset = () => {
    tx.current = 0;
    ty.current = 0;
    scale.current = 1;
    paint(true);
    setZooming(false);
  };

  const onPointerDown = (e: React.PointerEvent) => {
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2) {
      const pts = Array.from(pointers.current.values());
      const dx = pts[0].x - pts[1].x;
      const dy = pts[0].y - pts[1].y;
      startDist.current = Math.hypot(dx, dy) || 1;
      startScale.current = scale.current;
      startMid.current = { x: (pts[0].x + pts[1].x) / 2, y: (pts[0].y + pts[1].y) / 2 };
      startTx.current = tx.current;
      startTy.current = ty.current;
      setZooming(true);
    }
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size >= 2) {
      e.preventDefault();
      const pts = Array.from(pointers.current.values());
      const dx = pts[0].x - pts[1].x;
      const dy = pts[0].y - pts[1].y;
      const dist = Math.hypot(dx, dy) || 1;
      const next = Math.max(1, Math.min(4, startScale.current * (dist / startDist.current)));
      const mid = { x: (pts[0].x + pts[1].x) / 2, y: (pts[0].y + pts[1].y) / 2 };
      scale.current = next;
      tx.current = startTx.current + (mid.x - startMid.current.x);
      ty.current = startTy.current + (mid.y - startMid.current.y);
      paint(false);
    }
  };

  const onPointerUp = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) {
      // released a pinch → snap back
      if (zooming) reset();
      else {
        // double tap → toggle zoom in place (no fullscreen)
        const now = Date.now();
        if (now - lastTap.current < 280) {
          if (scale.current > 1) reset();
          else {
            scale.current = 2.2;
            paint(true);
            setZooming(true);
          }
          lastTap.current = 0;
        } else {
          lastTap.current = now;
          onTap?.();
        }
      }
    }
  };


  return (
    <div
      ref={wrapRef}
      className={`relative overflow-hidden ${className ?? ""}`}
      style={{ touchAction: zooming ? "none" : "pan-y" }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      <img
        ref={imgRef}
        src={src}
        alt={alt ?? ""}
        loading="lazy"
        draggable={false}
        className="w-full h-full object-cover select-none will-change-transform"
      />
    </div>
  );
}
