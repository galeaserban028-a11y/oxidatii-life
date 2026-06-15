import { createServerFn } from "@tanstack/react-start";
import { type StripeEnv, createStripeClient, getCheckoutClientSecret, getStripeErrorMessage } from "@/lib/stripe.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type CheckoutResult = { clientSecret: string } | { error: string };

export type BizPlan = "basic" | "pro" | "elite";

export const BIZ_PLAN_PRICES: Record<BizPlan, string> = {
  basic: "biz_basic_monthly",
  pro: "biz_pro_v2_monthly",
  elite: "biz_elite_monthly",
};

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

export const createBizPlanCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { businessId: string; plan: BizPlan; returnUrl: string; environment: StripeEnv }) => {
    if (!/^[0-9a-f-]{36}$/i.test(data.businessId)) throw new Error("Invalid businessId");
    if (!["basic", "pro", "elite"].includes(data.plan)) throw new Error("Invalid plan");
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
      const lookupKey = BIZ_PLAN_PRICES[data.plan];
      const prices = await stripe.prices.list({ lookup_keys: [lookupKey] });
      const matched = Array.isArray(prices.data) ? prices.data : [];
      if (!matched.length) throw new Error(`Preț indisponibil: ${lookupKey}`);
      const price = matched[0];

      const { data: userRes } = await supabase.auth.getUser();
      const customerId = await resolveOrCreateCustomer(stripe, {
        email: userRes?.user?.email ?? undefined,
        userId,
      });

      const session = await stripe.checkout.sessions.create({
        line_items: [{ price: price.id, quantity: 1 }],
        mode: "subscription",
        ui_mode: "embedded_page",
        return_url: data.returnUrl,
        customer: customerId,
        metadata: { userId, kind: "biz_plan", business_id: data.businessId, plan: data.plan },
        subscription_data: {
          metadata: { userId, kind: "biz_plan", business_id: data.businessId, plan: data.plan },
        },
      });

      let clientSecret = getCheckoutClientSecret(session);
      if (!clientSecret && session.id) {
        clientSecret = getCheckoutClientSecret(await stripe.checkout.sessions.retrieve(session.id));
      }
      if (!clientSecret) return { error: "Plata nu a putut porni. Reîncearcă în câteva secunde." };
      return { clientSecret };
    } catch (e) {
      return { error: getStripeErrorMessage(e) };
    }
  });

export const cancelBizPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { businessId: string; environment: StripeEnv }) => {
    if (!/^[0-9a-f-]{36}$/i.test(data.businessId)) throw new Error("Invalid businessId");
    return data;
  })
  .handler(async ({ data, context }): Promise<{ ok: true } | { error: string }> => {
    try {
      const { supabase, userId } = context;
      const { data: biz } = await supabase
        .from("business_accounts").select("id, owner_user_id")
        .eq("id", data.businessId).maybeSingle();
      if (!biz || biz.owner_user_id !== userId) throw new Error("Forbidden");

      const stripe = createStripeClient(data.environment);
      const subs = await stripe.subscriptions.search({
        query: `metadata['business_id']:'${data.businessId}' AND metadata['kind']:'biz_plan' AND status:'active'`,
        limit: 5,
      });
      const list = Array.isArray(subs.data) ? subs.data : [];
      for (const s of list) {
        await stripe.subscriptions.update(s.id, { cancel_at_period_end: true });
      }
      return { ok: true };
    } catch (e) {
      return { error: getStripeErrorMessage(e) };
    }
  });
