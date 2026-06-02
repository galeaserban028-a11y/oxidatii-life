import { useEffect, useState } from "react";
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js";
import { getStripe, getStripeEnvironment } from "@/lib/stripe";
import { createWalletTopupCheckout } from "@/lib/wallet-topup.functions";
import { X, Wallet } from "lucide-react";

type Currency = "ron" | "eur";

const PACKAGES: Record<Currency, number[]> = {
  ron: [50, 100, 250, 500],
  eur: [10, 20, 50, 100],
};

const MIN: Record<Currency, number> = { ron: 50, eur: 10 };

async function detectCurrency(): Promise<Currency> {
  try {
    const res = await fetch("https://www.cloudflare.com/cdn-cgi/trace", { cache: "no-store" });
    const txt = await res.text();
    const m = txt.match(/loc=([A-Z]{2})/);
    if (m && m[1] === "RO") return "ron";
    if (m && m[1] !== "RO") return "eur";
  } catch {
    /* fallback below */
  }
  // Fallback: locale
  const lang = navigator.language?.toLowerCase() || "";
  return lang.startsWith("ro") ? "ron" : "eur";
}

export function WalletTopupDialog({
  businessId,
  open,
  onClose,
}: {
  businessId: string;
  open: boolean;
  onClose: () => void;
}) {
  const [currency, setCurrency] = useState<Currency | null>(null);
  const [amount, setAmount] = useState<number>(0);
  const [customStr, setCustomStr] = useState("");
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    detectCurrency().then((c) => {
      setCurrency(c);
      setAmount(PACKAGES[c][1]);
    });
  }, [open]);

  useEffect(() => {
    if (!open) {
      setClientSecret(null);
      setError(null);
      setAmount(0);
      setCustomStr("");
    }
  }, [open]);

  if (!open) return null;

  const symbol = currency === "ron" ? "RON" : "EUR";

  const startCheckout = async () => {
    if (!currency) return;
    const finalAmount = customStr ? parseFloat(customStr) : amount;
    if (!finalAmount || finalAmount < MIN[currency]) {
      setError(`Sumă minimă: ${MIN[currency]} ${symbol}`);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await createWalletTopupCheckout({
        data: {
          businessId,
          amount: finalAmount,
          currency,
          returnUrl: `${window.location.origin}/app/biz?topup=success&session_id={CHECKOUT_SESSION_ID}`,
          environment: getStripeEnvironment(),
        },
      });
      if ("error" in result) throw new Error(result.error);
      if (!result.clientSecret) throw new Error("Lipsește client secret");
      setClientSecret(result.clientSecret);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Eroare necunoscută");
    } finally {
      setLoading(false);
    }
  };

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

        {clientSecret ? (
          <div className="p-2">
            <EmbeddedCheckoutProvider stripe={getStripe()} options={{ clientSecret }}>
              <EmbeddedCheckout />
            </EmbeddedCheckoutProvider>
          </div>
        ) : (
          <div className="p-4 space-y-4">
            {!currency ? (
              <div className="text-center text-sm text-muted-foreground py-8">Detectez țara…</div>
            ) : (
              <>
                <div className="text-xs text-muted-foreground">
                  Plătești în <strong className="text-foreground">{symbol}</strong>{" "}
                  {currency === "ron" ? "(România)" : "(internațional)"}.
                </div>

                <div>
                  <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-2">
                    Alege pachet
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {PACKAGES[currency].map((amt) => (
                      <button
                        key={amt}
                        onClick={() => { setAmount(amt); setCustomStr(""); }}
                        className={`px-3 py-3 rounded-md border font-display text-lg transition ${
                          !customStr && amount === amt
                            ? "border-neon-crimson bg-neon-crimson/10"
                            : "border-foreground/15 hover:border-foreground/40"
                        }`}
                      >
                        {amt} <span className="text-xs text-muted-foreground">{symbol}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-1.5 block">
                    Sau sumă custom (min {MIN[currency]} {symbol})
                  </label>
                  <div className="flex items-center gap-2 border border-foreground/15 rounded-md px-3 py-2 focus-within:border-neon-crimson">
                    <input
                      type="number"
                      min={MIN[currency]}
                      step="1"
                      value={customStr}
                      onChange={(e) => setCustomStr(e.target.value)}
                      placeholder="0"
                      className="bg-transparent flex-1 outline-none font-display text-lg"
                    />
                    <span className="text-xs text-muted-foreground">{symbol}</span>
                  </div>
                </div>

                <div className="text-[10px] text-muted-foreground space-y-0.5">
                  <div>Metode acceptate: Card, Revolut Pay, Apple Pay, Google Pay, SEPA</div>
                  <div>Card de test sandbox: 4242 4242 4242 4242</div>
                </div>

                {error && (
                  <div className="text-xs text-neon-crimson border border-neon-crimson/30 bg-neon-crimson/5 rounded-md px-3 py-2">
                    {error}
                  </div>
                )}

                <button
                  onClick={startCheckout}
                  disabled={loading}
                  className="w-full font-display uppercase text-sm tracking-widest py-3 rounded-md text-white disabled:opacity-50"
                  style={{ background: "var(--gradient-chaos)" }}
                >
                  {loading ? "Se încarcă…" : `Plătește ${customStr || amount} ${symbol}`}
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
