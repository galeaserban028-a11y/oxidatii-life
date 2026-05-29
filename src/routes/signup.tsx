import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { ChevronLeft } from "lucide-react";

export const Route = createFileRoute("/signup")({
  head: () => ({ meta: [{ title: "Cont nou · OXIDAȚII" }] }),
  component: SignupPage,
});

function SignupPage() {
  const nav = useNavigate();
  const { user, profile, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [pwd, setPwd] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      nav({ to: profile?.onboarded ? "/app/map" : "/onboarding", replace: true });
    }
  }, [user, profile, loading, nav]);

  async function handleEmail(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signUp({
      email,
      password: pwd,
      options: { emailRedirectTo: window.location.origin + "/onboarding" },
    });
    setBusy(false);
    if (error) toast.error(error.message);
  }

  async function handleGoogle() {
    const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin + "/onboarding" });
    if (r.error) toast.error(r.error.message ?? "Google a picat");
  }

  return (
    <main className="min-h-screen flex flex-col bg-background text-foreground px-6 py-10">
      <Link to="/" className="font-display font-black text-xl tracking-widest text-gradient-chaos">OXIDAȚII</Link>
      <div className="flex-1 flex items-center">
        <div className="w-full max-w-sm mx-auto space-y-6">
          <div>
            <h1 className="font-display font-black text-3xl">Fă-ți cont.</h1>
            <p className="text-sm text-muted-foreground mt-1">Și intri în topul nopții.</p>
          </div>
          <button onClick={handleGoogle}
            className="w-full rounded-xl border border-foreground/20 bg-foreground/5 hover:bg-foreground/10 transition py-3 font-medium">
            Continuă cu Google
          </button>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <div className="flex-1 h-px bg-foreground/10" /> sau email <div className="flex-1 h-px bg-foreground/10" />
          </div>
          <form onSubmit={handleEmail} className="space-y-3">
            <input type="email" required placeholder="email" value={email} onChange={e=>setEmail(e.target.value)}
              className="w-full rounded-xl bg-foreground/5 border border-foreground/10 px-4 py-3 text-sm focus:outline-none focus:border-neon-purple" />
            <input type="password" required minLength={6} placeholder="parolă (min 6)" value={pwd} onChange={e=>setPwd(e.target.value)}
              className="w-full rounded-xl bg-foreground/5 border border-foreground/10 px-4 py-3 text-sm focus:outline-none focus:border-neon-purple" />
            <button disabled={busy} className="w-full rounded-xl bg-neon-crimson/20 border border-neon-crimson/40 text-neon-crimson font-display font-bold tracking-widest uppercase py-3">
              {busy ? "..." : "Fă cont"}
            </button>
          </form>
          <p className="text-center text-sm text-muted-foreground">
            Ai deja? <Link to="/login" className="text-neon-purple font-medium">Login</Link>
          </p>
        </div>
      </div>
    </main>
  );
}
