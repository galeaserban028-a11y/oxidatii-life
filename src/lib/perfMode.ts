// Simple FPS monitor with subscribers. When FPS drops below a threshold for
// a few consecutive samples, downgrades the perf level so heavy animations
// (avatar frame ornaments, blurs, conic gradients) can degrade gracefully.

type Level = "high" | "low";
type Listener = (l: Level) => void;

let level: Level = "high";
const listeners = new Set<Listener>();
let started = false;

function setLevel(l: Level) {
  if (l === level) return;
  level = l;
  if (typeof document !== "undefined") {
    document.documentElement.dataset.perf = l;
  }
  listeners.forEach((fn) => fn(l));
}

function start() {
  if (started || typeof window === "undefined") return;
  started = true;

  // Honor user preference & device hints up front
  const reduce =
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
  const dm = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
  const lowMem = !!dm && dm <= 3;
  const lowCores = (navigator.hardwareConcurrency ?? 8) <= 4;
  if (reduce || lowMem || lowCores) {
    setLevel("low");
    // Still keep monitoring in case it recovers (e.g. reduced motion off later)
  }

  let last = performance.now();
  let frames = 0;
  let lowStreak = 0;
  let highStreak = 0;

  const tick = (now: number) => {
    frames++;
    const dt = now - last;
    if (dt >= 1000) {
      const fps = (frames * 1000) / dt;
      frames = 0;
      last = now;
      if (fps < 40) {
        lowStreak++;
        highStreak = 0;
        if (lowStreak >= 2) setLevel("low");
      } else if (fps > 55) {
        highStreak++;
        lowStreak = 0;
        if (highStreak >= 4) setLevel("high");
      }
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

export function getPerfLevel(): Level {
  return level;
}

export function subscribePerf(fn: Listener): () => void {
  start();
  listeners.add(fn);
  fn(level);
  return () => listeners.delete(fn);
}
