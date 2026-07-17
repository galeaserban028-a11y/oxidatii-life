import { createStart, createMiddleware } from "@tanstack/react-start";

import { renderErrorPage } from "./lib/error-page";
import { attachSupabaseAuth } from "@/integrations/supabase/auth-attacher";

// Origins we accept for cross-origin serverFn calls.
// - https://localhost         → Android Capacitor WebView (androidScheme: https)
// - capacitor://localhost     → iOS Capacitor WebView (not currently used but harmless)
// - https://oxidatii.life etc → the public web app itself (same-origin, no header needed
//   but included so preview subdomains still work when we test in browser)
const ALLOWED_ORIGINS = new Set([
  "https://localhost",
  "capacitor://localhost",
  "https://oxidatii.life",
  "https://www.oxidatii.life",
  "https://oxidatii-life.lovable.app",
]);

function corsHeadersFor(origin: string | null): Record<string, string> {
  if (!origin) return {};
  const allowed =
    ALLOWED_ORIGINS.has(origin) ||
    origin.endsWith(".lovable.app") ||
    origin.endsWith(".lovable.dev");
  if (!allowed) return {};
  return {
    "access-control-allow-origin": origin,
    "access-control-allow-credentials": "true",
    "access-control-allow-methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    "access-control-allow-headers":
      "authorization, content-type, x-supabase-auth, x-tsr-redirect, accept",
    "access-control-expose-headers": "content-type, x-tsr-redirect",
    "access-control-max-age": "600",
    vary: "Origin",
  };
}

const corsMiddleware = createMiddleware().server(async ({ next, request }) => {
  const origin = request?.headers?.get("origin") ?? null;
  const headers = corsHeadersFor(origin);

  // Short-circuit CORS preflight before it hits the router / serverFn dispatch.
  if (request?.method === "OPTIONS" && origin && Object.keys(headers).length > 0) {
    return new Response(null, { status: 204, headers });
  }

  const response = await next();
  if (response instanceof Response && Object.keys(headers).length > 0) {
    for (const [k, v] of Object.entries(headers)) {
      response.headers.set(k, v);
    }
  }
  return response;
});

const errorMiddleware = createMiddleware().server(async ({ next }) => {
  try {
    return await next();
  } catch (error) {
    if (error != null && typeof error === "object" && "statusCode" in error) {
      throw error;
    }
    console.error(error);
    return new Response(renderErrorPage(), {
      status: 500,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }
});

export const startInstance = createStart(() => ({
  // CORS must run first so preflight OPTIONS returns before the router dispatches.
  requestMiddleware: [corsMiddleware, errorMiddleware],
  functionMiddleware: [attachSupabaseAuth],
}));
