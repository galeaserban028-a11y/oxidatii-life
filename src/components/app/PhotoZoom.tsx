import {
  useEffect,
  useRef,
  useState,
  useCallback,
  type PointerEvent as ReactPointerEvent,
} from "react";

type Props = {
  src: string;
  alt?: string;
  onClose: () => void;
};

/**
 * Fullscreen pinch/double-tap zoom viewer for images.
 * - Pinch with two fingers (mobile)
 * - Wheel / trackpad pinch (desktop)
 * - Double-tap to toggle 2.5x zoom at the tap point
 * - Drag to pan when zoomed
 * - Tap background or press Esc to close
 */
export default function PhotoZoom({ src, alt = "", onClose }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [scale, setScale] = useState(1);
  const [tx, setTx] = useState(0);
  const [ty, setTy] = useState(0);

  // pointer tracking for pinch + drag
  const pointersRef = useRef<Map<number, { x: number; y: number }>>(new Map());
  const pinchStartRef = useRef<{
    dist: number;
    scale: number;
    cx: number;
    cy: number;
    tx: number;
    ty: number;
  } | null>(null);
  const dragStartRef = useRef<{ x: number; y: number; tx: number; ty: number } | null>(null);
  const lastTapRef = useRef<number>(0);

  const clampPan = useCallback((nx: number, ny: number, s: number) => {
    const el = containerRef.current;
    if (!el) return { x: nx, y: ny };
    const w = el.clientWidth;
    const h = el.clientHeight;
    const maxX = ((s - 1) * w) / 2;
    const maxY = ((s - 1) * h) / 2;
    return {
      x: Math.max(-maxX, Math.min(maxX, nx)),
      y: Math.max(-maxY, Math.min(maxY, ny)),
    };
  }, []);

  const reset = useCallback(() => {
    setScale(1);
    setTx(0);
    setTy(0);
  }, []);

  // Esc to close, lock body scroll
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    (e.target as Element).setPointerCapture?.(e.pointerId);
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointersRef.current.size === 2) {
      const pts = Array.from(pointersRef.current.values());
      const dx = pts[0].x - pts[1].x;
      const dy = pts[0].y - pts[1].y;
      pinchStartRef.current = {
        dist: Math.hypot(dx, dy),
        scale,
        cx: (pts[0].x + pts[1].x) / 2,
        cy: (pts[0].y + pts[1].y) / 2,
        tx,
        ty,
      };
      dragStartRef.current = null;
    } else if (pointersRef.current.size === 1 && scale > 1) {
      dragStartRef.current = { x: e.clientX, y: e.clientY, tx, ty };
    }
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!pointersRef.current.has(e.pointerId)) return;
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointersRef.current.size === 2 && pinchStartRef.current) {
      const pts = Array.from(pointersRef.current.values());
      const dx = pts[0].x - pts[1].x;
      const dy = pts[0].y - pts[1].y;
      const dist = Math.hypot(dx, dy);
      const ratio = dist / pinchStartRef.current.dist;
      const nextScale = Math.max(1, Math.min(5, pinchStartRef.current.scale * ratio));
      const { x, y } = clampPan(pinchStartRef.current.tx, pinchStartRef.current.ty, nextScale);
      setScale(nextScale);
      setTx(x);
      setTy(y);
    } else if (pointersRef.current.size === 1 && dragStartRef.current && scale > 1) {
      const ds = dragStartRef.current;
      const { x, y } = clampPan(ds.tx + (e.clientX - ds.x), ds.ty + (e.clientY - ds.y), scale);
      setTx(x);
      setTy(y);
    }
  };

  const onPointerUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    pointersRef.current.delete(e.pointerId);
    if (pointersRef.current.size < 2) pinchStartRef.current = null;
    if (pointersRef.current.size === 0) dragStartRef.current = null;
  };

  const onWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    const delta = -e.deltaY * 0.005;
    const next = Math.max(1, Math.min(5, scale + delta));
    if (next === 1) {
      reset();
      return;
    }
    setScale(next);
    const { x, y } = clampPan(tx, ty, next);
    setTx(x);
    setTy(y);
  };

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const now = Date.now();
    if (now - lastTapRef.current < 280) {
      // double-tap toggle
      if (scale > 1) reset();
      else setScale(2.5);
      lastTapRef.current = 0;
    } else {
      lastTapRef.current = now;
    }
    // single tap on backdrop closes
    if (e.target === e.currentTarget && scale === 1) {
      setTimeout(() => {
        if (lastTapRef.current && Date.now() - lastTapRef.current >= 270) onClose();
      }, 280);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-xl touch-none select-none overscroll-contain"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onWheel={onWheel}
      onClick={handleClick}
      ref={containerRef}
    >
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        aria-label="Închide"
        className="absolute top-4 right-4 z-10 size-10 rounded-full bg-white/10 backdrop-blur-xl border border-white/15 grid place-items-center text-white active:scale-90 transition"
      >
        <svg
          viewBox="0 0 24 24"
          className="size-5"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M18 6L6 18M6 6l12 12" />
        </svg>
      </button>
      <div className="absolute inset-0 grid place-items-center p-4">
        <img
          ref={imgRef}
          src={src}
          alt={alt}
          draggable={false}
          className="max-w-full max-h-full object-contain will-change-transform"
          style={{
            transform: `translate3d(${tx}px, ${ty}px, 0) scale(${scale})`,
            transition: pointersRef.current.size === 0 ? "transform 180ms ease-out" : "none",
            touchAction: "none",
          }}
        />
      </div>
    </div>
  );
}
