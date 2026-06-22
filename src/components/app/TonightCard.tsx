import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { Sparkles, MapPin, X, Users, Plus } from "lucide-react";

function localDateBuc(): string {
  // YYYY-MM-DD in Bucharest tz
  const now = new Date();
  const buc = new Date(now.toLocaleString("en-US", { timeZone: "Europe/Bucharest" }));
  const y = buc.getFullYear();
  const m = String(buc.getMonth() + 1).padStart(2, "0");
  const d = String(buc.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export default function TonightCard() {
  const { user, profile } = useAuth();
  const [today, setToday] = useState<string>(localDateBuc());
  const [myIntent, setMyIntent] = useState<{ id: string; venue_id: string | null; note: string | null; venue?: { name: string } | null } | null>(null);
  const [count, setCount] = useState<number>(0);
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [venueQuery, setVenueQuery] = useState("");
  const [venues, setVenues] = useState<Array<{ id: string; name: string }>>([]);
  const [pickedVenue, setPickedVenue] = useState<{ id: string; name: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [hotVenues, setHotVenues] = useState<Array<{ id: string; name: string; count: number }>>([]);
  const [joining, setJoining] = useState<string | null>(null);

  // Show card only after 16:00 local time
  const showCard = useMemo(() => {
    const h = new Date(new Date().toLocaleString("en-US", { timeZone: "Europe/Bucharest" })).getHours();
    return h >= 16 || h < 4;
  }, []);

  useEffect(() => {
    setToday(localDateBuc());
  }, []);

  useEffect(() => {
    if (!user) return;
    let cancel = false;
    (async () => {
      const [mineRes, countRes] = await Promise.all([
        supabase
          .from("daily_intents")
          .select("id, venue_id, note, venue:venues(name)")
          .eq("user_id", user.id)
          .eq("intent_date", today)
          .maybeSingle(),
        supabase
          .from("daily_intents")
          .select("user_id", { count: "exact", head: true })
          .eq("intent_date", today),
      ]);
      if (cancel) return;
      setMyIntent((mineRes.data as any) ?? null);
      setCount(countRes.count ?? 0);
      if (mineRes.data) {
        setNote((mineRes.data as any).note ?? "");
        if ((mineRes.data as any).venue?.name) {
          setPickedVenue({ id: (mineRes.data as any).venue_id, name: (mineRes.data as any).venue.name });
        }
      }
    })();
    return () => { cancel = true; };
  }, [user?.id, today]);

  // Hot venues tonight — group intents by venue
  async function refreshHotVenues() {
    const { data } = await supabase
      .from("daily_intents")
      .select("venue_id, venue:venues(id, name)")
      .eq("intent_date", today)
      .not("venue_id", "is", null)
      .limit(200);
    const map = new Map<string, { id: string; name: string; count: number }>();
    (data ?? []).forEach((r: any) => {
      if (!r.venue?.id) return;
      const ex = map.get(r.venue.id);
      if (ex) ex.count++;
      else map.set(r.venue.id, { id: r.venue.id, name: r.venue.name, count: 1 });
    });
    setHotVenues([...map.values()].sort((a, b) => b.count - a.count).slice(0, 5));
  }
  useEffect(() => { if (user) refreshHotVenues(); }, [user?.id, today]);

  async function joinVenue(v: { id: string; name: string }) {
    if (!user) return;
    setJoining(v.id);
    try {
      const { error } = await supabase.from("daily_intents").upsert({
        user_id: user.id,
        intent_date: today,
        venue_id: v.id,
        note: note.trim() || null,
      } as any, { onConflict: "user_id,intent_date" });
      if (error) throw error;
      toast.success(`Te-ai băgat la ${v.name}!`);
      setMyIntent({ id: "_", venue_id: v.id, note: note.trim() || null, venue: { name: v.name } });
      setPickedVenue(v);
      await refreshHotVenues();
      const { count: c } = await supabase
        .from("daily_intents").select("user_id", { count: "exact", head: true }).eq("intent_date", today);
      setCount(c ?? 0);
    } catch (e: any) {
      toast.error(e.message ?? "Eroare");
    } finally {
      setJoining(null);
    }
  }

  useEffect(() => {
    if (!venueQuery.trim()) { setVenues([]); return; }
    const t = setTimeout(async () => {
      let q = supabase.from("venues").select("id, name").ilike("name", `%${venueQuery}%`).limit(6);
      if ((profile as any)?.city_id) q = q.eq("city_id", (profile as any).city_id);
      const { data } = await q;
      setVenues(data ?? []);
    }, 200);
    return () => clearTimeout(t);
  }, [venueQuery, (profile as any)?.city_id]);

  async function save() {
    if (!user) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("daily_intents").upsert({
        user_id: user.id,
        intent_date: today,
        venue_id: pickedVenue?.id ?? null,
        note: note.trim() || null,
      } as any, { onConflict: "user_id,intent_date" });
      if (error) throw error;
      toast.success("Ai marcat seara!");
      setMyIntent({ id: "_", venue_id: pickedVenue?.id ?? null, note: note.trim() || null, venue: pickedVenue ? { name: pickedVenue.name } : null });
      setOpen(false);
      const { count: c } = await supabase
        .from("daily_intents").select("user_id", { count: "exact", head: true }).eq("intent_date", today);
      setCount(c ?? 0);
    } catch (e: any) {
      toast.error(e.message ?? "Eroare");
    } finally {
      setSaving(false);
    }
  }

  async function cancel() {
    if (!user) return;
    await supabase.from("daily_intents").delete().eq("user_id", user.id).eq("intent_date", today);
    setMyIntent(null);
    setPickedVenue(null);
    setNote("");
    const { count: c } = await supabase
      .from("daily_intents").select("user_id", { count: "exact", head: true }).eq("intent_date", today);
    setCount(c ?? 0);
  }

  if (!user || !showCard) return null;

  return (
    <div
      className="relative overflow-hidden rounded-3xl border border-white/10 p-5"
      style={{
        background: "linear-gradient(135deg, rgba(255,234,0,0.10), rgba(199,36,255,0.10) 60%, transparent)",
      }}
    >
      <div className="absolute -top-10 -right-10 h-28 w-28 rounded-full bg-[#ffea00]/20 blur-3xl pointer-events-none" />
      <div className="relative flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.25em] text-[#ffea00]">
            <Sparkles size={12} /> diseară
          </div>
          <h3 className="mt-1 text-[26px] leading-[0.95] text-white" style={{ fontFamily: "'Instrument Serif', serif" }}>
            {myIntent ? (
              <>Te-ai băgat. <span className="italic text-[#ffea00]">{count}</span> persoane ies diseară.</>
            ) : (
              <>Diseară unde <span className="italic">ieși</span>?</>
            )}
          </h3>
          {myIntent && (myIntent.venue?.name || myIntent.note) && (
            <div className="mt-2 text-[12px] text-white/70 flex items-center gap-1.5">
              {myIntent.venue?.name && <><MapPin size={12} className="text-[#ffea00]" /> {myIntent.venue.name}</>}
              {myIntent.note && <span className="text-white/50">· {myIntent.note}</span>}
            </div>
          )}
        </div>
        {myIntent ? (
          <button onClick={cancel} className="h-8 w-8 rounded-full bg-white/5 border border-white/10 text-white/60 hover:bg-white/10 flex items-center justify-center" aria-label="Anulează">
            <X size={14} />
          </button>
        ) : null}
      </div>

      {!myIntent && !open && (
        <button
          onClick={() => setOpen(true)}
          className="relative mt-4 w-full h-12 rounded-2xl bg-gradient-to-r from-[#ffea00] to-[#ff3d8b] text-black font-bold text-[11px] uppercase tracking-[0.2em] active:scale-[0.98] transition"
        >
          mă bag în seara asta ({count})
        </button>
      )}

      {open && (
        <div className="relative mt-4 space-y-2">
          <div className="relative">
            <input
              value={pickedVenue?.name ?? venueQuery}
              onChange={(e) => { setVenueQuery(e.target.value); setPickedVenue(null); }}
              placeholder="Unde? (opțional)"
              className="w-full rounded-xl bg-black/40 border border-white/10 px-3 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-[#ffea00]/40"
            />
            {!pickedVenue && venues.length > 0 && (
              <div className="absolute z-20 inset-x-0 mt-1 rounded-xl bg-[#0a0a0a] border border-white/10 overflow-hidden">
                {venues.map(v => (
                  <button key={v.id} onClick={() => { setPickedVenue(v); setVenueQuery(""); setVenues([]); }} className="block w-full text-left px-3 py-2 text-sm text-white hover:bg-white/5">
                    {v.name}
                  </button>
                ))}
              </div>
            )}
          </div>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={60}
            placeholder="vibe (ex: cocktail, șpriț, dans)"
            className="w-full rounded-xl bg-black/40 border border-white/10 px-3 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-[#ffea00]/40"
          />
          <div className="flex gap-2">
            <button onClick={() => setOpen(false)} className="flex-1 h-11 rounded-xl bg-white/5 border border-white/10 text-white/70 text-[11px] uppercase tracking-widest">Renunță</button>
            <button onClick={save} disabled={saving} className="flex-1 h-11 rounded-xl bg-gradient-to-r from-[#ffea00] to-[#ff3d8b] text-black font-bold text-[11px] uppercase tracking-widest disabled:opacity-50">
              {saving ? "..." : "salvează"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
