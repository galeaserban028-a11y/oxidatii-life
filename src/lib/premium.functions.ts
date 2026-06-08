import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { type StripeEnv, createStripeClient, getStripeErrorMessage } from "@/lib/stripe.server";

type CheckoutResult = { clientSecret: string } | { error: string };
type PortalResult = { url: string } | { error: string };

// Allowed price IDs (subscriptions + one-time coin packs)
const ALLOWED_PRICES = new Set([
  "vip_monthly", "vip_yearly",
  "vip_plus_monthly", "vip_plus_yearly",
  "pro_monthly", "pro_yearly",
  "elite_monthly", "elite_yearly",
  "coins_mic", "coins_mediu", "coins_mare", "coins_boss", "coins_legenda",
]);

const COIN_PACKS: Record<string, number> = {
  coins_mic: 50,
  coins_mediu: 200,
  coins_mare: 600,
  coins_boss: 1500,
  coins_legenda: 5000,
};

async function resolveCustomer(stripe: ReturnType<typeof createStripeClient>, userId: string, email?: string) {
  if (!/^[a-zA-Z0-9_-]+$/.test(userId)) throw new Error("Invalid userId");
  const found = await stripe.customers.search({
    query: `metadata['userId']:'${userId}'`,
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

      return { clientSecret: session.client_secret ?? "" };
    } catch (error) {
      return { error: getStripeErrorMessage(error) };
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
