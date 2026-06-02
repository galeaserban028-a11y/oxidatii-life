import { useEffect, useState } from "react";
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js";
import { getStripe, getStripeEnvironment } from "@/lib/stripe";
import { createPremiumCheckout } from "@/lib/premium.functions";
import { X, Crown } from "lucide-react";

export function PremiumCheckoutDialog({
  priceId,
  title,
  open,
  onClose,
}: {
  priceId: string | null;
  title: string;
  open: boolean;
  onClose: () => void;
}) {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !priceId) {
      setClientSecret(null);
      setError(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const result = await createPremiumCheckout({
          data: {
            priceId,
            returnUrl: `${window.location.origin}/app/premium?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
            environment: getStripeEnvironment(),
          },
        });
        if (cancelled) return;
        if ("error" in result) throw new Error(result.error);
        if (!result.clientSecret) throw new Error("Lipsește client secret");
        setClientSecret(result.clientSecret);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Eroare necunoscută");
      }
    })();
    return () => { cancelled = true; };
  }, [open, priceId]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto">
      <div className="bg-background w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl border border-foreground/10 max-h-[95vh] overflow-y-auto">
        <div className="sticky top-0 bg-background z-10 flex items-center justify-between px-4 py-3 border-b border-foreground/10">
          <div className="flex items-center gap-2">
            <Crown size={16} />
            <div className="font-display uppercase text-sm tracking-widest">{title}</div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-foreground/5 rounded-md">
            <X size={18} />
          </button>
        </div>
        {error ? (
          <div className="p-6 text-sm text-neon-crimson">{error}</div>
        ) : !clientSecret ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Se încarcă plata…</div>
        ) : (
          <div className="p-2">
            <EmbeddedCheckoutProvider stripe={getStripe()} options={{ clientSecret }}>
              <EmbeddedCheckout />
            </EmbeddedCheckoutProvider>
          </div>
        )}
      </div>
    </div>
  );
}
