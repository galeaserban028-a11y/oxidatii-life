/**
 * Runtime validation for the Android deep-link + OAuth configuration.
 * Sonda rulează odată la boot pe native și scrie rezultatul în oauth-debug.
 */

import { isNative } from "./native";
import { oauthDebug } from "./oauth-debug";

export interface DeepLinkCheck {
  name: string;
  ok: boolean;
  detail?: string;
}

export async function validateDeepLinkConfig(): Promise<DeepLinkCheck[]> {
  const results: DeepLinkCheck[] = [];
  const push = (c: DeepLinkCheck) => { results.push(c); return c; };

  push({
    name: "runtime.isNative",
    ok: isNative(),
    detail: isNative() ? "Capacitor native" : "Web",
  });

  try {
    const { Capacitor } = await import("@capacitor/core");
    push({ name: "capacitor.platform", ok: true, detail: Capacitor.getPlatform() });
  } catch (e) {
    push({ name: "capacitor.platform", ok: false, detail: String(e) });
  }

  // Custom scheme reachability sanity check — nu putem lansa scheme din
  // WebView, dar validăm că URL-ul e construit corect.
  try {
    const u = new URL("oxidatii://oauth?access_token=x&refresh_token=y&state=z");
    push({
      name: "scheme.oxidatii",
      ok: u.protocol === "oxidatii:" && u.host === "oauth",
      detail: u.toString(),
    });
  } catch (e) {
    push({ name: "scheme.oxidatii", ok: false, detail: String(e) });
  }

  // App Link host reachability — validăm că host-ul e ajuns via HTTPS.
  if (isNative()) {
    try {
      const res = await fetch("https://oxidatii.life/.well-known/assetlinks.json", {
        method: "GET",
        cache: "no-store",
      });
      const ok = res.ok;
      push({
        name: "applink.assetlinks",
        ok,
        detail: `HTTP ${res.status}`,
      });
    } catch (e) {
      push({ name: "applink.assetlinks", ok: false, detail: String(e) });
    }
  }

  const failed = results.filter((r) => !r.ok);
  oauthDebug(failed.length ? "warn" : "info", "deep-link.validate", { results, failed });
  return results;
}
