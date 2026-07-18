/**
 * In-app OAuth / deep-link debug log.
 *
 * Ring buffer (max 200 entries) surfaced în /debug/oauth. Persistă în
 * localStorage ca să supraviețuiască restart-ului WebView-ului cât timp
 * userul e în Custom Tab.
 */

export type OAuthDebugLevel = "info" | "warn" | "error";

export interface OAuthDebugEntry {
  t: number;                // timestamp ms
  level: OAuthDebugLevel;
  step: string;
  detail?: unknown;
}

const STORAGE_KEY = "oxidatii_oauth_debug_log";
const MAX = 200;
type Listener = (entries: OAuthDebugEntry[]) => void;
const listeners = new Set<Listener>();

function read(): OAuthDebugEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function write(entries: OAuthDebugEntry[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch { /* noop */ }
  listeners.forEach((l) => { try { l(entries); } catch { /* noop */ } });
}

export function oauthDebug(
  level: OAuthDebugLevel,
  step: string,
  detail?: unknown,
): void {
  const entry: OAuthDebugEntry = { t: Date.now(), level, step, detail: safeDetail(detail) };
  const next = [...read(), entry].slice(-MAX);
  write(next);
  try {
    // eslint-disable-next-line no-console
    const fn = level === "error" ? console.error : level === "warn" ? console.warn : console.info;
    fn(`[oauth:${step}]`, detail ?? "");
  } catch { /* noop */ }
}

function safeDetail(d: unknown): unknown {
  if (d == null) return d;
  if (d instanceof Error) return { name: d.name, message: d.message };
  try { JSON.stringify(d); return d; } catch { return String(d); }
}

export function getOAuthDebugLog(): OAuthDebugEntry[] {
  return read();
}

export function clearOAuthDebugLog(): void {
  write([]);
}

export function subscribeOAuthDebug(l: Listener): () => void {
  listeners.add(l);
  l(read());
  return () => { listeners.delete(l); };
}
