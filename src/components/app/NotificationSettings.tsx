import { useEffect, useState } from "react";
import { Bell, BellOff, Smartphone, Loader2, Send } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { sendTestPush } from "@/lib/push-test.functions";
import {
  enablePush,
  disablePush,
  getPushState,
  getCurrentSubscription,
  platformBlocksPush,
} from "@/lib/push";

type Prefs = {
  new_party_in_city: boolean;
  party_join: boolean;
  friend_live: boolean;
  challenge: boolean;
};

const DEFAULT_PREFS: Prefs = {
  new_party_in_city: true,
  party_join: true,
  friend_live: true,
  challenge: true,
};

const PREF_LABELS: { key: keyof Prefs; label: string; hint: string }[] = [
  { key: "new_party_in_city", label: "Petrecere nouă în orașul tău", hint: "Cineva deschide un șpriț aproape" },
  { key: "party_join", label: "Cineva s-a alăturat petrecerii tale", hint: "Spot ocupat la party-ul tău" },
  { key: "friend_live", label: "Prieten live pe hartă", hint: "Un prieten a făcut check-in" },
  { key: "challenge", label: "Provocare nouă", hint: "Cineva te-a provocat la șpriț" },
];

export function NotificationSettings() {
  const { user } = useAuth();
  const [permission, setPermission] = useState<"granted" | "denied" | "default" | "unsupported">("default");
  const [subscribed, setSubscribed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [prefs, setPrefs] = useState<Prefs>(DEFAULT_PREFS);
  const [err, setErr] = useState<string | null>(null);
  const block = platformBlocksPush();

  useEffect(() => {
    (async () => {
      setPermission(await getPushState());
      setSubscribed(!!(await getCurrentSubscription()));
      if (user?.id) {
        const { data } = await supabase
          .from("notification_prefs")
          .select("new_party_in_city, party_join, friend_live, challenge")
          .eq("user_id", user.id)
          .maybeSingle();
        if (data) setPrefs(data as Prefs);
      }
    })();
  }, [user?.id]);

  async function toggleMaster() {
    setErr(null);
    setBusy(true);
    try {
      if (subscribed) {
        await disablePush();
        setSubscribed(false);
      } else {
        const res = await enablePush();
        if (!res.ok) setErr(res.reason);
        else {
          setSubscribed(true);
          setPermission("granted");
        }
      }
    } finally {
      setBusy(false);
    }
  }

  async function setPref(key: keyof Prefs, value: boolean) {
    if (!user?.id) return;
    const next = { ...prefs, [key]: value };
    setPrefs(next);
    await supabase.from("notification_prefs").upsert({ user_id: user.id, ...next }, { onConflict: "user_id" });
  }

  const runTest = useServerFn(sendTestPush);
  const [testMsg, setTestMsg] = useState<string | null>(null);
  async function sendTest() {
    setTestMsg(null);
    setBusy(true);
    try {
      const res = await runTest({});
      if (res.sent > 0) setTestMsg("Trimis! Verifică notificarea.");
      else setTestMsg("Niciun dispozitiv abonat. Activează push mai întâi.");
    } catch (e: any) {
      setTestMsg(e?.message ?? "Eroare la trimitere.");
    } finally {
      setBusy(false);
    }
  }

  if (!user) return null;

  return (
    <section className="rounded-2xl border border-foreground/10 bg-card overflow-hidden">
      <div className="p-4 flex items-start gap-3 border-b border-foreground/10">
        <div className="h-10 w-10 rounded-xl bg-foreground/5 flex items-center justify-center shrink-0">
          {subscribed ? <Bell size={18} className="text-sunset-orange" /> : <BellOff size={18} className="text-muted-foreground" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-display font-bold text-[15px]">Notificări push</div>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {block.blocked
              ? block.reason
              : subscribed
                ? "Le primești pe acest dispozitiv."
                : "Activează ca să fii anunțat în timp real."}
          </p>
        </div>
        <button
          onClick={toggleMaster}
          disabled={busy || block.blocked}
          className={`h-9 px-3 rounded-full text-[11px] font-display font-bold uppercase shrink-0 transition ${
            subscribed
              ? "bg-foreground/10 text-foreground"
              : "bg-sunset-orange text-background disabled:opacity-40"
          }`}
        >
          {busy ? <Loader2 size={14} className="animate-spin" /> : subscribed ? "Oprește" : "Activează"}
        </button>
      </div>

      {err && (
        <div className="px-4 py-2 text-[11px] text-sunset-magenta border-b border-foreground/10">{err}</div>
      )}

      {block.blocked && /iPhone|iPad|iPod/.test(navigator.userAgent) && (
        <div className="px-4 py-3 flex items-start gap-2 border-b border-foreground/10 bg-foreground/[0.02]">
          <Smartphone size={14} className="text-sunset-amber mt-0.5 shrink-0" />
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            Pe iPhone, deschide aplicația în Safari → <strong>Share</strong> → <strong>Add to Home Screen</strong>, apoi
            deschide-o de pe ecran și activează notificările.
          </p>
        </div>
      )}

      <ul className="divide-y divide-foreground/5">
        {PREF_LABELS.map(({ key, label, hint }) => (
          <li key={key} className="p-4 flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <div className="font-display text-[13px] truncate">{label}</div>
              <div className="text-[10px] text-muted-foreground truncate">{hint}</div>
            </div>
            <button
              onClick={() => setPref(key, !prefs[key])}
              role="switch"
              aria-checked={prefs[key]}
              className={`relative h-6 w-11 rounded-full transition ${prefs[key] ? "bg-sunset-orange" : "bg-foreground/15"}`}
            >
              <span
                className={`absolute top-0.5 h-5 w-5 rounded-full bg-background shadow transition-all ${prefs[key] ? "left-[22px]" : "left-0.5"}`}
              />
            </button>
          </li>
        ))}
      </ul>

      {subscribed && (
        <div className="p-4 border-t border-foreground/10 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="font-display text-[13px]">Test notificare</div>
            <div className="text-[10px] text-muted-foreground truncate">
              {testMsg ?? "Trimite-ți o notificare ca să verifici."}
            </div>
          </div>
          <button
            onClick={sendTest}
            disabled={busy}
            className="h-9 px-3 rounded-full text-[11px] font-display font-bold uppercase bg-foreground/10 text-foreground inline-flex items-center gap-1.5 disabled:opacity-40"
          >
            <Send size={12} /> Test
          </button>
        </div>
      )}

      {permission === "denied" && (
        <div className="px-4 py-3 text-[11px] text-muted-foreground border-t border-foreground/10">
          Ai blocat permisiunea în browser. Activeaz-o din setările site-ului și revino aici.
        </div>
      )}
    </section>
  );
}
