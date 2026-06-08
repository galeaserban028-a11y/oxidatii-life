import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js";
import { getStripe, getStripeEnvironment } from "@/lib/stripe";
import { createBizProCheckout } from "@/utils/payments.functions";

export function BizProEmbeddedCheckout({
  businessId,
  returnUrl,
}: { businessId: string; returnUrl?: string }) {
  const fetchClientSecret = async (): Promise<string> => {
    const result = await createBizProCheckout({
      data: {
        businessId,
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
