import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { ChevronLeft } from "lucide-react";
import { NATIVE_OAUTH_FINISHED_EVENT } from "@/lib/native-oauth";

export const Route = createFileRoute("/signup")({
  head: () => ({ meta: [{ title: "Intră · OXIDAȚII" }] }),
  component: SignupPage,
});

function SignupPage() {
  const nav = useNavigate();
  const { user, profile, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [pwd, setPwd] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (loading || !user) return;
    if (profile) {
      nav({ to: profile.onboarded ? "/app/map" : "/onboarding", replace: true });
    } else {
      nav({ to: "/onboarding", replace: true });
    }
  }, [user, profile, loading, nav]);

  useEffect(() => {
    const onNativeOAuthFinished = (event: Event) => {
      setBusy(false);
      const error = (event as CustomEvent<{ error?: string | null }>).detail?.error;
      if (error) toast.error(error);
    };
    window.addEventListener(NATIVE_OAUTH_FINISHED_EVENT, onNativeOAuthFinished);
    return () =>
      window.removeEventListener(NATIVE_OAUTH_FINISHED_EVENT, onNativeOAuthFinished);
  }, []);

  async function handleEmail(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !pwd) return;
    setBusy(true);

    // Try login first — if account exists, just sign the user in.
    const signIn = await supabase.auth.signInWithPassword({ email, password: pwd });
    if (!signIn.error) {
      // Effect will navigate once profile loads.
      return;
    }

    const msg = (signIn.error.message || "").toLowerCase();
    const looksLikeNoAccount =
      msg.includes("invalid") || msg.includes("not found") || msg.includes("user");

    if (!looksLikeNoAccount) {
      setBusy(false);
      return toast.error(signIn.error.message);
    }

    // No account yet → create one. Birthdate is captured in onboarding.
    // Redirect the confirmation link to the public canonical domain so it
    // doesn't land on a Lovable preview subdomain behind the auth gate.
    const host = typeof window !== "undefined" ? window.location.hostname : "";
    const isPublic =
      host === "oxidatii.life" ||
      host === "www.oxidatii.life" ||
      host === "oxidatii-life.lovable.app";
    const origin = isPublic ? window.location.origin : "https://oxidatii.life";
    const { error } = await supabase.auth.signUp({
      email,
      password: pwd,
      options: { emailRedirectTo: origin },
    });
    if (error) {
      setBusy(false);
      // If the email exists but password was wrong, be explicit.
      if ((error.message || "").toLowerCase().includes("registered")) {
        return toast.error("Emailul e folosit deja. Verifică parola.");
      }
      return toast.error(error.message);
    }

    toast.success("Cont creat. Te logăm...");
    // Try to sign in immediately (works if email confirmations are off).
    const after = await supabase.auth.signInWithPassword({ email, password: pwd });
    if (after.error) {
      setBusy(false);
      toast.success("Ți-am trimis un email de confirmare. Verifică inbox-ul.");
    }
    // Otherwise the effect navigates once session lands.
  }

  async function handleOAuth(provider: "google" | "apple") {
    setBusy(true);
    // On Capacitor native we route Google/Apple through a Chrome Custom Tab
    // (Android) / SFSafariViewController (iOS) — Google refuses raw WebView.
    // Deep-link return is handled globally in src/lib/native.ts.
    const { isNative } = await import("@/lib/native");
    if (isNative()) {
      const { signInWithOAuthNative } = await import("@/lib/native-oauth");
      const nr = await signInWithOAuthNative(provider);
      if (nr.error) {
        toast.error(nr.error.message ?? `${provider} a picat`);
        setBusy(false);
      }
      // On success the Custom Tab is open; app resumes via appUrlOpen.
      return;
    }
    const r = await lovable.auth.signInWithOAuth(provider, {
      redirect_uri: window.location.origin,
    });
    if (r.error) {
      toast.error(r.error.message ?? `${provider} a picat`);
      setBusy(false);
    }
  }

  return (
    <main
      className="min-h-[100dvh] overflow-y-auto bg-background text-foreground px-6 py-6 pb-[calc(env(safe-area-inset-bottom)+1.5rem)]"
      style={{
        WebkitOverflowScrolling: "touch",
        overscrollBehaviorY: "contain",
        touchAction: "pan-y",
      }}
    >
      <div className="flex items-center justify-between mb-4">
        <Link
          to="/"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition"
        >
          <ChevronLeft size={16} /> înapoi
        </Link>
        <Link
          to="/"
          className="font-display font-black text-xl tracking-widest text-gradient-chaos"
        >
          OXIDAȚII
        </Link>
      </div>
      <div className="min-h-[calc(100dvh-6.5rem)] flex items-start sm:items-center py-4">
        <div className="w-full max-w-sm mx-auto space-y-6">
          <div>
            <h1 className="font-display font-black text-3xl">Intră în haos.</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Cont nou sau vechi — un singur pas. 18+.
            </p>
          </div>

          <button
            disabled={busy}
            onClick={() => handleOAuth("google")}
            className="w-full rounded-xl border border-foreground/20 bg-foreground/5 hover:bg-foreground/10 transition py-3 font-medium flex items-center justify-center gap-2"
          >
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.83z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"
              />
            </svg>
            Continuă cu Google
          </button>
          <button
            disabled={busy}
            onClick={() => handleOAuth("apple")}
            className="w-full rounded-xl bg-foreground text-background hover:opacity-90 transition py-3 font-medium flex items-center justify-center gap-2"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
            </svg>
            Continuă cu Apple
          </button>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <div className="flex-1 h-px bg-foreground/10" /> sau email{" "}
            <div className="flex-1 h-px bg-foreground/10" />
          </div>
          <form onSubmit={handleEmail} className="space-y-3">
            <input
              type="email"
              required
              placeholder="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl bg-foreground/5 border border-foreground/10 px-4 py-3 text-sm focus:outline-none focus:border-neon-purple"
            />
            <input
              type="password"
              required
              minLength={6}
              placeholder="parolă (min 6)"
              value={pwd}
              onChange={(e) => setPwd(e.target.value)}
              className="w-full rounded-xl bg-foreground/5 border border-foreground/10 px-4 py-3 text-sm focus:outline-none focus:border-neon-purple"
            />
            <button
              disabled={busy}
              className="w-full rounded-xl bg-neon-crimson/20 border border-neon-crimson/40 text-neon-crimson font-display font-bold tracking-widest uppercase py-3"
            >
              {busy ? "..." : "Continuă"}
            </button>
            <p className="text-center text-[11px] text-muted-foreground">
              Dacă ai deja cont, te logăm. Dacă nu, îți creăm unul.
            </p>
          </form>
          <p className="text-center text-xs">
            <Link to="/forgot-password" className="text-muted-foreground hover:text-foreground">
              Ți-ai uitat parola?
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
