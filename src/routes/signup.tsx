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

function ageFromDOB(dob: string): number {
  const d = new Date(dob);
  if (isNaN(d.getTime())) return -1;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
  return age;
}

function SignupPage() {
  const nav = useNavigate();
  const { user, profile, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [pwd, setPwd] = useState("");
  const [dob, setDob] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (loading || !user) return;
    if (profile) {
      nav({ to: profile.onboarded ? "/app/map" : "/onboarding", replace: true });
    } else {
      nav({ to: "/onboarding", replace: true });
    }
  }, [user, profile, loading, nav]);

  // Max date = 18 years ago today
  const maxDob = (() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 18);
    return d.toISOString().slice(0, 10);
  })();

  async function handleEmail(e: React.FormEvent) {
    e.preventDefault();
    if (!dob) return toast.error("Pune data nașterii");
    const age = ageFromDOB(dob);
    if (age < 18) return toast.error("Trebuie să ai cel puțin 18 ani.");

    setBusy(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password: pwd,
      options: {
        emailRedirectTo: window.location.origin,
        data: { birthdate: dob },
      },
    });
    if (error) {
      setBusy(false);
      return toast.error(error.message);
    }

    // Email-confirmation ON → no session is returned; show feedback instead of leaving the user stuck.
    if (!data.session) {
      setBusy(false);
      toast.success("Ți-am trimis un email de confirmare. Verifică inbox-ul (și spam-ul).");
      return;
    }

    // Session exists → safe to write to RLS-protected tables.
    if (data.user) {
      const { error: pErr } = await supabase
        .from("profiles")
        .update({ birthdate: dob } as any)
        .eq("id", data.user.id);
      if (pErr) console.warn("birthdate write failed:", pErr.message);
    }
    // Leave busy=true; the effect above will navigate once profile loads.
  }

  async function handleGoogle() {
    if (!dob) return toast.error("Pune data nașterii înainte de Google");
    const age = ageFromDOB(dob);
    if (age < 18) return toast.error("Trebuie să ai cel puțin 18 ani.");
    try {
      sessionStorage.setItem("pending_birthdate", dob);
    } catch {}
    const r = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin + "/onboarding",
    });
    if (r.error) toast.error(r.error.message ?? "Google a picat");
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
            <h1 className="font-display font-black text-3xl">Fă-ți cont.</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Și intri în topul nopții. Doar 18+.
            </p>
          </div>

          <div>
            <label className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
              data nașterii
            </label>
            <input
              type="date"
              required
              max={maxDob}
              value={dob}
              onChange={(e) => setDob(e.target.value)}
              className="mt-1 w-full rounded-xl bg-foreground/5 border border-foreground/10 px-4 py-3 text-sm focus:outline-none focus:border-neon-purple"
            />
            <p className="text-[10px] text-muted-foreground mt-1">
              Aplicația e doar pentru +18. Vârsta e verificată.
            </p>
          </div>

          <button
            onClick={handleGoogle}
            className="w-full rounded-xl border border-foreground/20 bg-foreground/5 hover:bg-foreground/10 transition py-3 font-medium"
          >
            Continuă cu Google
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
              {busy ? "..." : "Fă cont"}
            </button>
          </form>
          <p className="text-center text-sm text-muted-foreground">
            Ai deja?{" "}
            <Link to="/login" className="text-neon-purple font-medium">
              Login
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
