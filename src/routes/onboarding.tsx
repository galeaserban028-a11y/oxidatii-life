import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

export const Route = createFileRoute("/onboarding")({
  head: () => ({ meta: [{ title: "Onboarding · OXIDAȚII" }] }),
  component: Onboarding,
});

type City = { id: string; name: string; slug: string };

function Onboarding() {
  const nav = useNavigate();
  const { user, profile, loading, refreshProfile } = useAuth();
  const [handle, setHandle] = useState("");
  const [cityId, setCityId] = useState("");
  const [locOk, setLocOk] = useState(false);
  const [cities, setCities] = useState<City[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && !user) nav({ to: "/login", replace: true });
    if (profile?.onboarded) nav({ to: "/app/map", replace: true });
  }, [user, profile, loading, nav]);

  useEffect(() => {
    supabase.from("cities").select("id,name,slug").order("name").then(({ data }) => {
      if (data) setCities(data);
    });
  }, []);

  async function askLocation() {
    if (!("geolocation" in navigator)) return toast.error("Browser-ul tău n-are GPS");
    navigator.geolocation.getCurrentPosition(
      () => { setLocOk(true); toast.success("Locație activată"); },
      () => toast.error("Locație refuzată"),
    );
  }

  async function save() {
    if (!user) return;
    if (!/^[a-z0-9_\.]{3,24}$/.test(handle)) return toast.error("Handle: 3-24 chars, a-z 0-9 _ .");
    if (!cityId) return toast.error("Alege orașul");
    setBusy(true);
    const { error } = await supabase.from("profiles").update({
      handle, city_id: cityId, location_consent: locOk, onboarded: true,
    }).eq("id", user.id);
    setBusy(false);
    if (error) return toast.error(error.message);
    await refreshProfile();
    nav({ to: "/app/map", replace: true });
  }

  return (
    <main className="min-h-screen bg-background text-foreground px-6 py-10">
      <div className="max-w-sm mx-auto space-y-6">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-neon-green mb-2">// PASUL 1</div>
          <h1 className="font-display font-black text-3xl">Cum te știe orașul?</h1>
        </div>

        <div>
          <label className="text-xs uppercase tracking-widest text-muted-foreground font-mono">@handle</label>
          <input value={handle} onChange={e=>setHandle(e.target.value.toLowerCase().trim())}
            placeholder="vladtepes_3am"
            className="mt-2 w-full rounded-xl bg-foreground/5 border border-foreground/10 px-4 py-3 text-sm" />
        </div>

        <div>
          <label className="text-xs uppercase tracking-widest text-muted-foreground font-mono">Orașul tău</label>
          <select value={cityId} onChange={e=>setCityId(e.target.value)}
            className="mt-2 w-full rounded-xl bg-foreground/5 border border-foreground/10 px-4 py-3 text-sm">
            <option value="">-- alege --</option>
            {cities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        <div className="rounded-xl border border-foreground/10 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium text-sm">Locație live</div>
              <div className="text-xs text-muted-foreground">Pentru check-in & "ești la 200m de…". Opțional.</div>
            </div>
            <button onClick={askLocation}
              className={`text-xs px-3 py-1.5 rounded-md border ${locOk ? "bg-neon-green/20 text-neon-green border-neon-green/40" : "border-foreground/20 text-foreground"}`}>
              {locOk ? "✓ Permis" : "Permite"}
            </button>
          </div>
        </div>

        <button disabled={busy} onClick={save}
          className="w-full rounded-xl bg-neon-crimson/20 border border-neon-crimson/40 text-neon-crimson font-display font-bold tracking-widest uppercase py-3">
          {busy ? "..." : "Intră în haos"}
        </button>
      </div>
    </main>
  );
}
