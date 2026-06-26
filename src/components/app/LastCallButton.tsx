import { useState } from "react";
import { Zap } from "lucide-react";
import { PremiumCheckoutDialog } from "@/components/PremiumCheckoutDialog";

/**
 * Sends an anonymous "Last Call" ping to a user — 2.99 RON per ping.
 * The target sees a notification but doesn't know who sent it
 * until they pay separately to reveal.
 */
export function LastCallButton({
  targetId,
  targetName,
}: {
  targetId: string;
  targetName?: string | null;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="px-3 py-3 rounded-xl bg-neon-violet text-white font-display font-black flex items-center justify-center active:scale-[0.98] transition shadow-[0_0_18px_rgba(199,36,255,0.4)]"
        aria-label="Last Call · ping anonim"
        title="Trimite un ping anonim diseară"
      >
        <Zap size={18} strokeWidth={2.6} />
      </button>
      <PremiumCheckoutDialog
        priceId={open ? "last_call_send" : null}
        title={`Last Call → ${targetName ?? "anonim"}`}
        open={open}
        onClose={() => setOpen(false)}
        extra={{ target_id: targetId }}
        returnUrl={`${typeof window !== "undefined" ? window.location.origin : ""}/app/user/${targetId}?lastcall=sent&session_id={CHECKOUT_SESSION_ID}`}
      />
    </>
  );
}
