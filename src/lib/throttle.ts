// Tiny throttle util — used to coalesce burst realtime events so we don't
// trigger N refetches when many rows land at once during traffic spikes.
export function throttle<T extends (...args: any[]) => void>(fn: T, waitMs = 1500) {
  let lastCall = 0;
  let pending: ReturnType<typeof setTimeout> | null = null;
  let lastArgs: any[] = [];
  return ((...args: any[]) => {
    lastArgs = args;
    const now = Date.now();
    const remaining = waitMs - (now - lastCall);
    if (remaining <= 0) {
      lastCall = now;
      fn(...(lastArgs as any));
    } else if (!pending) {
      pending = setTimeout(() => {
        lastCall = Date.now();
        pending = null;
        fn(...(lastArgs as any));
      }, remaining);
    }
  }) as T;
}
