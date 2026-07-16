/**
 * FCM HTTP v1 sender for native Android push.
 * Uses a Firebase service account JSON stored in FCM_SERVICE_ACCOUNT_JSON.
 * Signs a JWT with RS256 via Web Crypto (Workers-compatible) to exchange
 * for an OAuth2 access token, then POSTs to fcm.googleapis.com.
 */
import { supabaseAdmin } from "@/integrations/supabase/client.server";

type ServiceAccount = {
  project_id: string;
  client_email: string;
  private_key: string;
  token_uri?: string;
};

type PushPayload = {
  title: string;
  body: string;
  url?: string;
  tag?: string;
  icon?: string;
  data?: Record<string, unknown>;
};

let cachedToken: { token: string; expiresAt: number } | null = null;
let cachedAccount: ServiceAccount | null = null;

function loadAccount(): ServiceAccount {
  if (cachedAccount) return cachedAccount;
  const raw = process.env.FCM_SERVICE_ACCOUNT_JSON;
  if (!raw) throw new Error("FCM_SERVICE_ACCOUNT_JSON missing");
  const parsed = JSON.parse(raw) as ServiceAccount;
  if (!parsed.project_id || !parsed.client_email || !parsed.private_key) {
    throw new Error("FCM_SERVICE_ACCOUNT_JSON invalid");
  }
  cachedAccount = parsed;
  return parsed;
}

function b64url(input: ArrayBuffer | Uint8Array | string): string {
  let bytes: Uint8Array;
  if (typeof input === "string") bytes = new TextEncoder().encode(input);
  else if (input instanceof Uint8Array) bytes = input;
  else bytes = new Uint8Array(input);
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s).replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function pemToPkcs8(pem: string): ArrayBuffer {
  const cleaned = pem
    .replace(/-----BEGIN PRIVATE KEY-----/g, "")
    .replace(/-----END PRIVATE KEY-----/g, "")
    .replace(/\s+/g, "");
  const bin = atob(cleaned);
  const buf = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
  return buf.buffer;
}

async function getAccessToken(): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  if (cachedToken && cachedToken.expiresAt - 60 > now) return cachedToken.token;

  const account = loadAccount();
  const header = { alg: "RS256", typ: "JWT" };
  const claim = {
    iss: account.client_email,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: account.token_uri || "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  };
  const signingInput = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(claim))}`;

  const key = await crypto.subtle.importKey(
    "pkcs8",
    pemToPkcs8(account.private_key),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    new TextEncoder().encode(signingInput),
  );
  const jwt = `${signingInput}.${b64url(sig)}`;

  const res = await fetch(claim.aud, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`FCM token exchange failed: ${res.status} ${txt}`);
  }
  const json = (await res.json()) as { access_token: string; expires_in: number };
  cachedToken = { token: json.access_token, expiresAt: now + json.expires_in };
  return json.access_token;
}

/**
 * Send a push to native FCM tokens. Returns dead endpoint strings (to clean up).
 */
export async function sendFcmToTokens(
  tokens: string[],
  payload: PushPayload,
): Promise<{ sent: number; failed: number; dead: string[] }> {
  if (!tokens.length) return { sent: 0, failed: 0, dead: [] };
  const account = loadAccount();
  const accessToken = await getAccessToken();
  const url = `https://fcm.googleapis.com/v1/projects/${account.project_id}/messages:send`;

  const dead: string[] = [];
  let sent = 0;
  let failed = 0;

  await Promise.all(
    tokens.map(async (token) => {
      const message = {
        message: {
          token,
          notification: { title: payload.title, body: payload.body },
          data: {
            ...(payload.url ? { url: payload.url } : {}),
            ...(payload.tag ? { tag: payload.tag } : {}),
            ...Object.fromEntries(
              Object.entries(payload.data ?? {}).map(([k, v]) => [k, String(v)]),
            ),
          },
          android: {
            priority: "HIGH" as const,
            notification: payload.icon ? { icon: payload.icon } : undefined,
          },
        },
      };
      try {
        const res = await fetch(url, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(message),
        });
        if (res.ok) {
          sent++;
        } else {
          failed++;
          const status = res.status;
          if (status === 404 || status === 400 || status === 403) {
            // UNREGISTERED / INVALID_ARGUMENT typically means dead token
            dead.push(token);
          }
        }
      } catch {
        failed++;
      }
    }),
  );

  if (dead.length) {
    const endpoints = dead.map((t) => `native:fcm:${t}`);
    await supabaseAdmin.from("push_subscriptions").delete().in("endpoint", endpoints);
  }

  return { sent, failed, dead };
}
