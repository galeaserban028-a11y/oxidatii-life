// Supabase Edge Function: stripe-webhook
// Lovable auto-registers this URL with Stripe when payments are enabled.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@22.0.2?target=denonext";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "*",
};

const GATEWAY = "https://connector-gateway.lovable.dev/stripe";

function stripeFor(env: "sandbox" | "live") {
  const connectionKey = Deno.env.get(
    env === "sandbox" ? "STRIPE_SANDBOX_API_KEY" : "STRIPE_LIVE_API_KEY"
  );
  const lovableKey = Deno.env.get("LOVABLE_API_KEY");
  if (!connectionKey || !lovableKey) throw new Error("Stripe keys missing");
  return new Stripe(connectionKey, {
    apiVersion: "2026-03-25.dahlia",
    httpClient: Stripe.createFetchHttpClient(((input: URL | RequestInfo, init?: RequestInit) => {
      const urlStr = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
      return fetch(urlStr.replace("https://api.stripe.com", GATEWAY), {
        ...init,
        headers: {
          ...Object.fromEntries(new Headers(init?.headers).entries()),
          "X-Connection-Api-Key": connectionKey,
          "Lovable-API-Key": lovableKey,
        },
      });
    }) as typeof fetch),
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const url = new URL(req.url);
  const envParam = url.searchParams.get("env");
  const env: "sandbox" | "live" = envParam === "live" ? "live" : "sandbox";

  const sig = req.headers.get("stripe-signature");
  if (!sig) return new Response("missing signature", { status: 400 });

  const secret = Deno.env.get(
    env === "sandbox" ? "PAYMENTS_SANDBOX_WEBHOOK_SECRET" : "PAYMENTS_LIVE_WEBHOOK_SECRET"
  );
  if (!secret) return new Response("missing secret", { status: 500 });

  const body = await req.text();
  const stripe = stripeFor(env);

  let event;
  try {
    event = await stripe.webhooks.constructEventAsync(body, sig, secret);
  } catch (e) {
    console.error("Signature verification failed", e);
    return new Response("bad sig", { status: 400 });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  if (
    event.type === "checkout.session.completed" ||
    event.type === "checkout.session.async_payment_succeeded"
  ) {
    const session = event.data.object as {
      id: string;
      payment_status: string;
      metadata?: Record<string, string>;
    };
    if (session.payment_status !== "paid") {
      return new Response("ok", { status: 200 });
    }
    const meta = session.metadata ?? {};
    if (meta.kind === "wallet_topup") {
      const businessId = meta.business_id;
      const amountCents = parseInt(meta.amount_cents || "0", 10);
      if (!businessId || !amountCents) {
        console.error("Missing wallet_topup metadata", meta);
        return new Response("ok", { status: 200 });
      }

      const noteKey = `stripe:${session.id}`;
      const { data: existing } = await supabase
        .from("wallet_ledger")
        .select("id")
        .eq("note", noteKey)
        .maybeSingle();
      if (existing) return new Response("ok", { status: 200 });

      const { error: ledgerErr } = await supabase.from("wallet_ledger").insert({
        business_id: businessId,
        kind: "topup",
        amount_cents: amountCents,
        note: noteKey,
      });
      if (ledgerErr) {
        console.error("Ledger insert failed", ledgerErr);
        return new Response("ledger error", { status: 500 });
      }

      const { data: biz } = await supabase
        .from("business_accounts")
        .select("wallet_balance_cents")
        .eq("id", businessId)
        .maybeSingle();
      const current = biz?.wallet_balance_cents ?? 0;
      await supabase
        .from("business_accounts")
        .update({ wallet_balance_cents: current + amountCents })
        .eq("id", businessId);
    }
  }

  return new Response("ok", { status: 200, headers: corsHeaders });
});
