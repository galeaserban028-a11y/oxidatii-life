import { supabase } from "@/integrations/supabase/client";
import { VAPID_PUBLIC_KEY } from "./push-config";

const SW_URL = "/push-sw.js";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

function isInIframe(): boolean {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
}

function isPreviewHost(): boolean {
  const host = window.location.hostname;
  return host.includes("id-preview--") || host.includes("lovableproject.com");
}

export function pushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

export function isIosStandalone(): boolean {
  // iOS only supports web push when the PWA is installed (added to Home Screen)
  // @ts-ignore — non-standard but iOS uses this
  return window.matchMedia("(display-mode: standalone)").matches || (navigator as any).standalone === true;
}

export function platformBlocksPush(): { blocked: boolean; reason?: string } {
  if (!pushSupported()) return { blocked: true, reason: "Browserul nu suportă push notifications." };
  if (isInIframe() || isPreviewHost()) {
    return { blocked: true, reason: "Push merge doar pe site-ul publicat, nu în preview." };
  }
  const ua = navigator.userAgent;
  const isIOS = /iPhone|iPad|iPod/.test(ua) || (navigator.platform === "MacIntel" && (navigator as any).maxTouchPoints > 1);
  if (isIOS && !isIosStandalone()) {
    return { blocked: true, reason: "Pe iOS trebuie să adaugi întâi aplicația pe Home Screen." };
  }
  return { blocked: false };
}

export async function getPushState(): Promise<"granted" | "denied" | "default" | "unsupported"> {
  if (!pushSupported()) return "unsupported";
  return Notification.permission as any;
}

export async function getCurrentSubscription(): Promise<PushSubscription | null> {
  if (!pushSupported()) return null;
  try {
    const reg = await navigator.serviceWorker.getRegistration(SW_URL);
    if (!reg) return null;
    return await reg.pushManager.getSubscription();
  } catch {
    return null;
  }
}

async function ensureRegistration(): Promise<ServiceWorkerRegistration> {
  let reg = await navigator.serviceWorker.getRegistration(SW_URL);
  if (!reg) {
    reg = await navigator.serviceWorker.register(SW_URL, { scope: "/" });
  }
  await navigator.serviceWorker.ready;
  return reg;
}

export async function enablePush(): Promise<{ ok: true } | { ok: false; reason: string }> {
  const block = platformBlocksPush();
  if (block.blocked) return { ok: false, reason: block.reason! };

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, reason: "Trebuie să fii autentificat." };

  const perm = await Notification.requestPermission();
  if (perm !== "granted") return { ok: false, reason: "Permisiunea a fost refuzată." };

  const reg = await ensureRegistration();
  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    });
  }
  const json = sub.toJSON() as { endpoint?: string; keys?: { p256dh?: string; auth?: string } };
  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
    return { ok: false, reason: "Abonament invalid." };
  }

  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      user_id: user.id,
      endpoint: json.endpoint,
      p256dh: json.keys.p256dh,
      auth: json.keys.auth,
      user_agent: navigator.userAgent.slice(0, 240),
    },
    { onConflict: "endpoint" }
  );
  if (error) return { ok: false, reason: error.message };

  // Ensure prefs row exists
  await supabase
    .from("notification_prefs")
    .upsert({ user_id: user.id }, { onConflict: "user_id", ignoreDuplicates: true });

  return { ok: true };
}

export async function disablePush(): Promise<void> {
  const sub = await getCurrentSubscription();
  if (sub) {
    const endpoint = sub.endpoint;
    try { await sub.unsubscribe(); } catch {}
    await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint);
  }
}
