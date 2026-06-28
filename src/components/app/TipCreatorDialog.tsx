import { useEffect, useState } from "react";
import { Coins, Gift, Loader2, Sparkles, TrendingUp, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const PRESETS = [10, 25, 50, 100, 250, 500];
const LAST_AMOUNT_KEY = "oxi:tip:last-amount";

type Earnings = { total: number; count: number; last_30d: number };

export function TipCreatorButton({
  recipientId,
  recipientName,
}: {
  recipientId: string;
  recipientName?: string | null;
}) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState<number>(() => {
    if (typeof window === "undefined") return 25;
    const v = Number(localStorage.getItem(LAST_AMOUNT_KEY));
    return v >= 5 && v <= 5000 ? v : 25;
  });
  const [msg, setMsg] = useState("");
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState(false);

  const { data: myBalance } = useQuery({
    queryKey: ["my-coin-balance", user?.id],
    enabled: !!user && open,
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("coin_balance")
        .eq("id", user!.id)
        .maybeSingle();
      return (data?.coin_balance as number | undefined) ?? 0;
    },
  });

  const { data: earnings } = useQuery({
    queryKey: ["creator-earnings", recipientId],
    enabled: open,
    queryFn: async () => {
      const { data } = await supabase.rpc("get_creator_earnings", { p_user_id: recipientId });
      return (data as Earnings | null) ?? null;
    },
  });

  // Reset success state when reopened
  useEffect(() => {
    if (open) setSuccess(false);
  }, [open]);

  const insufficient = (myBalance ?? 0) < amount;

  async function send() {
    if (!user) return;
    if (amount < 5) return toast.error("Minim 5 șprițuri.");
    if (insufficient) return toast.error("Nu ai destule șprițuri. Cumpără din /app/shop.");

    setSending(true);
    const { error } = await supabase.rpc("tip_creator", {
      p_recipient_id: recipientId,
      p_amount: amount,
      p_message: msg.trim() || undefined,
    });
    setSending(false);

    if (error) {
      const m = error.message.includes("insufficient_funds")
        ? "Sold insuficient."
        : error.message.includes("cannot_tip_self")
          ? "Nu poți să-ți dai tip ție."
          : error.message.includes("min_tip_5")
            ? "Minim 5 șprițuri."
            : error.message;
      toast.error(m);
      return;
    }

    try { localStorage.setItem(LAST_AMOUNT_KEY, String(amount)); } catch {}
    import("@/lib/native").then(({ haptic }) => haptic?.("medium")).catch(() => {});
    setSuccess(true);
    setTimeout(() => {
      setOpen(false);
      setMsg("");
      setSuccess(false);
    }, 1600);

    qc.invalidateQueries({ queryKey: ["my-coin-balance"] });
    qc.invalidateQueries({ queryKey: ["creator-earnings", recipientId] });
    qc.invalidateQueries({ queryKey: ["wallet-ledger"] });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          className="px-4 py-3 rounded-xl bg-gradient-to-br from-amber-400 via-amber-500 to-orange-500 text-background font-display font-black flex items-center justify-center gap-1.5 active:scale-[0.97] transition shadow-[0_8px_24px_-8px_rgba(245,158,11,0.6)] hover:shadow-[0_12px_30px_-8px_rgba(245,158,11,0.8)]"
          aria-label="Trimite tip"
        >
          <Gift size={16} strokeWidth={2.6} />
          <span className="text-xs uppercase tracking-wider">Tip</span>
        </button>
      </DialogTrigger>

      <DialogContent className="bg-gradient-to-b from-zinc-950 to-black border-amber-500/20 max-w-sm overflow-hidden p-0">
        {/* Decorative glow */}
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-72 h-72 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />

        {success ? (
          <div className="relative px-6 py-12 text-center space-y-3 animate-in fade-in zoom-in-95 duration-300">
            <div className="mx-auto size-20 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-[0_0_40px_rgba(245,158,11,0.6)]">
              <Check className="text-background" size={40} strokeWidth={3} />
            </div>
            <div className="font-display uppercase text-xl">Trimis!</div>
            <p className="text-sm text-zinc-400">
              <span className="text-amber-300 font-bold">{amount} șprițuri</span> au ajuns la{" "}
              {recipientName ?? "creator"}.
            </p>
          </div>
        ) : (
          <div className="relative p-5">
            <DialogHeader className="mb-4">
              <DialogTitle className="font-display uppercase text-xl flex items-center gap-2">
                <Sparkles className="text-amber-400" size={18} />
                Susține {recipientName ?? "creatorul"}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              {/* Social proof — recipient earnings */}
              {earnings && earnings.total > 0 && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-500/5 border border-amber-400/20">
                  <TrendingUp size={14} className="text-amber-400 shrink-0" />
                  <div className="text-[11px] text-amber-200/90 leading-tight">
                    <span className="font-bold text-amber-300">{earnings.total}</span> șprițuri primite ·{" "}
                    <span className="font-bold text-amber-300">{earnings.count}</span> fani
                    {earnings.last_30d > 0 && (
                      <> · <span className="text-emerald-300 font-bold">+{earnings.last_30d}</span> luna asta</>
                    )}
                  </div>
                </div>
              )}

              {/* Amount selector */}
              <div className="grid grid-cols-3 gap-2">
                {PRESETS.map((v) => (
                  <button
                    key={v}
                    onClick={() => setAmount(v)}
                    className={`py-3 rounded-xl font-display font-bold text-sm border transition relative overflow-hidden ${
                      amount === v
                        ? "bg-gradient-to-br from-amber-500/30 to-orange-500/20 border-amber-400 text-amber-100 shadow-[0_0_20px_rgba(245,158,11,0.25)]"
                        : "bg-zinc-900/60 border-white/10 text-zinc-400 hover:border-white/25 hover:text-zinc-200"
                    }`}
                  >
                    {v}
                  </button>
                ))}
              </div>

              <div className="relative">
                <Coins size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-amber-400" />
                <input
                  type="number"
                  min={5}
                  max={5000}
                  value={amount}
                  onChange={(e) =>
                    setAmount(Math.max(5, Math.min(5000, Number(e.target.value) || 0)))
                  }
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-zinc-900/60 border border-white/10 text-sm focus:outline-none focus:border-amber-400/60 font-mono"
                />
              </div>

              <textarea
                value={msg}
                onChange={(e) => setMsg(e.target.value.slice(0, 140))}
                placeholder="Mesaj scurt (opțional)..."
                rows={2}
                className="w-full px-3 py-2.5 rounded-xl bg-zinc-900/60 border border-white/10 text-sm focus:outline-none focus:border-amber-400/60 resize-none placeholder:text-zinc-600"
              />

              <div className="flex items-center justify-between text-[11px]">
                <span
                  className={`flex items-center gap-1 ${
                    insufficient ? "text-red-400" : "text-zinc-500"
                  }`}
                >
                  <Coins size={12} className={insufficient ? "text-red-400" : "text-amber-400"} />
                  Sold: {myBalance ?? "..."}
                  {insufficient && " · insuficient"}
                </span>
                <span className="text-zinc-500">{msg.length}/140</span>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => setOpen(false)}
                  className="px-4 py-3 rounded-xl bg-zinc-900 border border-white/5 text-zinc-300 font-display text-xs uppercase tracking-wider"
                >
                  Anulează
                </button>
                <button
                  onClick={send}
                  disabled={sending || amount < 5 || insufficient}
                  className="flex-1 px-4 py-3 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 text-background font-display text-sm uppercase tracking-wider font-black flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_8px_24px_-8px_rgba(245,158,11,0.5)] active:scale-[0.98] transition"
                >
                  {sending ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Gift size={14} strokeWidth={2.6} />
                  )}
                  Trimite {amount}
                </button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function CreatorEarningsBadge({ userId }: { userId: string }) {
  const { data } = useQuery({
    queryKey: ["creator-earnings", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data } = await supabase.rpc("get_creator_earnings", { p_user_id: userId });
      return (data as Earnings | null) ?? null;
    },
    staleTime: 60_000,
  });
  if (!data || !data.total) return null;
  const rising = data.last_30d > 0;
  return (
    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gradient-to-r from-amber-500/15 to-orange-500/10 border border-amber-400/30 text-amber-200">
      <Gift size={11} className="text-amber-300" />
      <span className="font-mono text-[10px] uppercase tracking-widest">
        {data.total} tip · {data.count} fani
      </span>
      {rising && (
        <span className="inline-flex items-center gap-0.5 pl-1.5 ml-0.5 border-l border-amber-400/30 text-emerald-300">
          <TrendingUp size={9} />
          <span className="font-mono text-[9px] tracking-wider">+{data.last_30d}</span>
        </span>
      )}
    </div>
  );
}
