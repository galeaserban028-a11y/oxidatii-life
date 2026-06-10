import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { Flag } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export type ReportTargetType =
  | "user"
  | "party"
  | "venue"
  | "proof"
  | "campaign"
  | "photo"
  | "message";

const REASONS: Array<{ id: string; label: string }> = [
  { id: "spam", label: "Spam / înșelătorie" },
  { id: "harassment", label: "Hărțuire / bullying" },
  { id: "hate", label: "Discurs de ură" },
  { id: "sexual", label: "Conținut sexual / minori" },
  { id: "violence", label: "Violență / amenințări" },
  { id: "underage", label: "Minor (sub 18)" },
  { id: "fake", label: "Cont fals / identitate" },
  { id: "other", label: "Altceva" },
];

type Props = {
  targetType: ReportTargetType;
  targetId: string;
  label?: string;
  /** Render as: 'icon' (small flag button) or 'menu-item' (full row) */
  variant?: "icon" | "menu-item" | "ghost";
  /** Used when you want to control the trigger yourself */
  children?: React.ReactNode;
  className?: string;
};

export function ReportDialog({
  targetType,
  targetId,
  label = "Raportează",
  variant = "icon",
  children,
  className,
}: Props) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!user) {
      toast.error("Trebuie să fii logat");
      return;
    }
    if (!reason) {
      toast.error("Alege un motiv");
      return;
    }
    setBusy(true);
    const { error } = await supabase.from("reports").insert({
      reporter_id: user.id,
      target_type: targetType,
      target_id: targetId,
      reason,
      details: details.trim().slice(0, 500) || null,
    });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Raport trimis. Mulțumim — verificăm.");
    setOpen(false);
    setReason("");
    setDetails("");
  }

  const trigger =
    children ??
    (variant === "menu-item" ? (
      <button
        type="button"
        className={
          className ??
          "w-full flex items-center gap-2 px-2 py-1.5 text-sm text-neon-crimson hover:bg-foreground/5 rounded"
        }
      >
        <Flag size={14} /> {label}
      </button>
    ) : variant === "ghost" ? (
      <button
        type="button"
        className={
          className ??
          "text-xs text-muted-foreground hover:text-neon-crimson flex items-center gap-1"
        }
      >
        <Flag size={12} /> {label}
      </button>
    ) : (
      <button
        type="button"
        aria-label={label}
        className={
          className ??
          "h-9 w-9 rounded-full bg-foreground/10 backdrop-blur flex items-center justify-center text-white/90 active:scale-95 transition"
        }
      >
        <Flag size={15} />
      </button>
    ));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Raportează</DialogTitle>
          <DialogDescription>
            Spune-ne ce nu-i ok. Echipa noastră verifică toate rapoartele.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            {REASONS.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => setReason(r.id)}
                className={`text-left text-xs px-3 py-2 rounded-lg border transition ${
                  reason === r.id
                    ? "border-neon-crimson bg-neon-crimson/10 text-neon-crimson"
                    : "border-foreground/15 hover:bg-foreground/5"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
          <textarea
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            placeholder="Detalii (opțional, max 500 caractere)"
            maxLength={500}
            rows={3}
            className="w-full rounded-lg bg-foreground/5 border border-foreground/10 px-3 py-2 text-sm focus:outline-none focus:border-neon-purple"
          />
        </div>
        <DialogFooter className="gap-2 sm:gap-2">
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="px-4 py-2 rounded-lg border border-foreground/15 text-sm"
          >
            Anulează
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={busy || !reason}
            className="px-4 py-2 rounded-lg bg-neon-crimson text-white text-sm font-medium disabled:opacity-50"
          >
            {busy ? "Trimit..." : "Trimite raport"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
