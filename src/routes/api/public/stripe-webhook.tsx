import { createFileRoute } from "@tanstack/react-router";
import { createStripeClient, getWebhookSecret, type StripeEnv } from "@/lib/stripe.server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const Route = createFileRoute("/api/public/stripe-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const url = new URL(request.url);
        const envParam = url.searchParams.get("env");
        const env: StripeEnv = envParam === "live" ? "live" : "sandbox";

        const sig = request.headers.get("stripe-signature");
        if (!sig) return new Response("Missing signature", { status: 400 });

        const body = await request.text();
        const stripe = createStripeClient(env);
        const secret = getWebhookSecret(env);

        let event;
        try {
          event = await stripe.webhooks.constructEventAsync(body, sig, secret);
        } catch (err) {
          console.error("Webhook signature verification failed:", err);
          return new Response("Invalid signature", { status: 400 });
        }

        if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
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

            // Idempotency: dacă există deja un ledger cu acest session id, skip
            const { data: existing } = await supabaseAdmin
              .from("wallet_ledger")
              .select("id")
              .eq("note", `stripe:${session.id}`)
              .maybeSingle();
            if (existing) return new Response("ok", { status: 200 });

            // Inserează ledger
            const { error: ledgerErr } = await supabaseAdmin
              .from("wallet_ledger")
              .insert({
                business_id: businessId,
                kind: "topup",
                amount_cents: amountCents,
                note: `stripe:${session.id}`,
              });
            if (ledgerErr) {
              console.error("Ledger insert failed", ledgerErr);
              return new Response("Ledger error", { status: 500 });
            }

            // Update balance
            const { data: biz } = await supabaseAdmin
              .from("business_accounts")
              .select("wallet_balance_cents")
              .eq("id", businessId)
              .maybeSingle();
            const current = biz?.wallet_balance_cents ?? 0;
            await supabaseAdmin
              .from("business_accounts")
              .update({ wallet_balance_cents: current + amountCents })
              .eq("id", businessId);
          }
        }

        return new Response("ok", { status: 200 });
      },
    },
  },
});
