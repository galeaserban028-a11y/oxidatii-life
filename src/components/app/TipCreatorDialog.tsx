import { useEffect, useRef, useState } from "react";
import { AlertCircle, Coins, Gift, Loader2, RefreshCw, Sparkles, TrendingUp, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { errorMessage } from "@/lib/errors";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const PRESETS = [10, 25, 50, 100, 250, 500];
const LAST_AMOUNT_KEY = "oxi:tip:last-amount";
const MIN_TIP = 5;
const MAX_TIP = 5000;

type Earnings = { total: number; count: number; last_30d: number };

function parseAmount(raw: string): number | null {
  if (!raw || !raw.trim()) return null;
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.floor(n);
}

function mapError(message: string): string {
  if (!message) return "Eroare necunoscută. Reîncearcă.";
  if (message.includes("insufficient_funds")) return "Sold insuficient.";
  if (message.includes("cannot_tip_self")) return "Nu poți să-ți dai tip ție.";
  if (message.includes("min_tip_")) return `Minim ${MIN_TIP} șprițuri.`;
  if (message.includes("max_tip_")) return `Maxim ${MAX_TIP} șprițuri.`;
  if (message.toLowerCase().includes("network") || message.toLowerCase().includes("fetch"))
    return "Probleme de rețea. Reîncearcă.";
  return message.slice(0, 140);
}

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
  const [amountStr, setAmountStr] = useState<string>(() => {
    if (typeof window === "undefined") return "25";
    const v = Number(localStorage.getItem(LAST_AMOUNT_KEY));
    return v >= MIN_TIP && v <= MAX_TIP ? String(v) : "25";
  });
  const [msg, setMsg] = useState("");
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const inFlight = useRef(false);

  const isSelf = !!user && user.id === recipientId;
  const validRecipient = !!recipientId && recipientId.length > 0;

  const {
    data: myBalance,
    isLoading: balanceLoading,
    isError: balanceError,
    refetch: refetchBalance,
  } = useQuery({
    queryKey: ["my-coin-balance", user?.id],
    enabled: !!user && open,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_my_account_state");
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      return (row?.coin_balance as number | undefined) ?? 0;
    },

  });

  const { data: earnings } = useQuery({
    queryKey: ["creator-earnings", recipientId],
    enabled: open && validRecipient,
    queryFn: async () => {
      const { data } = await supabase.rpc("get_creator_earnings", { p_user_id: recipientId });
      return (data as Earnings | null) ?? null;
    },
  });

  // Reset state when reopened
  useEffect(() => {
    if (open) {
      setSuccess(false);
      setErrorMsg(null);
    }
  }, [open]);

  const parsed = parseAmount(amountStr);
  const amountInvalid = parsed === null || parsed < MIN_TIP || parsed > MAX_TIP;
  const balanceKnown = !balanceLoading && !balanceError && typeof myBalance === "number";
  const insufficient = balanceKnown && parsed !== null && myBalance! < parsed;
  const canSend =
    !!user &&
    validRecipient &&
    !isSelf &&
    !amountInvalid &&
    balanceKnown &&
    !insufficient &&
    !sending;

  async function send() {
    if (inFlight.current) return; // hard guard against double-click
    setErrorMsg(null);

    if (!user) {
      setErrorMsg("Trebuie să fii autentificat.");
      return;
    }
    if (!validRecipient) {
      setErrorMsg("Destinatar invalid.");
      return;
    }
    if (isSelf) {
      setErrorMsg("Nu poți să-ți dai tip ție.");
      return;
    }
    if (parsed === null) {
      setErrorMsg("Introdu o sumă validă.");
      return;
    }
    if (parsed < MIN_TIP) {
      setErrorMsg(`Minim ${MIN_TIP} șprițuri.`);
      return;
    }
    if (parsed > MAX_TIP) {
      setErrorMsg(`Maxim ${MAX_TIP} șprițuri.`);
      return;
    }
    if (!balanceKnown) {
      setErrorMsg("Soldul nu s-a încărcat. Reîncearcă.");
      return;
    }
    if (insufficient) {
      setErrorMsg("Sold insuficient. Cumpără din /app/shop.");
      return;
    }

    inFlight.current = true;
    setSending(true);
    try {
      const { error } = await supabase.rpc("tip_creator", {
        p_recipient_id: recipientId,
        p_amount: parsed,
        p_message: msg.trim() || undefined,
      });

      if (error) {
        const m = mapError(error.message);
        setErrorMsg(m);
        toast.error(m);
        return;
      }

      try { localStorage.setItem(LAST_AMOUNT_KEY, String(parsed)); } catch {}
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
    } catch (e) {
      const m = mapError(errorMessage(e, ""));
      setErrorMsg(m);
      toast.error(m);
    } finally {
      inFlight.current = false;
      setSending(false);
    }
  }

  if (isSelf) return null; // hide button on own profile

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!sending) setOpen(v); }}>
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
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-72 h-72 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />

        {success ? (
          <div className="relative px-6 py-12 text-center space-y-3 animate-in fade-in zoom-in-95 duration-300">
            <div className="mx-auto size-20 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-[0_0_40px_rgba(245,158,11,0.6)]">
              <Check className="text-background" size={40} strokeWidth={3} />
            </div>
            <div className="font-display uppercase text-xl">Trimis!</div>
            <p className="text-sm text-zinc-400">
              <span className="text-amber-300 font-bold">{parsed} șprițuri</span> au ajuns la{" "}
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

              <div className="grid grid-cols-3 gap-2">
                {PRESETS.map((v) => (
                  <button
                    key={v}
                    onClick={() => { setAmountStr(String(v)); setErrorMsg(null); }}
                    disabled={sending}
                    className={`py-3 rounded-xl font-display font-bold text-sm border transition relative overflow-hidden disabled:opacity-50 ${
                      parsed === v
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
                  inputMode="numeric"
                  min={MIN_TIP}
                  max={MAX_TIP}
                  value={amountStr}
                  disabled={sending}
                  onChange={(e) => {
                    // Allow empty + raw typing; validate on send. Strip non-numerics.
                    const clean = e.target.value.replace(/[^\d]/g, "");
                    setAmountStr(clean);
                    setErrorMsg(null);
                  }}
                  onBlur={() => {
                    // Normalize obvious overflow on blur for UX.
                    const p = parseAmount(amountStr);
                    if (p !== null && p > MAX_TIP) setAmountStr(String(MAX_TIP));
                  }}
                  placeholder={`${MIN_TIP}–${MAX_TIP}`}
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-zinc-900/60 border border-white/10 text-sm focus:outline-none focus:border-amber-400/60 font-mono"
                />
              </div>

              <textarea
                value={msg}
                onChange={(e) => setMsg(e.target.value.slice(0, 140))}
                disabled={sending}
                placeholder="Mesaj scurt (opțional)..."
                rows={2}
                className="w-full px-3 py-2.5 rounded-xl bg-zinc-900/60 border border-white/10 text-sm focus:outline-none focus:border-amber-400/60 resize-none placeholder:text-zinc-600"
              />

              <div className="flex items-center justify-between text-[11px]">
                <span
                  className={`flex items-center gap-1 ${
                    insufficient
                      ? "text-red-400"
                      : balanceError
                        ? "text-amber-400"
                        : "text-zinc-500"
                  }`}
                >
                  <Coins size={12} className={insufficient ? "text-red-400" : "text-amber-400"} />
                  {balanceLoading ? (
                    <>Sold: <Loader2 size={10} className="inline animate-spin ml-1" /></>
                  ) : balanceError ? (
                    <>
                      Sold indisponibil
                      <button
                        type="button"
                        onClick={() => refetchBalance()}
                        className="ml-1 underline decoration-dotted"
                      >
                        reîncearcă
                      </button>
                    </>
                  ) : (
                    <>
                      Sold: {myBalance}
                      {insufficient && " · insuficient"}
                    </>
                  )}
                </span>
                <span className="text-zinc-500">{msg.length}/140</span>
              </div>

              {errorMsg && (
                <div className="flex items-start gap-2 px-3 py-2 rounded-xl bg-red-500/10 border border-red-400/30 text-red-200 text-[11px]">
                  <AlertCircle size={14} className="text-red-400 shrink-0 mt-px" />
                  <div className="flex-1">{errorMsg}</div>
                  <button
                    type="button"
                    onClick={() => { setErrorMsg(null); send(); }}
                    disabled={sending || amountInvalid || insufficient}
                    className="inline-flex items-center gap-1 text-red-100 underline decoration-dotted disabled:opacity-40"
                  >
                    <RefreshCw size={11} /> retry
                  </button>
                </div>
              )}

              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => setOpen(false)}
                  disabled={sending}
                  className="px-4 py-3 rounded-xl bg-zinc-900 border border-white/5 text-zinc-300 font-display text-xs uppercase tracking-wider disabled:opacity-50"
                >
                  Anulează
                </button>
                <button
                  onClick={send}
                  disabled={!canSend}
                  aria-busy={sending}
                  className="flex-1 px-4 py-3 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 text-background font-display text-sm uppercase tracking-wider font-black flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_8px_24px_-8px_rgba(245,158,11,0.5)] active:scale-[0.98] transition"
                >
                  {sending ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Gift size={14} strokeWidth={2.6} />
                  )}
                  {sending ? "Trimite..." : `Trimite ${parsed ?? "—"}`}
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
