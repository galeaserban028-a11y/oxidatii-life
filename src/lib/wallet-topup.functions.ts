import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { type StripeEnv, createStripeClient, getStripeErrorMessage } from "@/lib/stripe.server";

type CheckoutResult = { clientSecret: string } | { error: string };

export const createWalletTopupCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: {
    businessId: string;
    amount: number; // major units (RON or EUR)
    currency: "ron" | "eur";
    returnUrl: string;
    environment: StripeEnv;
  }) => {
    if (!/^[0-9a-f-]{36}$/i.test(data.businessId)) throw new Error("Invalid businessId");
    if (!["ron", "eur"].includes(data.currency)) throw new Error("Invalid currency");
    const minMajor = data.currency === "ron" ? 50 : 10;
    if (!Number.isFinite(data.amount) || data.amount < minMajor || data.amount > 100000) {
      throw new Error(`Sumă invalidă (minim ${minMajor} ${data.currency.toUpperCase()})`);
    }
    return data;
  })
  .handler(async ({ data, context }): Promise<CheckoutResult> => {
    const { supabase, userId } = context;

    // Verifică ownership
    const { data: biz, error: bizErr } = await supabase
      .from("business_accounts")
      .select("id, owner_user_id, brand_name")
      .eq("id", data.businessId)
      .maybeSingle();
    if (bizErr || !biz || biz.owner_user_id !== userId) {
      return { error: "Acces refuzat la acest cont de business." };
    }

    try {
      const stripe = createStripeClient(data.environment);
      const amountCents = Math.round(data.amount * 100);

      // Resolve/create customer cu metadata.userId
      let customerId: string | undefined;
      const found = await stripe.customers.search({
        query: `metadata['userId']:'${userId}'`,
        limit: 1,
      });
      const foundCustomers = Array.isArray(found.data) ? found.data : [];
      if (foundCustomers.length) {
        customerId = foundCustomers[0].id;
      } else {
        const created = await stripe.customers.create({
          metadata: { userId },
        });
        customerId = created.id;
      }

      const session = await stripe.checkout.sessions.create({
        line_items: [{
          price_data: {
            currency: data.currency,
            product_data: { name: `Top-up portofel - ${biz.brand_name}` },
            unit_amount: amountCents,
          },
          quantity: 1,
        }],
        mode: "payment",
        ui_mode: "embedded_page",
        return_url: data.returnUrl,
        customer: customerId,
        payment_intent_data: {
          description: `Wallet top-up · ${biz.brand_name}`,
          metadata: {
            kind: "wallet_topup",
            business_id: data.businessId,
            user_id: userId,
            amount_cents: String(amountCents),
            currency: data.currency,
          },
        },
        metadata: {
          kind: "wallet_topup",
          business_id: data.businessId,
          user_id: userId,
          amount_cents: String(amountCents),
          currency: data.currency,
        },
      });

      return { clientSecret: session.client_secret ?? "" };
    } catch (error) {
      return { error: getStripeErrorMessage(error) };
    }
  });
