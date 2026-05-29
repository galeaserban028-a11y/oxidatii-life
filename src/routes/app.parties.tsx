import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Plus, Users, MapPin, Clock, X, Flame } from "lucide-react";

export const Route = createFileRoute("/app/parties")({
  head: () => ({ meta: [{ title: "Șprițuri · OXIDAȚII" }] }),
  component: PartiesPage,
});

type Party = {
  id: string; host_id: string; title: string; description: string | null;
  location_text: string; spots_total: number; starts_at: string;
  expires_at: string; vibe: string | null;
};

type Host = { id: string; handle: string | null; display_name: string | null; avatar_url: string | null };

function timeLabel(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diff = d.getTime() - now.getTime();
  const mins = Math.round(diff / 60000);
  if (mins < -30) return `acum ${Math.abs(Math.round(mins / 60))}h`;
  if (mins < 0) return "live acum";
  if (mins < 60) return `în ${mins}min`;
  if (mins < 60 * 24) return `în ${Math.round(mins / 60)}h`;
  return d.toLocaleString("ro-RO", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

function PartiesPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);

  const { data: parties = [], isLoading } = useQuery({
    queryKey: ["parties"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("parties")
        .select("*")
        .gt("expires_at", new Date().toISOString())
        .order("starts_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Party[];
    },
    refetchInterval: 30_000,
  });

  const hostIds = Array.from(new Set(parties.map(p => p.host_id)));
  const { data: hosts = [] } = useQuery({
    queryKey: ["party-hosts", hostIds.sort().join(",")],
    queryFn: async () => {
      if (!hostIds.length) return [];
      const { data } = await supabase.from("profiles").select("id, handle, display_name, avatar_url").in("id", hostIds);
      return (data ?? []) as Host[];
    },
    enabled: hostIds.length > 0,
  });
  const hostMap = new Map(hosts.map(h => [h.id, h]));

  const partyIds = parties.map(p => p.id);
  const { data: joins = [] } = useQuery({
    queryKey: ["party-joins", partyIds.sort().join(",")],
    queryFn: async () => {
      if (!partyIds.length) return [];
      const { data } = await supabase.from("party_joins").select("party_id, user_id").in("party_id", partyIds);
      return (data ?? []) as { party_id: string; user_id: string }[];
    },
    enabled: partyIds.length > 0,
    refetchInterval: 20_000,
  });

  // realtime
  useEffect(() => {
    const ch = supabase
      .channel("parties-feed")
      .on("postgres_changes", { event: "*", schema: "public", table: "parties" }, () => {
        qc.invalidateQueries({ queryKey: ["parties"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "party_joins" }, () => {
        qc.invalidateQueries({ queryKey: ["party-joins"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [qc]);

  const joinMutation = useMutation({
    mutationFn: async ({ partyId, joined }: { partyId: string; joined: boolean }) => {
      if (!user) throw new Error("login");
      if (joined) {
        await supabase.from("party_joins").delete().eq("party_id", partyId).eq("user_id", user.id);
      } else {
        await supabase.from("party_joins").insert({ party_id: partyId, user_id: user.id });
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["party-joins"] }),
  });

  return (
    <div className="px-4 pt-6 pb-4 space-y-4">
      <header className="flex items-end justify-between">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-neon-purple">// organizare șpriț</div>
          <h1 className="font-display font-black text-2xl tracking-tight mt-1">șprițuri.</h1>
          <p className="text-xs text-muted-foreground font-mono uppercase tracking-widest mt-0.5">
            {parties.length} șprițuri live · intră sau deschide unul
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          disabled={!user}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gradient-to-br from-neon-crimson to-neon-purple text-white font-mono text-[11px] uppercase tracking-widest shadow-[0_0_18px_-4px_var(--neon-crimson)] active:scale-95 disabled:opacity-40"
        >
          <Plus size={14} strokeWidth={3} /> deschid șpriț
        </button>
      </header>

      {!user && (
        <Link to="/login" className="block p-3 rounded-xl border border-neon-crimson/40 bg-neon-crimson/5 text-center font-mono text-[11px] uppercase tracking-widest text-neon-crimson">
          intră în cont ca să chemi sau să te alături →
        </Link>
      )}

      {isLoading ? (
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => <div key={i} className="h-32 rounded-2xl bg-foreground/5 animate-pulse" />)}
        </div>
      ) : parties.length === 0 ? (
        <div className="py-16 text-center space-y-3">
          <Flame className="mx-auto text-muted-foreground" size={48} strokeWidth={1.5} />
          <div className="font-display font-black text-lg">zero șprițuri acum</div>
          <div className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
            fii primul. cheamă haita.
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {parties.map(p => {
            const host = hostMap.get(p.host_id);
            const taken = joins.filter(j => j.party_id === p.id).length;
            const free = Math.max(0, p.spots_total - taken);
            const joined = !!user && joins.some(j => j.party_id === p.id && j.user_id === user.id);
            const isHost = user?.id === p.host_id;
            const full = free === 0 && !joined;
            return (
              <article key={p.id} className="relative overflow-hidden rounded-2xl border border-foreground/10 bg-foreground/[0.03]">
                <div className="absolute top-0 right-0 h-24 w-24 rounded-full bg-neon-crimson/20 blur-3xl pointer-events-none" />
                <div className="relative p-4 space-y-3">
                  {/* host strip */}
                  <div className="flex items-center gap-2.5">
                    <div className="h-9 w-9 rounded-full overflow-hidden bg-gradient-to-br from-neon-crimson to-neon-purple flex items-center justify-center font-display text-xs shrink-0">
                      {host?.avatar_url ? <img src={host.avatar_url} alt="" className="h-full w-full object-cover" /> : (host?.handle ?? "?")[0]?.toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-display text-sm truncate">@{host?.handle ?? host?.display_name ?? "anonim"}</div>
                      <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground flex items-center gap-1">
                        <Clock size={9} /> {timeLabel(p.starts_at)}
                      </div>
                    </div>
                    {isHost && (
                      <span className="font-mono text-[9px] uppercase tracking-widest text-neon-green border border-neon-green/40 px-2 py-0.5 rounded-full">gazda</span>
                    )}
                  </div>

                  {/* title + desc */}
                  <div>
                    <h3 className="font-display font-black text-lg leading-tight">{p.title}</h3>
                    {p.description && (
                      <p className="text-sm text-foreground/80 mt-1 leading-snug">{p.description}</p>
                    )}
                  </div>

                  {/* meta */}
                  <div className="flex items-center gap-3 text-xs font-mono uppercase tracking-widest text-muted-foreground">
                    <span className="flex items-center gap-1 min-w-0 truncate">
                      <MapPin size={11} className="shrink-0" /> <span className="truncate">{p.location_text}</span>
                    </span>
                    {p.vibe && <span className="text-neon-purple shrink-0">· {p.vibe}</span>}
                  </div>

                  {/* spots + cta */}
                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-widest mb-1">
                        <span className="text-neon-green flex items-center gap-1"><Users size={10} /> {taken}/{p.spots_total} vin</span>
                        <span className={free === 0 ? "text-neon-crimson" : "text-muted-foreground"}>
                          {free === 0 ? "PLIN" : `${free} locuri`}
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full bg-foreground/10 overflow-hidden">
                        <div
                          className={`h-full ${free === 0 ? "bg-neon-crimson" : "bg-gradient-to-r from-neon-green to-neon-purple"}`}
                          style={{ width: `${Math.min(100, (taken / p.spots_total) * 100)}%` }}
                        />
                      </div>
                    </div>
                    <button
                      onClick={() => joinMutation.mutate({ partyId: p.id, joined })}
                      disabled={!user || joinMutation.isPending || (full && !joined) || isHost}
                      className={`shrink-0 px-4 py-2 rounded-xl font-mono text-[11px] uppercase tracking-widest active:scale-95 disabled:opacity-30 transition ${
                        joined
                          ? "bg-neon-green/15 text-neon-green border border-neon-green/50"
                          : "bg-neon-crimson text-white shadow-[0_0_14px_-4px_var(--neon-crimson)]"
                      }`}
                    >
                      {isHost ? "tu" : joined ? "✓ vin" : full ? "plin" : "vin și eu"}
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {showCreate && <CreatePartySheet onClose={() => setShowCreate(false)} />}
    </div>
  );
}

function CreatePartySheet({ onClose }: { onClose: () => void }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [loc, setLoc] = useState("");
  const [spots, setSpots] = useState(10);
  const [vibe, setVibe] = useState("");
  const [whenMin, setWhenMin] = useState(0); // minutes from now

  const create = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("login");
      const starts_at = new Date(Date.now() + whenMin * 60_000).toISOString();
      const { error } = await supabase.from("parties").insert({
        host_id: user.id,
        title: title.trim(),
        description: desc.trim() || null,
        location_text: loc.trim(),
        spots_total: spots,
        starts_at,
        vibe: vibe.trim() || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["parties"] });
      onClose();
    },
  });

  const valid = title.trim().length >= 2 && loc.trim().length >= 2 && spots >= 1;

  return (
    <div className="fixed inset-0 z-[60] bg-background/80 backdrop-blur-sm flex items-end" onClick={onClose}>
      <div
        className="w-full max-w-md mx-auto bg-background border-t border-foreground/10 rounded-t-3xl p-5 space-y-4 max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="font-display font-black text-xl">chem haita.</h2>
          <button onClick={onClose} className="h-9 w-9 rounded-full bg-foreground/5 flex items-center justify-center"><X size={16} /></button>
        </div>

        <div className="space-y-1.5">
          <label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">// titlu</label>
          <input
            value={title} onChange={(e) => setTitle(e.target.value)}
            maxLength={80}
            placeholder="ex: șpriț pe terasa mea, gașca lu' tata"
            className="w-full px-3 py-2.5 rounded-xl bg-foreground/5 border border-foreground/10 text-sm focus:outline-none focus:border-neon-crimson"
          />
        </div>

        <div className="space-y-1.5">
          <label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">// unde</label>
          <input
            value={loc} onChange={(e) => setLoc(e.target.value)}
            maxLength={120}
            placeholder="ex: scara mea, Cluj — Mărăști, casa Mihaela"
            className="w-full px-3 py-2.5 rounded-xl bg-foreground/5 border border-foreground/10 text-sm focus:outline-none focus:border-neon-crimson"
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1.5">
            <label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">// locuri</label>
            <input
              type="number" min={1} max={99}
              value={spots} onChange={(e) => setSpots(Math.max(1, Math.min(99, +e.target.value || 1)))}
              className="w-full px-3 py-2.5 rounded-xl bg-foreground/5 border border-foreground/10 text-sm focus:outline-none focus:border-neon-crimson"
            />
          </div>
          <div className="space-y-1.5">
            <label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">// vibe</label>
            <input
              value={vibe} onChange={(e) => setVibe(e.target.value)}
              maxLength={32}
              placeholder="manele / techno / chill"
              className="w-full px-3 py-2.5 rounded-xl bg-foreground/5 border border-foreground/10 text-sm focus:outline-none focus:border-neon-crimson"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">// începe</label>
          <div className="flex gap-1.5 overflow-x-auto -mx-1 px-1 no-scrollbar">
            {[
              { v: 0, l: "acum" },
              { v: 30, l: "+30min" },
              { v: 60, l: "+1h" },
              { v: 120, l: "+2h" },
              { v: 180, l: "+3h" },
              { v: 360, l: "diseară" },
            ].map(o => (
              <button
                key={o.v}
                onClick={() => setWhenMin(o.v)}
                className={`shrink-0 px-3 py-1.5 rounded-full text-[11px] font-mono uppercase tracking-widest border ${
                  whenMin === o.v ? "bg-neon-crimson border-neon-crimson text-white" : "border-foreground/10 text-muted-foreground"
                }`}
              >{o.l}</button>
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">// descriere (opțional)</label>
          <textarea
            value={desc} onChange={(e) => setDesc(e.target.value)}
            maxLength={280} rows={3}
            placeholder="veniți cu băutură, scara 2, sun-mă când ajungi"
            className="w-full px-3 py-2.5 rounded-xl bg-foreground/5 border border-foreground/10 text-sm focus:outline-none focus:border-neon-crimson resize-none"
          />
        </div>

        <button
          onClick={() => create.mutate()}
          disabled={!valid || create.isPending}
          className="w-full py-3 rounded-xl bg-gradient-to-r from-neon-crimson to-neon-purple text-white font-display font-black uppercase tracking-widest shadow-[0_0_20px_-4px_var(--neon-crimson)] disabled:opacity-40 active:scale-[0.98]"
        >
          {create.isPending ? "..." : "dă drumu' la șpriț"}
        </button>
        <p className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground text-center">
          dispare automat după 12h
        </p>
      </div>
    </div>
  );
}
