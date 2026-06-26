import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { ChevronLeft } from "lucide-react";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Login · OXIDAȚII" }] }),
  component: LoginPage,
});

function LoginPage() {
  const nav = useNavigate();
  const { user, profile, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [pwd, setPwd] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    // Wait until we have BOTH the user and a profile fetch result before navigating.
    // Otherwise we send already-onboarded users to /onboarding (profile still null).
    if (loading || !user) return;
    if (profile) {
      nav({ to: profile.onboarded ? "/app/map" : "/onboarding", replace: true });
    } else {
      // No profile row (rare — trigger should have created one). Send to onboarding to recover.
      nav({ to: "/onboarding", replace: true });
    }
  }, [user, profile, loading, nav]);

  async function handleEmail(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password: pwd });
    if (error) {
      setBusy(false);
      toast.error(error.message);
      return;
    }
    // Leave busy=true; the effect above will navigate once profile is loaded.
  }

  async function handleGoogle() {
    setBusy(true);
    const r = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin + "/login",
    });
    if (r.error) {
      toast.error(r.error.message ?? "Google login a picat");
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen flex flex-col bg-background text-foreground px-6 py-10">
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
      <div className="flex-1 flex items-center">
        <div className="w-full max-w-sm mx-auto space-y-6">
          <div>
            <h1 className="font-display font-black text-3xl">Intră în haos.</h1>
            <p className="text-sm text-muted-foreground mt-1">Ai cont? Bun venit înapoi.</p>
          </div>

          <button
            disabled={busy}
            onClick={handleGoogle}
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

          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <div className="flex-1 h-px bg-foreground/10" /> sau cu email{" "}
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
              placeholder="parolă"
              value={pwd}
              onChange={(e) => setPwd(e.target.value)}
              className="w-full rounded-xl bg-foreground/5 border border-foreground/10 px-4 py-3 text-sm focus:outline-none focus:border-neon-purple"
            />
            <button
              disabled={busy}
              className="w-full rounded-xl bg-neon-crimson/20 border border-neon-crimson/40 text-neon-crimson font-display font-bold tracking-widest uppercase py-3"
            >
              {busy ? "..." : "Intră"}
            </button>
          </form>

          <p className="text-center text-xs">
            <Link to="/forgot-password" className="text-muted-foreground hover:text-foreground">
              Ți-ai uitat parola?
            </Link>
          </p>

          <p className="text-center text-sm text-muted-foreground">
            N-ai cont?{" "}
            <Link to="/signup" className="text-neon-purple font-medium">
              Fă-ți unul
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
