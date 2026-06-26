import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { type StripeEnv, createStripeClient, getCheckoutClientSecret, getStripeErrorMessage } from "@/lib/stripe.server";

type CheckoutResult = { clientSecret: string } | { error: string };
type PortalResult = { url: string } | { error: string };
type SyncResult = { success: true; tier?: string; coinsAdded?: number } | { success: false; error: string };

// Allowed price IDs (subscriptions + one-time coin packs + à la carte)
const ALLOWED_PRICES = new Set([
  "vip_monthly", "vip_yearly",
  "vip_plus_monthly", "vip_plus_yearly",
  "pro_monthly", "pro_yearly",
  "elite_monthly", "elite_yearly",
  "coins_mic", "coins_mediu", "coins_mare", "coins_boss", "coins_legenda",
  "crystal_ball_7d",
]);

const COIN_PACKS: Record<string, number> = {
  coins_mic: 50,
  coins_mediu: 200,
  coins_mare: 600,
  coins_boss: 1500,
  coins_legenda: 5000,
};

// À la carte one-time SKUs auto-provisioned in Stripe if the lookup_key is missing.
// Amounts in RON minor units (bani).
const ALACARTE_SKUS: Record<string, { name: string; description: string; amount: number; currency: string; kind: string; days?: number }> = {
  crystal_ball_7d: {
    name: "Crystal Ball · 7 zile",
    description: "Vezi cine ți-a vizitat profilul și cine a fost fizic aproape de tine în ultimele 7 zile.",
    amount: 300, // 3.00 RON
    currency: "ron",
    kind: "crystal_ball",
    days: 7,
  },
};

// price_id → premium tier + one-time coin grant. Must match webhook at src/routes/api/public/payments/webhook.tsx
const TIER_MAP: Record<string, { tier: "vip" | "vip_plus" | "pro" | "elite"; coins: number }> = {
  vip_monthly: { tier: "vip", coins: 5 },
  vip_yearly: { tier: "vip", coins: 60 },
  vip_plus_monthly: { tier: "vip_plus", coins: 15 },
  vip_plus_yearly: { tier: "vip_plus", coins: 180 },
  pro_monthly: { tier: "pro", coins: 40 },
  pro_yearly: { tier: "pro", coins: 480 },
  elite_monthly: { tier: "elite", coins: 120 },
  elite_yearly: { tier: "elite", coins: 1440 },
};

async function resolveCustomer(stripe: ReturnType<typeof createStripeClient>, userId: string, email?: string) {
  if (!/^[a-zA-Z0-9_-]+$/.test(userId)) throw new Error("Invalid userId");
  const found = await stripe.customers.search({
    query: `metadata['userId']:'${userId}']`,
    limit: 1,
  });
  const foundCustomers = Array.isArray(found.data) ? found.data : [];
  if (foundCustomers.length) return foundCustomers[0].id;
  if (email) {
    const existing = await stripe.customers.list({ email, limit: 1 });
    const existingCustomers = Array.isArray(existing.data) ? existing.data : [];
    if (existingCustomers.length) {
      const c = existingCustomers[0];
      if (c.metadata?.userId !== userId) {
        await stripe.customers.update(c.id, { metadata: { ...c.metadata, userId } });
      }
      return c.id;
    }
  }
  const created = await stripe.customers.create({
    ...(email && { email }),
    metadata: { userId },
  });
  return created.id;
}

export const createPremiumCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: {
    priceId: string;
    returnUrl: string;
    environment: StripeEnv;
  }) => {
    if (!ALLOWED_PRICES.has(data.priceId)) throw new Error("Invalid priceId");
    return data;
  })
  .handler(async ({ data, context }): Promise<CheckoutResult> => {
    const { userId, claims } = context;
    const email = (claims as any)?.email as string | undefined;

    try {
      const stripe = createStripeClient(data.environment);
      const prices = await stripe.prices.list({ lookup_keys: [data.priceId], limit: 1 });
      const matchedPrices = Array.isArray(prices.data) ? prices.data : [];
      if (!matchedPrices.length) return { error: "Preț indisponibil" };
      const stripePrice = matchedPrices[0];
      const isRecurring = stripePrice.type === "recurring";
      const isCoinPack = data.priceId.startsWith("coins_");

      const customerId = await resolveCustomer(stripe, userId, email);

      let productDescription: string | undefined;
      if (!isRecurring) {
        const productId = typeof stripePrice.product === "string"
          ? stripePrice.product
          : stripePrice.product.id;
        const product = await stripe.products.retrieve(productId);
        productDescription = product.name;
      }

      const meta = {
        user_id: userId,
        price_id: data.priceId,
        ...(isCoinPack && { kind: "coin_pack", coins: String(COIN_PACKS[data.priceId] ?? 0) }),
      };

      const session = await stripe.checkout.sessions.create({
        line_items: [{ price: stripePrice.id, quantity: 1 }],
        mode: isRecurring ? "subscription" : "payment",
        ui_mode: "embedded_page",
        return_url: data.returnUrl,
        customer: customerId,
        ...(!isRecurring && {
          payment_intent_data: { description: productDescription, metadata: meta },
        }),
        metadata: { ...meta, userId },
        ...(isRecurring && { subscription_data: { metadata: { userId, price_id: data.priceId } } }),
      });

      let clientSecret = getCheckoutClientSecret(session);
      if (!clientSecret && session.id) {
        clientSecret = getCheckoutClientSecret(await stripe.checkout.sessions.retrieve(session.id));
      }
      if (!clientSecret) return { error: "Plata nu a putut porni. Reîncearcă în câteva secunde." };
      return { clientSecret };
    } catch (error) {
      return { error: getStripeErrorMessage(error) };
    }
  });

// Client-side fallback: when a user returns from checkout, the app calls this to
// ensure their premium tier / coin pack is applied even if Stripe webhooks are
// delayed or not configured for the current environment (preview vs published).
export const syncCheckoutToProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { sessionId: string; environment: StripeEnv }) => data)
  .handler(async ({ data, context }): Promise<SyncResult> => {
    const { userId } = context;
    if (!/^[a-zA-Z0-9_-]+$/.test(data.sessionId)) {
      return { success: false, error: "Invalid session ID" };
    }

    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const stripe = createStripeClient(data.environment);
      const session = await stripe.checkout.sessions.retrieve(data.sessionId, {
        expand: ["subscription", "subscription.items.data.price.product"],
      });

      if (session.status !== "complete") {
        return { success: false, error: "Plata nu este finalizată încă" };
      }
      if (session.payment_status !== "paid" && session.payment_status !== "no_payment_required") {
        return { success: false, error: "Plata nu a fost procesată" };
      }

      // Security: session must belong to the calling user
      const sessionUserId = session.metadata?.userId ?? session.metadata?.user_id ?? null;
      if (sessionUserId !== userId) {
        return { success: false, error: "Sesiunea nu aparține contului tău" };
      }

      const priceId = session.metadata?.price_id ?? null;
      const isCoinPack = typeof priceId === "string" && priceId.startsWith("coins_");

      // Coin packs: add coins immediately
      if (isCoinPack) {
        const { data: existing } = await supabaseAdmin
          .from("coin_purchases")
          .select("id")
          .eq("stripe_session_id", session.id)
          .maybeSingle();
        if (!existing) {
          const coins = parseInt(session.metadata?.coins ?? String(COIN_PACKS[priceId] ?? 0), 10);
          if (coins > 0) {
            const { data: prof } = await supabaseAdmin
              .from("profiles")
              .select("coin_balance")
              .eq("id", userId)
              .maybeSingle();
            const current = (prof?.coin_balance as number | undefined) ?? 0;
            await supabaseAdmin.from("profiles").update({ coin_balance: current + coins }).eq("id", userId);
            await supabaseAdmin.from("coin_purchases").insert({
              user_id: userId,
              stripe_session_id: session.id,
              pack_id: priceId,
              coins,
              amount_cents: session.amount_total ?? 0,
              currency: session.currency ?? "ron",
              environment: data.environment,
            });
            return { success: true, coinsAdded: coins };
          }
        }
        return { success: true };
      }

      // Subscriptions: expand subscription and apply tier
      const rawSub = session.subscription;
      if (!rawSub || typeof rawSub === "string") {
        return { success: false, error: "Nu am găsit abonamentul asociat plății" };
      }
      const subscription = rawSub as any;
      const item = subscription.items?.data?.[0];
      const price = item?.price;
      if (!price) {
        return { success: false, error: "Nu am găsit prețul abonamentului" };
      }
      const priceLookup = price.lookup_key || price.metadata?.lovable_external_id || price.id;
      const tierInfo = priceLookup ? TIER_MAP[priceLookup] : null;
      if (!tierInfo) {
        return { success: false, error: "Nu am recunoscut produsul cumpărat" };
      }

      const periodEnd = item?.current_period_end ?? subscription.current_period_end;
      const periodEndIso = periodEnd ? new Date(periodEnd * 1000).toISOString() : null;
      const periodStart = item?.current_period_start ?? subscription.current_period_start;
      const periodStartIso = periodStart ? new Date(periodStart * 1000).toISOString() : null;

      // Upsert subscription row
      await supabaseAdmin.from("subscriptions").upsert({
        user_id: userId,
        stripe_subscription_id: subscription.id,
        stripe_customer_id: typeof subscription.customer === "string" ? subscription.customer : subscription.customer?.id,
        product_id: typeof price.product === "string" ? price.product : price.product?.id,
        price_id: priceLookup,
        status: subscription.status,
        current_period_start: periodStartIso,
        current_period_end: periodEndIso,
        cancel_at_period_end: subscription.cancel_at_period_end || false,
        environment: data.environment,
        updated_at: new Date().toISOString(),
      }, { onConflict: "stripe_subscription_id" });

      // Apply premium tier and grant one-time coins on first upgrade
      const { data: prof } = await supabaseAdmin
        .from("profiles")
        .select("coin_balance, premium_tier, active_frame_id")
        .eq("id", userId)
        .maybeSingle();
      const currentCoins = (prof?.coin_balance as number | undefined) ?? 0;
      const wasUpgraded = prof?.premium_tier !== tierInfo.tier;

      const PREMIUM_FRAME: Record<string, string> = {
        vip: "vip_aurum",
        vip_plus: "vipplus_crystal",
        pro: "pro_holo",
        elite: "elite_diamond",
      };
      const frameId = PREMIUM_FRAME[tierInfo.tier];
      if (frameId) {
        await supabaseAdmin.from("user_frames").upsert(
          { user_id: userId, frame_id: frameId },
          { onConflict: "user_id,frame_id", ignoreDuplicates: true }
        );
      }

      await supabaseAdmin.from("profiles").update({
        premium_tier: tierInfo.tier,
        premium_until: periodEndIso,
        ...(wasUpgraded && { coin_balance: currentCoins + tierInfo.coins }),
        ...(wasUpgraded && frameId && !prof?.active_frame_id && { active_frame_id: frameId }),
      }).eq("id", userId);

      return { success: true, tier: tierInfo.tier };
    } catch (error) {
      return { success: false, error: getStripeErrorMessage(error) };
    }
  });

export const createPremiumPortalSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { returnUrl: string; environment: StripeEnv }) => data)
  .handler(async ({ data, context }): Promise<PortalResult> => {
    const { supabase, userId } = context;
    const { data: sub } = await supabase
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("user_id", userId)
      .eq("environment", data.environment)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!sub?.stripe_customer_id) return { error: "Nu ai abonament activ" };
    try {
      const stripe = createStripeClient(data.environment);
      const portal = await stripe.billingPortal.sessions.create({
        customer: sub.stripe_customer_id as string,
        return_url: data.returnUrl,
      });
      return { url: portal.url };
    } catch (error) {
      return { error: getStripeErrorMessage(error) };
    }
  });
