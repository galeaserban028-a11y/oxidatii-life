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
  const [errMsg, setErrMsg] = useState<string | null>(null);
  const [pwd, setPwd] = useState("");
  const [pwd2, setPwd2] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const url = new URL(window.location.href);
    const hash = window.location.hash || "";
    const code = url.searchParams.get("code");
    const errorDesc =
      url.searchParams.get("error_description") ||
      new URLSearchParams(hash.replace(/^#/, "")).get("error_description");

    if (errorDesc) {
      setErrMsg(decodeURIComponent(errorDesc));
      return;
    }

    const { data: sub } = supabase.auth.onAuthStateChange((evt) => {
      if (evt === "PASSWORD_RECOVERY" || evt === "SIGNED_IN" || evt === "USER_UPDATED") {
        setReady(true);
      }
    });

    (async () => {
      // PKCE flow: ?code=... → exchange for a session
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          setErrMsg(error.message);
          return;
        }
        window.history.replaceState({}, "", url.pathname);
        setReady(true);
        return;
      }
      // Hash flow: #access_token=...&type=recovery
      if (hash.includes("access_token") || hash.includes("type=recovery")) {
        setReady(true);
        return;
      }
      const { data } = await supabase.auth.getSession();
      if (data.session) setReady(true);
    })();

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

          {errMsg ? (
            <div className="rounded-xl border border-neon-crimson/40 bg-neon-crimson/10 p-4 text-sm space-y-2">
              <div className="font-display text-neon-crimson">Link invalid sau expirat.</div>
              <p className="text-xs text-muted-foreground break-words">{errMsg}</p>
              <Link to="/forgot-password" className="text-neon-purple text-xs underline">
                Cere alt link
              </Link>
            </div>
          ) : !ready ? (
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
