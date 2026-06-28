import { useState } from "react";
import { Coins, Gift, Loader2 } from "lucide-react";
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
  DialogFooter,
} from "@/components/ui/dialog";

const PRESETS = [10, 25, 50, 100, 250, 500];

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
  const [amount, setAmount] = useState<number>(25);
  const [msg, setMsg] = useState("");
  const [sending, setSending] = useState(false);

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

  async function send() {
    if (!user) return;
    if (amount < 5) {
      toast.error("Minim 5 șprițuri.");
      return;
    }
    if ((myBalance ?? 0) < amount) {
      toast.error("Nu ai destule șprițuri. Cumpără din /app/shop.");
      return;
    }
    setSending(true);
    const { data, error } = await supabase.rpc("tip_creator", {
      p_recipient_id: recipientId,
      p_amount: amount,
      p_message: msg.trim() || null,
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
    toast.success(`🍹 ${amount} șprițuri trimise${recipientName ? ` lui ${recipientName}` : ""}!`);
    setOpen(false);
    setMsg("");
    qc.invalidateQueries({ queryKey: ["my-coin-balance"] });
    qc.invalidateQueries({ queryKey: ["creator-earnings", recipientId] });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          className="px-4 py-3 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 text-background font-display font-black flex items-center justify-center gap-1.5 active:scale-[0.98] transition shadow-lg shadow-amber-500/20"
          aria-label="Trimite tip"
        >
          <Gift size={16} strokeWidth={2.6} />
          <span className="text-xs uppercase tracking-wider">Tip</span>
        </button>
      </DialogTrigger>
      <DialogContent className="bg-zinc-950 border-white/10 max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-display uppercase text-xl flex items-center gap-2">
            <Gift className="text-amber-400" size={20} />
            Trimite tip
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-xs text-zinc-400">
            Susține {recipientName ?? "creatorul"} cu șprițuri direct în portofelul lor.
          </p>

          <div className="grid grid-cols-3 gap-2">
            {PRESETS.map((v) => (
              <button
                key={v}
                onClick={() => setAmount(v)}
                className={`py-2.5 rounded-xl font-display text-sm border transition ${
                  amount === v
                    ? "bg-amber-500/20 border-amber-400 text-amber-200"
                    : "bg-zinc-900 border-white/10 text-zinc-300 hover:border-white/30"
                }`}
              >
                {v}
              </button>
            ))}
          </div>

          <input
            type="number"
            min={5}
            max={5000}
            value={amount}
            onChange={(e) => setAmount(Math.max(5, Math.min(5000, Number(e.target.value) || 0)))}
            className="w-full px-3 py-2.5 rounded-xl bg-zinc-900 border border-white/10 text-sm focus:outline-none focus:border-amber-400/50"
          />

          <textarea
            value={msg}
            onChange={(e) => setMsg(e.target.value.slice(0, 140))}
            placeholder="Mesaj (opțional)..."
            rows={2}
            className="w-full px-3 py-2.5 rounded-xl bg-zinc-900 border border-white/10 text-sm focus:outline-none focus:border-amber-400/50 resize-none"
          />

          <div className="flex items-center justify-between text-[11px] text-zinc-500">
            <span className="flex items-center gap-1">
              <Coins size={12} className="text-amber-400" />
              Soldul tău: {myBalance ?? "..."}
            </span>
            <span>{msg.length}/140</span>
          </div>
        </div>

        <DialogFooter>
          <button
            onClick={() => setOpen(false)}
            className="px-4 py-2.5 rounded-xl bg-zinc-800 text-zinc-300 font-display text-sm uppercase tracking-wider"
          >
            Anulează
          </button>
          <button
            onClick={send}
            disabled={sending || amount < 5}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 text-background font-display text-sm uppercase tracking-wider font-black flex items-center gap-2 disabled:opacity-50"
          >
            {sending ? <Loader2 size={14} className="animate-spin" /> : <Gift size={14} />}
            Trimite {amount}
          </button>
        </DialogFooter>
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
      return (data as { total: number; count: number; last_30d: number } | null) ?? null;
    },
  });
  if (!data || !data.total) return null;
  return (
    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-400/30 text-amber-300">
      <Gift size={11} />
      <span className="font-mono text-[10px] uppercase tracking-widest">
        {data.total} șprițuri tip · {data.count} fani
      </span>
    </div>
  );
}
