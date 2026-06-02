import { createFileRoute } from "@tanstack/react-router";
import { type StripeEnv, verifyWebhook } from "@/lib/stripe.server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

async function handleWalletTopup(session: any) {
  const meta = session.metadata ?? {};
  if (meta.kind !== "wallet_topup") return;
  const businessId = meta.business_id;
  const amountCents = parseInt(meta.amount_cents || "0", 10);
  if (!businessId || !amountCents) {
    console.error("Missing wallet_topup metadata", meta);
    return;
  }

  // Idempotency on session id
  const noteTag = `stripe:${session.id}`;
  const { data: existing } = await supabaseAdmin
    .from("wallet_ledger")
    .select("id")
    .eq("note", noteTag)
    .maybeSingle();
  if (existing) return;

  const { error: ledgerErr } = await supabaseAdmin
    .from("wallet_ledger")
    .insert({
      business_id: businessId,
      kind: "topup",
      amount_cents: amountCents,
      note: noteTag,
    });
  if (ledgerErr) {
    console.error("Ledger insert failed", ledgerErr);
    throw new Error("Ledger insert failed");
  }

  const { data: biz } = await supabaseAdmin
    .from("business_accounts")
    .select("wallet_balance_cents")
    .eq("id", businessId)
    .maybeSingle();
  const current = (biz?.wallet_balance_cents as number | undefined) ?? 0;
  await supabaseAdmin
    .from("business_accounts")
    .update({ wallet_balance_cents: current + amountCents })
    .eq("id", businessId);
}

export const Route = createFileRoute("/api/public/payments/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const rawEnv = new URL(request.url).searchParams.get("env");
        if (rawEnv !== "sandbox" && rawEnv !== "live") {
          console.error("Webhook invalid env:", rawEnv);
          return Response.json({ received: true, ignored: "invalid env" });
        }
        const env: StripeEnv = rawEnv;
        try {
          const event = await verifyWebhook(request, env);
          if (
            event.type === "checkout.session.completed" ||
            event.type === "checkout.session.async_payment_succeeded"
          ) {
            const session = event.data.object as any;
            if (session.payment_status === "paid") {
              await handleWalletTopup(session);
            }
          }
          return Response.json({ received: true });
        } catch (e) {
          console.error("Webhook error:", e);
          return new Response("Webhook error", { status: 400 });
        }
      },
    },
  },
});
