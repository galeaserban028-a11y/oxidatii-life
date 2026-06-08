import { useCallback, useEffect, useState } from "react";
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js";
import { getStripe, getStripeEnvironment } from "@/lib/stripe";
import { createWalletTopupCheckout } from "@/lib/wallet-topup.functions";
import { X, Wallet } from "lucide-react";

const PACKAGES = [50, 100, 250];
const MIN_AMOUNT = 50;
const CURRENCY = "ron" as const;
const SYMBOL = "RON";

export function WalletTopupDialog({
  businessId,
  open,
  onClose,
}: {
  businessId: string;
  open: boolean;
  onClose: () => void;
}) {
  const [amount, setAmount] = useState<number>(PACKAGES[0]);
  const [checkoutReady, setCheckoutReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setCheckoutReady(false);
      setError(null);
      setAmount(PACKAGES[0]);
    }
  }, [open]);

  const startCheckout = async () => {
    if (!amount || amount < MIN_AMOUNT) {
      setError(`Sumă minimă: ${MIN_AMOUNT} ${SYMBOL}`);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      setCheckoutReady(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Eroare necunoscută");
    } finally {
      setLoading(false);
    }
  };

  const fetchClientSecret = useCallback(async (): Promise<string> => {
    const result = await createWalletTopupCheckout({
      data: {
        businessId,
        amount,
        currency: CURRENCY,
        returnUrl: `${window.location.origin}/app/biz?topup=success&session_id={CHECKOUT_SESSION_ID}`,
        environment: getStripeEnvironment(),
      },
    });
    if ("error" in result) throw new Error(result.error);
    if (!result.clientSecret) throw new Error("Lipsește client secret");
    return result.clientSecret;
  }, [amount, businessId]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto">
      <div className="bg-background w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl border border-foreground/10 max-h-[95vh] overflow-y-auto">
        <div className="sticky top-0 bg-background z-10 flex items-center justify-between px-4 py-3 border-b border-foreground/10">
          <div className="flex items-center gap-2">
            <Wallet size={16} />
            <div className="font-display uppercase text-sm tracking-widest">Top-up portofel</div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-foreground/5 rounded-md">
            <X size={18} />
          </button>
        </div>

        {checkoutReady ? (
          <div className="p-2">
            <EmbeddedCheckoutProvider stripe={getStripe()} options={{ fetchClientSecret }}>
              <EmbeddedCheckout />
            </EmbeddedCheckoutProvider>
          </div>
        ) : (
          <div className="p-4 space-y-4">
            <div className="rounded-xl border border-neon-crimson/20 bg-neon-crimson/5 p-3">
              <div className="font-display uppercase text-lg">Adaugă bani pentru reclame</div>
              <p className="text-xs text-muted-foreground mt-1">Alegi suma, apeși plătește, apoi wallet-ul se actualizează automat.</p>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {PACKAGES.map((amt) => (
                <button key={amt} onClick={() => setAmount(amt)}
                  className={`px-3 py-4 rounded-xl border font-display text-lg transition ${amount === amt ? "border-neon-crimson bg-neon-crimson/10" : "border-foreground/15 text-muted-foreground hover:border-foreground/40"}`}>
                  {amt}<span className="block text-[10px] font-mono text-muted-foreground">{SYMBOL}</span>
                </button>
              ))}
            </div>
            <div className="text-[10px] text-muted-foreground space-y-0.5">
              <div>Metode acceptate: card, Revolut Pay, Apple Pay, Google Pay.</div>
              <div>Card test preview: 4242 4242 4242 4242</div>
            </div>
            {error && <div className="text-xs text-neon-crimson border border-neon-crimson/30 bg-neon-crimson/5 rounded-md px-3 py-2">{error}</div>}
            <button onClick={startCheckout} disabled={loading}
              className="w-full font-display uppercase text-sm tracking-widest py-3 rounded-xl text-white disabled:opacity-50"
              style={{ background: "var(--gradient-chaos)" }}>
              {loading ? "Se încarcă…" : `Plătește ${amount} ${SYMBOL}`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
