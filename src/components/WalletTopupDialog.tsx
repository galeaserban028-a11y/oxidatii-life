import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { X, Wallet } from "lucide-react";
import { toast } from "sonner";

const PACKAGES = [50, 100, 250];
const MIN_AMOUNT = 50;
const SYMBOL = "RON";

export function WalletTopupDialog({
  businessId,
  open,
  onClose,
  onSuccess,
}: {
  businessId: string;
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}) {
  const [amount, setAmount] = useState<number>(PACKAGES[0]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setError(null);
      setAmount(PACKAGES[0]);
    }
  }, [open]);

  const simulateTopup = async () => {
    if (!amount || amount < MIN_AMOUNT) {
      setError(`Sumă minimă: ${MIN_AMOUNT} ${SYMBOL}`);
      return;
    }
    if (!businessId) return;
    setLoading(true);
    setError(null);
    try {
      const { data: current, error: readError } = await supabase
        .from("business_accounts")
        .select("wallet_balance_cents")
        .eq("id", businessId)
        .single();

      if (readError) throw readError;

      const nextBalance = (current?.wallet_balance_cents ?? 0) + Math.round(amount * 100);
      const { error: updateError } = await supabase
        .from("business_accounts")
        .update({ wallet_balance_cents: nextBalance })
        .eq("id", businessId);

      if (updateError) throw updateError;

      toast.success(`Wallet încărcat cu ${amount} ${SYMBOL}`);
      onSuccess?.();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Eroare necunoscută");
    } finally {
      setLoading(false);
    }
  };

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

        <div className="p-4 space-y-4">
          <div className="rounded-xl border border-neon-green/20 bg-neon-green/5 p-3">
            <div className="font-display uppercase text-lg">Adaugă fonduri demo</div>
            <p className="text-xs text-muted-foreground mt-1">Top-up intern simulat: suma intră imediat în wallet și poate fi folosită pentru campanii.</p>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {PACKAGES.map((amt) => (
              <button key={amt} onClick={() => setAmount(amt)}
                className={`px-3 py-4 rounded-xl border font-display text-lg transition ${amount === amt ? "border-neon-green bg-neon-green/10 text-neon-green" : "border-foreground/15 text-muted-foreground hover:border-foreground/40"}`}>
                {amt}<span className="block text-[10px] font-mono text-muted-foreground">{SYMBOL}</span>
              </button>
            ))}
          </div>
          <div className="text-[10px] text-muted-foreground">
            Nu se procesează carduri reale. Actualizarea se face direct în wallet-ul business-ului.
          </div>
          {error && <div className="text-xs text-neon-crimson border border-neon-crimson/30 bg-neon-crimson/5 rounded-md px-3 py-2">{error}</div>}
          <button onClick={simulateTopup} disabled={loading}
            className="w-full font-display uppercase text-sm tracking-widest py-3 rounded-xl text-background disabled:opacity-50 bg-neon-green">
            {loading ? "Se adaugă…" : `Adaugă ${amount} ${SYMBOL}`}
          </button>
        </div>
      </div>
    </div>
  );
}
