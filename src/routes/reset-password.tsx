import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ChevronLeft } from "lucide-react";

export const Route = createFileRoute("/reset-password")({
  head: () => ({ meta: [{ title: "Setează parolă nouă · OXIDAȚII" }] }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const nav = useNavigate();
  const [ready, setReady] = useState(false);
  const [pwd, setPwd] = useState("");
  const [pwd2, setPwd2] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    // Supabase puts the recovery tokens in the URL hash; the client SDK
    // auto-exchanges them into a session via detectSessionInUrl.
    const hash = typeof window !== "undefined" ? window.location.hash : "";
    const isRecovery = hash.includes("type=recovery") || hash.includes("access_token");
    const { data: sub } = supabase.auth.onAuthStateChange((evt) => {
      if (evt === "PASSWORD_RECOVERY" || evt === "SIGNED_IN") setReady(true);
    });
    // Fallback: if a session already exists when we land here, we're ready
    supabase.auth.getSession().then(({ data }) => {
      if (data.session || isRecovery) setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (pwd.length < 6) return toast.error("Parolă min 6 caractere");
    if (pwd !== pwd2) return toast.error("Parolele nu se potrivesc");
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: pwd });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Parolă schimbată. Te ducem mai departe.");
    nav({ to: "/app", replace: true });
  }

  return (
    <main className="min-h-screen flex flex-col bg-background text-foreground px-6 py-10">
      <div className="flex items-center justify-between mb-4">
        <Link
          to="/login"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition"
        >
          <ChevronLeft size={16} /> login
        </Link>
        <Link
          to="/"
          className="font-display font-black text-xl tracking-widest text-gradient-chaos"
        >
          OXIDAȚII
        </Link>
      </div>
      <div className="flex-1 flex items-center">
        <div className="w-full max-w-sm mx-auto space-y-6">
          <div>
            <h1 className="font-display font-black text-3xl">Parolă nouă.</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Alege o parolă pe care să n-o uiți data viitoare.
            </p>
          </div>

          {!ready ? (
            <div className="rounded-xl border border-foreground/15 p-4 text-sm text-muted-foreground">
              Verificăm link-ul... Dacă rămâne așa, deschide din nou link-ul din email.
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-3">
              <input
                type="password"
                required
                minLength={6}
                placeholder="parolă nouă (min 6)"
                value={pwd}
                onChange={(e) => setPwd(e.target.value)}
                className="w-full rounded-xl bg-foreground/5 border border-foreground/10 px-4 py-3 text-sm focus:outline-none focus:border-neon-purple"
              />
              <input
                type="password"
                required
                minLength={6}
                placeholder="repetă parola"
                value={pwd2}
                onChange={(e) => setPwd2(e.target.value)}
                className="w-full rounded-xl bg-foreground/5 border border-foreground/10 px-4 py-3 text-sm focus:outline-none focus:border-neon-purple"
              />
              <button
                disabled={busy}
                className="w-full rounded-xl bg-neon-crimson/20 border border-neon-crimson/40 text-neon-crimson font-display font-bold tracking-widest uppercase py-3"
              >
                {busy ? "..." : "Salvează parola"}
              </button>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}
