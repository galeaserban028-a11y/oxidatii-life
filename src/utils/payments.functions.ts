import { createServerFn } from "@tanstack/react-start";
import { type StripeEnv, createStripeClient, getCheckoutClientSecret, getStripeErrorMessage } from "@/lib/stripe.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type CheckoutResult = { clientSecret: string } | { error: string };

async function resolveOrCreateCustomer(
  stripe: ReturnType<typeof createStripeClient>,
  options: { email?: string; userId: string },
): Promise<string> {
  if (!/^[a-zA-Z0-9_-]+$/.test(options.userId)) throw new Error("Invalid userId");
  const found = await stripe.customers.search({
    query: `metadata['userId']:'${options.userId}'`,
    limit: 1,
  });
  const foundCustomers = Array.isArray(found.data) ? found.data : [];
  if (foundCustomers.length) return foundCustomers[0].id;
  if (options.email) {
    const existing = await stripe.customers.list({ email: options.email, limit: 1 });
    const existingCustomers = Array.isArray(existing.data) ? existing.data : [];
    if (existingCustomers.length) {
      const c = existingCustomers[0];
      if (c.metadata?.userId !== options.userId) {
        await stripe.customers.update(c.id, { metadata: { ...c.metadata, userId: options.userId } });
      }
      return c.id;
    }
  }
  const created = await stripe.customers.create({
    ...(options.email && { email: options.email }),
    metadata: { userId: options.userId },
  });
  return created.id;
}

export const createBizProCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { businessId: string; returnUrl: string; environment: StripeEnv }) => {
    if (!/^[0-9a-f-]{36}$/i.test(data.businessId)) throw new Error("Invalid businessId");
    return data;
  })
  .handler(async ({ data, context }): Promise<CheckoutResult> => {
    try {
      const { supabase, userId } = context;
      const { data: biz, error: bizErr } = await supabase
        .from("business_accounts")
        .select("id, owner_user_id")
        .eq("id", data.businessId)
        .maybeSingle();
      if (bizErr || !biz) throw new Error("Business inexistent");
      if (biz.owner_user_id !== userId) throw new Error("Nu ai acces la acest business");

      const stripe = createStripeClient(data.environment);
      const prices = await stripe.prices.list({ lookup_keys: ["biz_pro_monthly"] });
      const matchedPrices = Array.isArray(prices.data) ? prices.data : [];
      if (!matchedPrices.length) throw new Error("Preț Pro indisponibil");
      const price = matchedPrices[0];

      const { data: userRes } = await supabase.auth.getUser();
      const customerId = await resolveOrCreateCustomer(stripe, {
        email: userRes?.user?.email ?? undefined,
        userId,
      });

      const session = await stripe.checkout.sessions.create({
        line_items: [{ price: price.id, quantity: 1 }],
        mode: "subscription",
        ui_mode: "embedded" as any,
        return_url: data.returnUrl,
        customer: customerId,
        metadata: { userId, kind: "biz_pro", business_id: data.businessId },
        subscription_data: {
          metadata: { userId, kind: "biz_pro", business_id: data.businessId },
        },
      });

      const clientSecret = getCheckoutClientSecret(session);
      if (!clientSecret) return { error: "Plata nu a putut porni. Reîncearcă în câteva secunde." };
      return { clientSecret };
    } catch (e) {
      return { error: getStripeErrorMessage(e) };
    }
  });
