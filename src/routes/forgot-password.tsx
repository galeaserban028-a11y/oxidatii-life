import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ChevronLeft } from "lucide-react";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({ meta: [{ title: "Recuperare parolă · OXIDAȚII" }] }),
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + "/reset-password",
    });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setSent(true);
    toast.success("Ți-am trimis link-ul pe email.");
  }

  return (
    <main
      className="min-h-[100dvh] flex flex-col bg-background text-foreground px-5 sm:px-6"
      style={{
        paddingTop: "calc(env(safe-area-inset-top, 0px) + 1.25rem)",
        paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 1.5rem)",
      }}
    >
      <div className="flex items-center justify-between mb-6">
        <Link
          to="/login"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition"
        >
          <ChevronLeft size={16} /> înapoi
        </Link>
        <Link
          to="/"
          className="font-display font-black text-lg sm:text-xl tracking-widest text-gradient-chaos"
        >
          OXIDAȚII
        </Link>
      </div>
      <div className="flex-1 flex items-start sm:items-center pt-4 sm:pt-0">

        <div className="w-full max-w-sm mx-auto space-y-6">
          <div>
            <h1 className="font-display font-black text-3xl">Mi-am uitat parola.</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Pune email-ul, îți trimitem un link de resetare.
            </p>
          </div>

          {sent ? (
            <div className="rounded-xl border border-neon-green/40 bg-neon-green/10 p-4 space-y-2">
              <div className="font-display text-neon-green">Verifică inbox-ul.</div>
              <p className="text-xs text-muted-foreground">
                Dacă există cont pe <b>{email}</b>, ți-am trimis un link de resetare. Verifică și
                folderul de spam.
              </p>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-3">
              <input
                type="email"
                required
                placeholder="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl bg-foreground/5 border border-foreground/10 px-4 py-3 text-sm focus:outline-none focus:border-neon-purple"
              />
              <button
                disabled={busy}
                className="w-full rounded-xl bg-neon-crimson/20 border border-neon-crimson/40 text-neon-crimson font-display font-bold tracking-widest uppercase py-3"
              >
                {busy ? "..." : "Trimite link"}
              </button>
            </form>
          )}

          <p className="text-center text-sm text-muted-foreground">
            Ți-ai amintit?{" "}
            <Link to="/login" className="text-neon-purple font-medium">
              Login
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
