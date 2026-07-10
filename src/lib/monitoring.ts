/**
 * Lightweight client-side error monitoring.
 *
 * - Captures `window.error` and `unhandledrejection` events.
 * - Buffers the last 50 events on `window.__oxiErrors` (readable from devtools).
 * - Logs each event via `console.error` with a `[oxi-monitor]` prefix
 *   (greppable in Vercel/Cloudflare/Sentry log drains).
 * - If `import.meta.env.VITE_SENTRY_DSN` is set AND `@sentry/browser` is
 *   installed, it initializes Sentry on demand. Zero cost when either is
 *   missing.
 *
 * Call `initMonitoring()` once, from a client-only effect (see __root.tsx).
 */

type LoggedEvent = {
  ts: number;
  kind: "error" | "unhandledrejection";
  message: string;
  stack?: string;
  url?: string;
};

declare global {
  interface Window {
    __oxiErrors?: LoggedEvent[];
    __oxiMonitorInit?: boolean;
  }
}

const MAX_BUFFERED = 50;

function pushEvent(evt: LoggedEvent) {
  if (typeof window === "undefined") return;
  if (!window.__oxiErrors) window.__oxiErrors = [];
  window.__oxiErrors.push(evt);
  if (window.__oxiErrors.length > MAX_BUFFERED) {
    window.__oxiErrors.splice(0, window.__oxiErrors.length - MAX_BUFFERED);
  }
  // eslint-disable-next-line no-console
  console.error("[oxi-monitor]", evt.kind, evt.message, evt.stack ?? "", evt.url ?? "");
}

export function initMonitoring() {
  if (typeof window === "undefined") return;
  if (window.__oxiMonitorInit) return;
  window.__oxiMonitorInit = true;

  window.addEventListener("error", (e) => {
    pushEvent({
      ts: Date.now(),
      kind: "error",
      message: e.message || String(e.error ?? "unknown"),
      stack: e.error?.stack,
      url: `${e.filename ?? ""}:${e.lineno ?? 0}:${e.colno ?? 0}`,
    });
  });

  window.addEventListener("unhandledrejection", (e) => {
    const reason = e.reason;
    const message =
      reason instanceof Error
        ? reason.message
        : typeof reason === "string"
          ? reason
          : (() => {
              try {
                return JSON.stringify(reason);
              } catch {
                return String(reason);
              }
            })();
    pushEvent({
      ts: Date.now(),
      kind: "unhandledrejection",
      message,
      stack: reason instanceof Error ? reason.stack : undefined,
    });
  });

  // Optional Sentry integration. Requires:
  //   1. `bun add @sentry/browser`
  //   2. Set VITE_SENTRY_DSN in env
  // Both must be present or this block is a no-op.
  const dsn = import.meta.env.VITE_SENTRY_DSN as string | undefined;
  if (dsn) {
    // @ts-expect-error — optional peer dep; install with `bun add @sentry/browser` to enable.
    import("@sentry/browser")
      .then((Sentry) => {
        Sentry.init({
          dsn,
          environment: import.meta.env.MODE,
          tracesSampleRate: 0.1,
          replaysSessionSampleRate: 0,
          replaysOnErrorSampleRate: 0.1,
        });
      })
      .catch(() => {
        // Sentry not installed — silent no-op. Local buffer + console still work.
      });
  }
}

/** Manually report a caught error (won't be captured by global handlers). */
export function reportError(err: unknown, context?: Record<string, unknown>) {
  const message = err instanceof Error ? err.message : String(err);
  const stack = err instanceof Error ? err.stack : undefined;
  pushEvent({
    ts: Date.now(),
    kind: "error",
    message: context ? `${message} | ${JSON.stringify(context)}` : message,
    stack,
  });
}
