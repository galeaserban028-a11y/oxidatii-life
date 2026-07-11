import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Camera, Flame, MapPin, Sparkles, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/app/me_/archive")({
  head: () => ({ meta: [{ title: "Arhivă · OXIDAȚII" }] }),
  component: ArchivePage,
});

type Filter = "all" | "photos" | "proofs" | "parties" | "checkins";

type Item = {
  kind: "photo" | "proof" | "party" | "checkin";
  id: string;
  created_at: string;
  photo_url?: string | null;
  caption?: string | null;
  venue_id?: string | null;
  title?: string | null;
  location_text?: string | null;
};

async function loadArchive(userId: string) {
  const [photosRes, proofsRes, partiesRes, checkinsRes] = await Promise.all([
    supabase
      .from("venue_photos")
      .select("id, photo_url, caption, taken_at, venue_id")
      .eq("user_id", userId)
      .order("taken_at", { ascending: false })
      .limit(200),
    supabase
      .from("sprit_proofs")
      .select("id, photo_url, created_at, venue_id")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(200),
    supabase
      .from("parties")
      .select("id, title, location_text, created_at")
      .eq("host_id", userId)
      .order("created_at", { ascending: false })
      .limit(200),
    supabase
      .from("check_ins")
      .select("id, venue_id, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(200),
  ]);

  const items: Item[] = [
    ...(photosRes.data ?? []).map(
      (p): Item => ({
        kind: "photo",
        id: p.id,
        created_at: p.taken_at,
        photo_url: p.photo_url,
        caption: p.caption,
        venue_id: p.venue_id,
      }),
    ),
    ...(proofsRes.data ?? []).map(
      (p): Item => ({
        kind: "proof",
        id: p.id,
        created_at: p.created_at,
        photo_url: p.photo_url,
        venue_id: p.venue_id,
      }),
    ),
    ...(partiesRes.data ?? []).map(
      (p): Item => ({
        kind: "party",
        id: p.id,
        created_at: p.created_at,
        title: p.title,
        location_text: p.location_text,
      }),
    ),
    ...(checkinsRes.data ?? []).map(
      (c): Item => ({
        kind: "checkin",
        id: c.id,
        created_at: c.created_at,
        venue_id: c.venue_id,
      }),
    ),
  ].sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));

  type VenueLite = { id: string; name: string };
  const venueIds = Array.from(new Set(items.map((i) => i.venue_id).filter(Boolean) as string[]));
  const { data: venues } = venueIds.length
    ? await supabase.from("venues").select("id, name").in("id", venueIds)
    : { data: [] as VenueLite[] };
  const vmap = new Map(((venues ?? []) as VenueLite[]).map((v) => [v.id, v]));

  return {
    items,
    vmap,
    counts: {
      photos: photosRes.data?.length ?? 0,
      proofs: proofsRes.data?.length ?? 0,
      parties: partiesRes.data?.length ?? 0,
      checkins: checkinsRes.data?.length ?? 0,
    },
  };
}

function monthKey(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("ro-RO", { month: "long", year: "numeric" });
}

function ArchivePage() {
  const { user } = useAuth();
  const [filter, setFilter] = useState<Filter>("all");
  const { data, isLoading } = useQuery({
    queryKey: ["archive", user?.id],
    enabled: !!user,
    queryFn: () => loadArchive(user!.id),
  });

  const items = data?.items ?? [];
  const filtered = useMemo(() => {
    if (filter === "all") return items;
    if (filter === "photos") return items.filter((i) => i.kind === "photo");
    if (filter === "proofs") return items.filter((i) => i.kind === "proof");
    if (filter === "parties") return items.filter((i) => i.kind === "party");
    return items.filter((i) => i.kind === "checkin");
  }, [items, filter]);

  const groups = useMemo(() => {
    const m = new Map<string, Item[]>();
    for (const it of filtered) {
      const k = monthKey(it.created_at);
      const arr = m.get(k) ?? [];
      arr.push(it);
      m.set(k, arr);
    }
    return Array.from(m.entries());
  }, [filtered]);

  if (!user) {
    return (
      <div className="px-4 pt-6 text-center text-sm text-muted-foreground">
        Fă-ți cont ca să vezi arhiva.
      </div>
    );
  }

  const total = items.length;
  const c = data?.counts;

  return (
    <div className="px-5 pt-8 pb-24 space-y-7 max-w-xl mx-auto">
      <header className="space-y-4">
        <Link
          to="/app/me"
          className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.3em] text-zinc-500 hover:text-foreground"
        >
          <ArrowLeft size={12} /> înapoi la profil
        </Link>
        <div className="space-y-2">
          <div className="text-[10px] uppercase tracking-[0.3em] text-zinc-500">arhiva ta</div>
          <h1 className="font-display uppercase text-3xl leading-[0.95]">
            <span className="text-gradient-sunset">Tot ce-ai făcut.</span>
          </h1>
          <p className="text-xs text-zinc-500">{total} momente · de la primul șpriț până azi.</p>
        </div>
      </header>

      {c && (
        <div className="grid grid-cols-4 gap-2">
          <Stat label="Faze" value={c.photos} icon={Camera} />
          <Stat label="Șprițuri" value={c.proofs} icon={Sparkles} />
          <Stat label="Părți" value={c.parties} icon={Flame} />
          <Stat label="Check-in" value={c.checkins} icon={MapPin} />
        </div>
      )}

      <div className="flex gap-2 overflow-x-auto scrollbar-none -mx-1 px-1">
        {(
          [
            ["all", "Toate"],
            ["photos", "Faze"],
            ["proofs", "Șprițuri"],
            ["parties", "Părți"],
            ["checkins", "Check-in"],
          ] as [Filter, string][]
        ).map(([k, label]) => (
          <button
            key={k}
            onClick={() => setFilter(k)}
            className={`shrink-0 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider border transition ${
              filter === k
                ? "bg-neon-crimson text-background border-neon-crimson"
                : "bg-zinc-900/30 border-white/5 text-zinc-400 hover:bg-zinc-800/40"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-3 gap-1">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="aspect-square rounded-lg bg-foreground/[0.04] animate-pulse" />
          ))}
        </div>
      ) : groups.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-10 text-center space-y-2">
          <div className="text-4xl">🗃️</div>
          <div className="font-display font-semibold">Nimic în arhivă încă.</div>
          <p className="text-xs text-muted-foreground">Postează prima fază și începe colecția.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {groups.map(([month, list]) => (
            <section key={month} className="space-y-2">
              <h2 className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
                {month} · {list.length}
              </h2>
              <div className="grid grid-cols-3 gap-1">
                {list.map((it) => {
                  const v = it.venue_id ? data!.vmap.get(it.venue_id) : null;
                  if (it.photo_url) {
                    return (
                      <Link
                        key={`${it.kind}-${it.id}`}
                        to={v ? "/app/venue/$id" : "/app/me"}
                        params={v ? { id: v.id } : (undefined as unknown as { id: string })}
                        className="aspect-square relative overflow-hidden rounded-lg bg-foreground/5 group"
                      >
                        <img
                          src={it.photo_url}
                          alt={it.caption ?? ""}
                          className="absolute inset-0 h-full w-full object-cover"
                          loading="lazy"
                        />
                        {it.kind === "proof" && (
                          <span className="absolute top-1 right-1 text-[8px] font-mono uppercase px-1 py-0.5 rounded bg-neon-green/80 text-black font-bold">
                            ✓
                          </span>
                        )}
                      </Link>
                    );
                  }
                  // Fallback tile for parties / checkins without image
                  const Icon = it.kind === "party" ? Flame : MapPin;
                  return (
                    <div
                      key={`${it.kind}-${it.id}`}
                      className="aspect-square rounded-lg bg-gradient-to-br from-foreground/[0.05] to-foreground/[0.02] border border-foreground/10 p-2 flex flex-col justify-between"
                    >
                      <Icon
                        size={14}
                        className={
                          it.kind === "party" ? "text-neon-crimson" : "text-muted-foreground"
                        }
                      />
                      <div className="space-y-0.5">
                        <div className="font-display text-[10px] uppercase leading-tight truncate">
                          {it.title ?? (v ? v.name : (it.location_text ?? "—"))}
                        </div>
                        <div className="font-mono text-[8px] uppercase tracking-widest text-muted-foreground">
                          {new Date(it.created_at).toLocaleDateString("ro-RO", {
                            day: "2-digit",
                            month: "short",
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ size?: number; className?: string }>;
}) {
  return (
    <div className="rounded-2xl bg-zinc-900/30 border border-white/5 backdrop-blur p-3 text-center">
      <Icon size={14} className="mx-auto text-zinc-500" />
      <div className="font-display font-bold text-xl mt-1.5 leading-none">{value}</div>
      <div className="text-[9px] uppercase tracking-[0.2em] text-zinc-500 mt-1.5">{label}</div>
    </div>
  );
}
