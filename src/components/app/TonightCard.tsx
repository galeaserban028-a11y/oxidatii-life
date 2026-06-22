import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { Sparkles, MapPin, X, Users, Plus, Heart, MessageCircle } from "lucide-react";
import VenueNightChat from "./VenueNightChat";

function localDateBuc(): string {
  // YYYY-MM-DD in Bucharest tz
  const now = new Date();
  const buc = new Date(now.toLocaleString("en-US", { timeZone: "Europe/Bucharest" }));
  const y = buc.getFullYear();
  const m = String(buc.getMonth() + 1).padStart(2, "0");
  const d = String(buc.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function slugifyVenueName(name: string) {
  const base = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 42) || "loc";
  return `${base}-${Math.random().toString(36).slice(2, 6)}`;
}

export default function TonightCard() {
  const { user, profile } = useAuth();
  const [today, setToday] = useState<string>(localDateBuc());
  const [myIntent, setMyIntent] = useState<{ id: string; venue_id: string | null; note: string | null; venue?: { name: string } | null } | null>(null);
  const [count, setCount] = useState<number>(0);
  const [showVenues, setShowVenues] = useState(false);
  const [note, setNote] = useState("");
  const [venueQuery, setVenueQuery] = useState("");
  const [venues, setVenues] = useState<Array<{ id: string; name: string }>>([]);
  const [pickedVenue, setPickedVenue] = useState<{ id: string; name: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [hotVenues, setHotVenues] = useState<Array<{ id: string; name: string; count: number }>>([]);
  const [suggestedVenues, setSuggestedVenues] = useState<Array<{ id: string; name: string; count: number }>>([]);
  const [joining, setJoining] = useState<string | null>(null);
  const [follows, setFollows] = useState<Set<string>>(new Set());
  const [followedVenues, setFollowedVenues] = useState<Array<{ id: string; name: string; count: number }>>([]);
  const [chatVenue, setChatVenue] = useState<{ id: string; name: string } | null>(null);

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

  useEffect(() => {
    if (!user || !(profile as any)?.city_id) return;
    let cancel = false;
    (async () => {
      const { data } = await supabase
        .from("venues")
        .select("id, name")
        .eq("city_id", (profile as any).city_id)
        .order("created_at", { ascending: false })
        .limit(8);
      if (!cancel) setSuggestedVenues(((data ?? []) as any[]).map((v) => ({ ...v, count: 0 })));
    })();
    return () => { cancel = true; };
  }, [user?.id, (profile as any)?.city_id]);

  // Load followed venues
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("venue_follows")
        .select("venue_id, venue:venues(id, name)")
        .eq("user_id", user.id);
      setFollows(new Set((data ?? []).map((r: any) => r.venue_id)));
      setFollowedVenues((data ?? []).map((r: any) => ({ id: r.venue_id, name: r.venue?.name ?? "Loc", count: 0 })));
    })();
  }, [user?.id]);

  // Merge followed venues into the displayed list (suggestions)
  const displayedVenues = useMemo(() => {
    const byId = new Map<string, { id: string; name: string; count: number }>();
    [...suggestedVenues, ...followedVenues, ...hotVenues].forEach((v) => {
      const prev = byId.get(v.id);
      byId.set(v.id, prev ? { ...prev, count: Math.max(prev.count, v.count) } : v);
    });
    const merged = [...byId.values()];
    // sort: followed first, then by count
    return merged.sort((a, b) => {
      const fa = follows.has(a.id) ? 1 : 0;
      const fb = follows.has(b.id) ? 1 : 0;
      if (fa !== fb) return fb - fa;
      return b.count - a.count;
    });
  }, [hotVenues, suggestedVenues, followedVenues, follows]);

  async function toggleFollow(v: { id: string; name: string }) {
    if (!user) return;
    const isFollowing = follows.has(v.id);
    const next = new Set(follows);
    if (isFollowing) {
      next.delete(v.id);
      setFollows(next);
      setFollowedVenues((prev) => prev.filter((item) => item.id !== v.id));
      await supabase.from("venue_follows").delete().eq("user_id", user.id).eq("venue_id", v.id);
    } else {
      next.add(v.id);
      setFollows(next);
      setFollowedVenues((prev) => prev.some((item) => item.id === v.id) ? prev : [...prev, { ...v, count: 0 }]);
      const { error } = await supabase.from("venue_follows").insert({ user_id: user.id, venue_id: v.id } as any);
      if (error) {
        next.delete(v.id);
        setFollows(new Set(next));
        setFollowedVenues((prev) => prev.filter((item) => item.id !== v.id));
        toast.error("Nu am putut urmări locul");
      } else {
        toast.success(`Urmărești ${v.name}`);
      }
    }
  }

  async function ensurePickedVenue() {
    if (pickedVenue) return pickedVenue;
    const name = venueQuery.trim();
    if (!name) return null;
    const cityId = (profile as any)?.city_id;
    if (!cityId) throw new Error("Alege orașul din profil înainte să adaugi locul");
    const { data, error } = await supabase
      .from("venues")
      .insert({ city_id: cityId, name, slug: slugifyVenueName(name) } as any)
      .select("id, name")
      .single();
    if (error) throw error;
    return data as { id: string; name: string };
  }

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
      const venue = await ensurePickedVenue();
      const { error } = await supabase.from("daily_intents").upsert({
        user_id: user.id,
        intent_date: today,
        venue_id: venue?.id ?? null,
        note: note.trim() || null,
      } as any, { onConflict: "user_id,intent_date" });
      if (error) throw error;
      toast.success("Ai marcat seara!");
      setMyIntent({ id: "_", venue_id: venue?.id ?? null, note: note.trim() || null, venue: venue ? { name: venue.name } : null });
      if (venue) setPickedVenue(venue);
      setShowVenues(false);
      const { count: c } = await supabase
        .from("daily_intents").select("user_id", { count: "exact", head: true }).eq("intent_date", today);
      setCount(c ?? 0);
      await refreshHotVenues();
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
    await refreshHotVenues();
  }

  if (!user || !showCard) return null;

  return (
    <div className="tonight-card cherry-glow-anim animate-fade-in">
      {/* Cherry glow orbs — smaller, subtler */}
      <div className="pointer-events-none absolute -top-8 -right-8 h-28 w-28 rounded-full blur-[52px] opacity-50" style={{ background: "var(--cherry-400)" }} />
      <div className="pointer-events-none absolute -bottom-6 -left-6 h-20 w-20 rounded-full blur-[40px] opacity-35" style={{ background: "var(--cherry-600)" }} />

      <div className="relative flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="tonight-label flex items-center gap-1.5">
            <Sparkles size={10} /> diseară
          </div>
          <h3 className="tonight-title mt-1.5 text-[22px]">
            {myIntent ? (
              <>Te-ai băgat. <span style={{ color: "var(--cherry-400)" }}>{count}</span> persoane ies.</>
            ) : (
              <>Diseară unde <span style={{ color: "var(--cherry-400)", fontStyle: "italic" }}>ieși</span>?</>
            )}
          </h3>
          {myIntent && (myIntent.venue?.name || myIntent.note) && (
            <div className="mt-1 text-[11px] text-white/70 flex items-center gap-1.5" style={{ fontFamily: "'Barlow', sans-serif" }}>
              {myIntent.venue?.name && <><MapPin size={11} style={{ color: "var(--cherry-400)" }} /> {myIntent.venue.name}</>}
              {myIntent.note && <span className="text-white/50">· {myIntent.note}</span>}
            </div>
          )}
        </div>
        {myIntent ? (
          <button onClick={cancel} className="tonight-icon-btn" aria-label="Anulează">
            <X size={13} />
          </button>
        ) : null}
      </div>

      {!myIntent && !showVenues && (
        <button onClick={() => setShowVenues(true)} className="tonight-btn mt-4">
          mă bag în seara asta ({count})
        </button>
      )}

      {myIntent && !myIntent.venue_id && !showVenues && (
        <button
          onClick={() => setShowVenues(true)}
          className="tonight-btn mt-4"
          style={{ background: "var(--cherry-400)", boxShadow: "0 12px 30px -10px rgba(232,138,171,0.35)" }}
        >
          alege locul pentru chat
        </button>
      )}

      {showVenues && (
        <div className="relative mt-4 space-y-2">
          <div className="relative">
            <input
              value={pickedVenue?.name ?? venueQuery}
              onChange={(e) => { setVenueQuery(e.target.value); setPickedVenue(null); }}
              placeholder="Unde? (opțional)"
              className="tonight-input"
            />
            {!pickedVenue && venues.length > 0 && (
              <div className="absolute z-20 inset-x-0 mt-1 rounded-xl border overflow-hidden" style={{ background: "#0f0b10", borderColor: "rgba(248,200,216,0.12)" }}>
                {venues.map(v => (
                  <button
                    key={v.id}
                    onClick={() => { setPickedVenue(v); setVenueQuery(""); setVenues([]); }}
                    className="block w-full text-left px-3 py-2 text-sm text-white hover:bg-white/5 transition"
                  >
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
            className="tonight-input"
          />
          <div className="flex gap-2">
            <button onClick={() => setShowVenues(false)} className="tonight-ghost-btn">Renunță</button>
            <button onClick={save} disabled={saving} className="tonight-btn" style={{ height: 36, fontSize: 10, letterSpacing: "0.1em" }}>
              {saving ? "..." : "salvează"}
            </button>
          </div>
        </div>
      )}

      {showVenues && displayedVenues.length > 0 && (
        <div className="relative mt-4 pt-3" style={{ borderTop: "1px solid rgba(248,200,216,0.10)" }}>
          <div className="flex items-center justify-between mb-2">
            <div className="tonight-label flex items-center gap-1.5 text-white/50">
              <Users size={10} /> unde se adună
            </div>
            <button onClick={() => setShowVenues(false)} className="tonight-icon-btn" aria-label="Închide">
              <X size={12} />
            </button>
          </div>
          <div className="space-y-1.5">
            {displayedVenues.map(v => {
              const mine = myIntent?.venue_id === v.id;
              const followed = follows.has(v.id);
              return (
                <div key={v.id} className="tonight-venue-row">
                  <MapPin size={12} style={{ color: "var(--cherry-400)", flexShrink: 0 }} />
                  <div className="flex-1 min-w-0">
                    <div className="text-[12px] text-white truncate flex items-center gap-1.5">
                      {v.name}
                      {followed && <span style={{ color: "var(--cherry-400)", fontSize: 7, fontWeight: 700, letterSpacing: "0.05em" }}>★</span>}
                    </div>
                    <div className="text-[9px] text-white/40">{v.count} {v.count === 1 ? "persoană" : "persoane"}</div>
                  </div>
                  <button
                    onClick={() => toggleFollow(v)}
                    className={`tonight-follow-btn ${followed ? "active" : ""}`}
                    aria-label={followed ? "Nu mai urmări" : "Urmărește"}
                  >
                    <Heart size={12} fill={followed ? "currentColor" : "none"} />
                  </button>
                  {mine ? (
                    <button onClick={() => setChatVenue(v)} className="tonight-chat-btn">
                      <MessageCircle size={10} /> chat
                    </button>
                  ) : (
                    <button
                      onClick={() => joinVenue(v)}
                      disabled={joining === v.id}
                      className="tonight-join-btn"
                    >
                      <Plus size={10} strokeWidth={3} /> {joining === v.id ? "..." : "mă bag"}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {chatVenue && (
        <VenueNightChat
          venueId={chatVenue.id}
          venueName={chatVenue.name}
          date={today}
          onClose={() => setChatVenue(null)}
        />
      )}
    </div>
  );

}
