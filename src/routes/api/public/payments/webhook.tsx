import { createFileRoute } from "@tanstack/react-router";
import { type StripeEnv, verifyWebhook } from "@/lib/stripe.server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

// price_id → premium tier + monthly coin grant
const TIER_MAP: Record<string, { tier: "vip" | "vip_plus" | "pro" | "elite"; coins: number }> = {
  vip_monthly: { tier: "vip", coins: 50 },
  vip_yearly: { tier: "vip", coins: 600 },
  vip_plus_monthly: { tier: "vip_plus", coins: 150 },
  vip_plus_yearly: { tier: "vip_plus", coins: 1800 },
  pro_monthly: { tier: "pro", coins: 500 },
  pro_yearly: { tier: "pro", coins: 6000 },
  elite_monthly: { tier: "elite", coins: 1500 },
  elite_yearly: { tier: "elite", coins: 18000 },
};

const COIN_PACKS: Record<string, number> = {
  coins_mic: 50,
  coins_mediu: 200,
  coins_mare: 600,
  coins_boss: 1500,
  coins_legenda: 5000,
};

function resolvePriceLookup(item: any): string | null {
  return item?.price?.lookup_key
    || item?.price?.metadata?.lovable_external_id
    || item?.price?.id
    || null;
}

async function handleWalletTopup(session: any) {
  const meta = session.metadata ?? {};
  if (meta.kind !== "wallet_topup") return;
  const businessId = meta.business_id;
  const amountCents = parseInt(meta.amount_cents || "0", 10);
  if (!businessId || !amountCents) return;

  const noteTag = `stripe:${session.id}`;
  const { data: existing } = await supabaseAdmin
    .from("wallet_ledger").select("id").eq("note", noteTag).maybeSingle();
  if (existing) return;

  const { error: ledgerErr } = await supabaseAdmin.from("wallet_ledger").insert({
    business_id: businessId, kind: "topup", amount_cents: amountCents, note: noteTag,
  });
  if (ledgerErr) throw new Error("Ledger insert failed");

  const { data: biz } = await supabaseAdmin
    .from("business_accounts").select("wallet_balance_cents").eq("id", businessId).maybeSingle();
  const current = (biz?.wallet_balance_cents as number | undefined) ?? 0;
  await supabaseAdmin.from("business_accounts")
    .update({ wallet_balance_cents: current + amountCents }).eq("id", businessId);
}

async function handleCoinPackPurchase(session: any, env: StripeEnv) {
  const meta = session.metadata ?? {};
  if (meta.kind !== "coin_pack") return;
  const userId = meta.user_id;
  const priceId = meta.price_id;
  const coins = COIN_PACKS[priceId] ?? parseInt(meta.coins || "0", 10);
  if (!userId || !coins) return;

  // Idempotency
  const { data: existing } = await supabaseAdmin
    .from("coin_purchases").select("id").eq("stripe_session_id", session.id).maybeSingle();
  if (existing) return;

  await supabaseAdmin.from("coin_purchases").insert({
    user_id: userId,
    stripe_session_id: session.id,
    pack_id: priceId,
    coins,
    amount_cents: session.amount_total ?? 0,
    currency: session.currency ?? "ron",
    environment: env,
  });

  const { data: prof } = await supabaseAdmin
    .from("profiles").select("coin_balance").eq("id", userId).maybeSingle();
  const current = (prof?.coin_balance as number | undefined) ?? 0;
  await supabaseAdmin.from("profiles")
    .update({ coin_balance: current + coins }).eq("id", userId);
}

async function upsertSubscription(subscription: any, env: StripeEnv) {
  const userId = subscription.metadata?.userId;
  if (!userId) return;

  const item = subscription.items?.data?.[0];
  const priceLookup = resolvePriceLookup(item);
  const productId = typeof item?.price?.product === "string" ? item.price.product : item?.price?.product?.id;
  const periodStart = item?.current_period_start ?? subscription.current_period_start;
  const periodEnd = item?.current_period_end ?? subscription.current_period_end;
  const periodEndIso = periodEnd ? new Date(periodEnd * 1000).toISOString() : null;

  await supabaseAdmin.from("subscriptions").upsert({
    user_id: userId,
    stripe_subscription_id: subscription.id,
    stripe_customer_id: subscription.customer,
    product_id: productId ?? null,
    price_id: priceLookup ?? "unknown",
    status: subscription.status,
    current_period_start: periodStart ? new Date(periodStart * 1000).toISOString() : null,
    current_period_end: periodEndIso,
    cancel_at_period_end: subscription.cancel_at_period_end || false,
    environment: env,
    updated_at: new Date().toISOString(),
  }, { onConflict: "stripe_subscription_id" });

  // Sync premium_tier on profile
  const tierInfo = priceLookup ? TIER_MAP[priceLookup] : null;
  const isActive = ["active", "trialing", "past_due"].includes(subscription.status)
    || (subscription.status === "canceled" && periodEnd && periodEnd * 1000 > Date.now());

  if (tierInfo && isActive) {
    // Grant monthly coins on creation/renewal
    const { data: prof } = await supabaseAdmin
      .from("profiles").select("coin_balance, premium_tier").eq("id", userId).maybeSingle();
    const currentCoins = (prof?.coin_balance as number | undefined) ?? 0;
    const wasUpgraded = prof?.premium_tier !== tierInfo.tier;

    await supabaseAdmin.from("profiles").update({
      premium_tier: tierInfo.tier,
      premium_until: periodEndIso,
      // Grant coins when subscription is fresh or tier changes
      ...(wasUpgraded && { coin_balance: currentCoins + tierInfo.coins }),
    }).eq("id", userId);
  }
}

async function handleSubscriptionDeleted(subscription: any, env: StripeEnv) {
  const userId = subscription.metadata?.userId;
  await supabaseAdmin.from("subscriptions").update({
    status: "canceled",
    updated_at: new Date().toISOString(),
  }).eq("stripe_subscription_id", subscription.id).eq("environment", env);

  // Revoke premium when subscription fully ends (Stripe sends this after period_end if not renewed)
  if (userId) {
    await supabaseAdmin.from("profiles").update({
      premium_tier: null,
      premium_until: null,
    }).eq("id", userId);
  }
}

export const Route = createFileRoute("/api/public/payments/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const rawEnv = new URL(request.url).searchParams.get("env");
        if (rawEnv !== "sandbox" && rawEnv !== "live") {
          return Response.json({ received: true, ignored: "invalid env" });
        }
        const env: StripeEnv = rawEnv;
        try {
          const event = await verifyWebhook(request, env);
          switch (event.type) {
            case "checkout.session.completed":
            case "checkout.session.async_payment_succeeded": {
              const session = event.data.object as any;
              if (session.payment_status === "paid" || session.payment_status === "no_payment_required") {
                await handleWalletTopup(session);
                await handleCoinPackPurchase(session, env);
              }
              break;
            }
            case "customer.subscription.created":
            case "customer.subscription.updated":
              await upsertSubscription(event.data.object, env);
              break;
            case "customer.subscription.deleted":
              await handleSubscriptionDeleted(event.data.object, env);
              break;
            default:
              break;
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
