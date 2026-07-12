import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { ChevronLeft } from "lucide-react";
import { BirthdatePicker } from "@/components/BirthdatePicker";

function ageFromDOB(dob: string): number {
  const d = new Date(dob);
  if (isNaN(d.getTime())) return -1;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
  return age;
}

export const Route = createFileRoute("/onboarding")({
  head: () => ({ meta: [{ title: "Onboarding · OXIDAȚII" }] }),
  component: Onboarding,
});

type City = { id: string; name: string; slug: string };

function Onboarding() {
  const nav = useNavigate();
  const { user, profile, loading, refreshProfile, signOut } = useAuth();

  async function backOut() {
    // Escape onboarding cleanly: sign out then go to landing.
    try {
      await signOut();
    } catch { /* noop */ }
    nav({ to: "/", replace: true });
  }
  const [handle, setHandle] = useState("");
  const [cityId, setCityId] = useState("");
  const [locOk, setLocOk] = useState(false);
  const [refCode, setRefCode] = useState("");
  const [dob, setDob] = useState("");
  const [hasDob, setHasDob] = useState(false);
  const [cities, setCities] = useState<City[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    try {
      const pending = localStorage.getItem("pending_referral_code");
      if (pending) setRefCode(pending);
    } catch { /* noop */ }
  }, []);

  useEffect(() => {
    if (!loading && !user) nav({ to: "/login", replace: true });
    if (profile?.onboarded) nav({ to: "/app", replace: true });
  }, [user, profile, loading, nav]);

  useEffect(() => {
    supabase
      .from("cities")
      .select("id,name,slug")
      .order("name")
      .then(({ data }) => {
        if (data) setCities(data);
      });
    // Check if birthdate is already set (from prior signup) or pending in sessionStorage.
    (async () => {
      if (!user) return;
      try {
        const pending = sessionStorage.getItem("pending_birthdate");
        if (pending) {
          await supabase
            .from("profiles")
            .update({ birthdate: pending } as never)
            .eq("id", user.id);
          sessionStorage.removeItem("pending_birthdate");
          setHasDob(true);
          return;
        }
        const { data } = await supabase
          .from("profiles")
          .select("birthdate")
          .eq("id", user.id)
          .maybeSingle();
        setHasDob(!!(data as { birthdate?: string | null } | null)?.birthdate);
      } catch { /* noop */ }
    })();
  }, [user]);

  async function askLocation() {
    if (!("geolocation" in navigator)) return toast.error("Browser-ul tău n-are GPS");
    navigator.geolocation.getCurrentPosition(
      () => {
        setLocOk(true);
        toast.success("Locație activată");
      },
      () => toast.error("Locație refuzată"),
    );
  }

  async function save() {
    if (!user) return;
    if (!/^[a-z0-9_.]{3,24}$/.test(handle)) return toast.error("Handle: 3-24 chars, a-z 0-9 _ .");
    if (!cityId) return toast.error("Alege orașul");
    if (!hasDob) {
      if (!dob) return toast.error("Pune data nașterii");
      if (ageFromDOB(dob) < 18) return toast.error("Trebuie să ai cel puțin 18 ani.");
    }
    setBusy(true);
    const update: Record<string, unknown> = {
      handle,
      city_id: cityId,
      location_consent: locOk,
      onboarded: true,
    };
    if (!hasDob && dob) update.birthdate = dob;
    const { error } = await supabase
      .from("profiles")
      .update(update as never)
      .eq("id", user.id);
    setBusy(false);
    if (error) return toast.error(error.message);

    // Apply referral code if present
    if (refCode && refCode.length >= 4) {
      try {
        const { data: r } = await supabase.rpc("apply_referral_code", {
          _code: refCode.toUpperCase(),
        });
        const res = r as { ok: boolean; error?: string } | null;
        if (res?.ok) {
          toast.success("+50 șprițuri din invitație 🎉");
          try {
            localStorage.removeItem("pending_referral_code");
          } catch { /* noop */ }
        }
      } catch { /* noop */ }
    }

    await refreshProfile();
    nav({ to: "/app/map", replace: true });
  }

  return (
    <main className="min-h-screen bg-background text-foreground px-6 py-10">
      <div className="flex items-center justify-between mb-4">
        <Link
          to="/signup"
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
      <div className="max-w-sm mx-auto space-y-6">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-neon-green mb-2">
            // PASUL 1
          </div>
          <h1 className="font-display font-black text-3xl">Cum te știe orașul?</h1>
        </div>

        <div>
          <label className="text-xs uppercase tracking-widest text-muted-foreground font-mono">
            @handle
          </label>
          <input
            value={handle}
            onChange={(e) => setHandle(e.target.value.toLowerCase().trim())}
            placeholder="vladtepes_3am"
            className="mt-2 w-full rounded-xl bg-foreground/5 border border-foreground/10 px-4 py-3 text-sm"
          />
        </div>

        <div>
          <label className="text-xs uppercase tracking-widest text-muted-foreground font-mono">
            Orașul tău
          </label>
          <select
            value={cityId}
            onChange={(e) => setCityId(e.target.value)}
            className="mt-2 w-full rounded-xl bg-foreground/5 border border-foreground/10 px-4 py-3 text-sm"
          >
            <option value="">-- alege --</option>
            {cities.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {!hasDob && (
          <div>
            <label className="text-xs uppercase tracking-widest text-muted-foreground font-mono">
              Data nașterii{" "}
              <span className="text-foreground/40 normal-case tracking-normal">(18+)</span>
            </label>
            <div className="mt-2">
              <BirthdatePicker value={dob} onChange={setDob} />
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">
              Aplicația e doar pentru +18. Vârsta e verificată.
            </p>
          </div>
        )}

        <div className="rounded-xl border border-foreground/10 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium text-sm">Locație live</div>
              <div className="text-xs text-muted-foreground">
                Pentru check-in & "ești la 200m de…". Opțional.
              </div>
            </div>
            <button
              onClick={askLocation}
              className={`text-xs px-3 py-1.5 rounded-md border ${locOk ? "bg-neon-green/20 text-neon-green border-neon-green/40" : "border-foreground/20 text-foreground"}`}
            >
              {locOk ? "✓ Permis" : "Permite"}
            </button>
          </div>
        </div>

        <div>
          <label className="text-xs uppercase tracking-widest text-muted-foreground font-mono">
            Cod invitație{" "}
            <span className="text-foreground/40 normal-case tracking-normal">
              (opțional · +50 șprițuri)
            </span>
          </label>
          <input
            value={refCode}
            onChange={(e) => setRefCode(e.target.value.toUpperCase().trim())}
            placeholder="ABC1234"
            maxLength={12}
            className="mt-2 w-full rounded-xl bg-foreground/5 border border-foreground/10 px-4 py-3 text-sm font-mono tracking-widest"
          />
        </div>

        <button
          disabled={busy}
          onClick={save}
          className="w-full rounded-xl bg-neon-crimson/20 border border-neon-crimson/40 text-neon-crimson font-display font-bold tracking-widest uppercase py-3"
        >
          {busy ? "..." : "Intră în haos"}
        </button>
      </div>
    </main>
  );
}
