import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js";
import { getStripe, getStripeEnvironment } from "@/lib/stripe";
import { createBizPlanCheckout, type BizPlan } from "@/utils/payments.functions";

export function BizPlanEmbeddedCheckout({
  businessId,
  plan,
  returnUrl,
}: { businessId: string; plan: BizPlan; returnUrl?: string }) {
  const fetchClientSecret = async (): Promise<string> => {
    const result = await createBizPlanCheckout({
      data: {
        businessId,
        plan,
        returnUrl: returnUrl || window.location.href,
        environment: getStripeEnvironment(),
      },
    });
    if ("error" in result) throw new Error(result.error);
    if (!result.clientSecret) throw new Error("Stripe nu a returnat client secret");
    return result.clientSecret;
  };

  return (
    <div id="checkout">
      <EmbeddedCheckoutProvider stripe={getStripe()} options={{ fetchClientSecret }}>
        <EmbeddedCheckout />
      </EmbeddedCheckoutProvider>
    </div>
  );
}
