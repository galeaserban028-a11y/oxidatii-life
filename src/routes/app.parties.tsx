import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Plus, Users, MapPin, Clock, X, Flame, Trash2, Check, UserX, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";

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
  void hosts;

  const partyIds = parties.map(p => p.id);
  const { data: joins = [] } = useQuery({
    queryKey: ["party-joins", partyIds.sort().join(",")],
    queryFn: async () => {
      if (!partyIds.length) return [];
      const { data } = await supabase.from("party_joins").select("id, party_id, user_id, status, created_at").in("party_id", partyIds);
      return (data ?? []) as { id: string; party_id: string; user_id: string; status: string; created_at: string }[];
    },
    enabled: partyIds.length > 0,
    refetchInterval: 20_000,
  });

  // fetch profiles for joiners + hosts together
  const joinerIds = Array.from(new Set(joins.map(j => j.user_id)));
  const allProfileIds = Array.from(new Set([...hostIds, ...joinerIds]));
  const { data: profiles = [] } = useQuery({
    queryKey: ["party-profiles", allProfileIds.sort().join(",")],
    queryFn: async () => {
      if (!allProfileIds.length) return [];
      const { data } = await supabase.from("profiles").select("id, handle, display_name, avatar_url").in("id", allProfileIds);
      return (data ?? []) as Host[];
    },
    enabled: allProfileIds.length > 0,
  });
  const profileMap = new Map(profiles.map(p => [p.id, p]));


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
    mutationFn: async ({ partyId, joinId }: { partyId: string; joinId: string | null }) => {
      if (!user) throw new Error("login");
      if (joinId) {
        await supabase.from("party_joins").delete().eq("id", joinId);
      } else {
        await supabase.from("party_joins").insert({ party_id: partyId, user_id: user.id, status: "pending" });
        try {
          const { notifyPartyJoin } = await import("@/lib/notifications.functions");
          notifyPartyJoin({ data: { partyId } }).catch(() => {});
        } catch {}
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["party-joins"] }),
  });

  const acceptMutation = useMutation({
    mutationFn: async (joinId: string) => {
      const { error } = await supabase.from("party_joins").update({ status: "accepted" }).eq("id", joinId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["party-joins"] }),
  });

  const kickMutation = useMutation({
    mutationFn: async (joinId: string) => {
      const { error } = await supabase.from("party_joins").delete().eq("id", joinId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["party-joins"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (partyId: string) => {
      if (!user) throw new Error("login");
      const { error } = await supabase.from("parties").delete().eq("id", partyId).eq("host_id", user.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["parties"] }),
  });

  const handleDelete = (partyId: string, title: string) => {
    if (confirm(`Ștergi șprițul "${title}"? Nu se mai poate recupera.`)) {
      deleteMutation.mutate(partyId);
    }
  };

  // hide full parties unless user is already in
  const acceptedFor = (id: string) => joins.filter(j => j.party_id === id && j.status === "accepted").length;
  const visibleParties = parties.filter(p => {
    const taken = acceptedFor(p.id);
    const free = p.spots_total - taken;
    const myJoin = !!user && joins.find(j => j.party_id === p.id && j.user_id === user.id);
    const isHost = user?.id === p.host_id;
    return free > 0 || !!myJoin || isHost;
  });


  return (
    <div className="px-4 pt-6 pb-4 space-y-4">
      <header className="flex items-end justify-between">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-neon-purple">// organizare șpriț</div>
          <h1 className="font-display font-black text-2xl tracking-tight mt-1">șprițuri.</h1>
          <p className="text-xs text-muted-foreground font-mono uppercase tracking-widest mt-0.5">
            {visibleParties.length} șprițuri live · intră sau deschide unul
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
      ) : visibleParties.length === 0 ? (
        <div className="py-16 text-center space-y-3">
          <Flame className="mx-auto text-muted-foreground" size={48} strokeWidth={1.5} />
          <div className="font-display font-black text-lg">zero șprițuri acum</div>
          <div className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
            fii primul · deschide un șpriț
          </div>
          <button
            onClick={() => setShowCreate(true)}
            disabled={!user}
            className="mx-auto mt-2 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-gradient-to-br from-neon-crimson to-neon-purple text-white font-mono text-[11px] uppercase tracking-widest shadow-[0_0_18px_-4px_var(--neon-crimson)] active:scale-95 disabled:opacity-40"
          >
            <Plus size={14} strokeWidth={3} /> deschid șpriț
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {visibleParties.map(p => {
            const host = profileMap.get(p.host_id);
            const partyJoins = joins.filter(j => j.party_id === p.id);
            const accepted = partyJoins.filter(j => j.status === "accepted");
            const pending = partyJoins.filter(j => j.status === "pending");
            const taken = accepted.length;
            const free = Math.max(0, p.spots_total - taken);
            const myJoin = user ? partyJoins.find(j => j.user_id === user.id) : undefined;
            const isHost = user?.id === p.host_id;
            const full = free === 0 && !myJoin;
            const myStatus = myJoin?.status;
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
                      <>
                        <span className="font-mono text-[9px] uppercase tracking-widest text-neon-green border border-neon-green/40 px-2 py-0.5 rounded-full">gazda</span>
                        <button
                          onClick={() => handleDelete(p.id, p.title)}
                          disabled={deleteMutation.isPending}
                          aria-label="șterge șpriț"
                          className="h-8 w-8 rounded-full flex items-center justify-center text-neon-crimson border border-neon-crimson/40 hover:bg-neon-crimson/10 active:scale-95 disabled:opacity-40"
                        >
                          <Trash2 size={13} />
                        </button>
                      </>
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
                      onClick={() => joinMutation.mutate({ partyId: p.id, joinId: myJoin?.id ?? null })}
                      disabled={!user || joinMutation.isPending || (full && !myJoin) || isHost}
                      className={`shrink-0 px-4 py-2 rounded-xl font-mono text-[11px] uppercase tracking-widest active:scale-95 disabled:opacity-30 transition ${
                        myStatus === "accepted"
                          ? "bg-neon-green/15 text-neon-green border border-neon-green/50"
                          : myStatus === "pending"
                          ? "bg-foreground/5 text-muted-foreground border border-foreground/15"
                          : "bg-neon-crimson text-white shadow-[0_0_14px_-4px_var(--neon-crimson)]"
                      }`}
                    >
                      {isHost ? "tu" : myStatus === "accepted" ? "✓ vin" : myStatus === "pending" ? "în așteptare" : full ? "plin" : "vin și eu"}
                    </button>
                  </div>

                  {/* Host management: pending requests + accepted list */}
                  {isHost && (partyJoins.length > 0) && (
                    <HostJoinsPanel
                      pending={pending}
                      accepted={accepted}
                      profileMap={profileMap}
                      onAccept={(id) => acceptMutation.mutate(id)}
                      onReject={(id) => kickMutation.mutate(id)}
                      busy={acceptMutation.isPending || kickMutation.isPending}
                    />
                  )}
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

type JoinRow = { id: string; party_id: string; user_id: string; status: string; created_at: string };

function HostJoinsPanel({
  pending, accepted, profileMap, onAccept, onReject, busy,
}: {
  pending: JoinRow[];
  accepted: JoinRow[];
  profileMap: Map<string, Host>;
  onAccept: (joinId: string) => void;
  onReject: (joinId: string) => void;
  busy: boolean;
}) {
  const [open, setOpen] = useState(pending.length > 0);
  const total = pending.length + accepted.length;
  return (
    <div className="rounded-xl border border-foreground/10 bg-foreground/[0.02] overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-3 py-2 font-mono text-[10px] uppercase tracking-widest"
      >
        <span className="flex items-center gap-2">
          <span className="text-muted-foreground">// cereri</span>
          {pending.length > 0 && (
            <span className="px-1.5 py-0.5 rounded-full bg-neon-crimson text-white text-[9px]">{pending.length} noi</span>
          )}
          <span className="text-muted-foreground">{total} total</span>
        </span>
        {open ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
      </button>
      {open && (
        <div className="px-3 pb-3 space-y-2.5">
          {pending.length === 0 && accepted.length === 0 && (
            <div className="text-[11px] font-mono uppercase tracking-widest text-muted-foreground">nicio cerere încă</div>
          )}
          {pending.map(j => {
            const u = profileMap.get(j.user_id);
            return (
              <div key={j.id} className="flex items-center gap-2.5">
                <Link
                  to="/app/user/$id" params={{ id: j.user_id }}
                  className="flex items-center gap-2 flex-1 min-w-0 group"
                >
                  <div className="h-8 w-8 rounded-full overflow-hidden bg-gradient-to-br from-neon-purple to-neon-crimson flex items-center justify-center font-display text-[10px] shrink-0">
                    {u?.avatar_url ? <img src={u.avatar_url} alt="" className="h-full w-full object-cover" /> : (u?.handle ?? "?")[0]?.toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="font-display text-xs truncate group-hover:underline">@{u?.handle ?? u?.display_name ?? "anonim"}</div>
                    <div className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">vezi profil →</div>
                  </div>
                </Link>
                <button
                  onClick={() => onAccept(j.id)} disabled={busy}
                  aria-label="accept"
                  className="h-8 w-8 rounded-full flex items-center justify-center bg-neon-green/15 text-neon-green border border-neon-green/40 hover:bg-neon-green/25 active:scale-95 disabled:opacity-40"
                >
                  <Check size={14} strokeWidth={3} />
                </button>
                <button
                  onClick={() => onReject(j.id)} disabled={busy}
                  aria-label="respinge"
                  className="h-8 w-8 rounded-full flex items-center justify-center bg-neon-crimson/10 text-neon-crimson border border-neon-crimson/40 hover:bg-neon-crimson/20 active:scale-95 disabled:opacity-40"
                >
                  <X size={14} strokeWidth={3} />
                </button>
              </div>
            );
          })}
          {accepted.length > 0 && (
            <>
              {pending.length > 0 && <div className="h-px bg-foreground/10 my-2" />}
              <div className="font-mono text-[9px] uppercase tracking-widest text-neon-green">// vin</div>
              {accepted.map(j => {
                const u = profileMap.get(j.user_id);
                return (
                  <div key={j.id} className="flex items-center gap-2.5">
                    <Link
                      to="/app/user/$id" params={{ id: j.user_id }}
                      className="flex items-center gap-2 flex-1 min-w-0 group"
                    >
                      <div className="h-8 w-8 rounded-full overflow-hidden bg-gradient-to-br from-neon-green to-neon-purple flex items-center justify-center font-display text-[10px] shrink-0">
                        {u?.avatar_url ? <img src={u.avatar_url} alt="" className="h-full w-full object-cover" /> : (u?.handle ?? "?")[0]?.toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="font-display text-xs truncate group-hover:underline">@{u?.handle ?? u?.display_name ?? "anonim"}</div>
                      </div>
                    </Link>
                    <button
                      onClick={() => onReject(j.id)} disabled={busy}
                      aria-label="elimină"
                      className="h-8 w-8 rounded-full flex items-center justify-center text-muted-foreground border border-foreground/15 hover:text-neon-crimson hover:border-neon-crimson/40 active:scale-95 disabled:opacity-40"
                    >
                      <UserX size={14} />
                    </button>
                  </div>
                );
              })}
            </>
          )}
        </div>
      )}
    </div>
  );
}


function CreatePartySheet({ onClose }: { onClose: () => void }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const titleRef = useRef<HTMLInputElement>(null);
  const locRef = useRef<HTMLInputElement>(null);
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
      const { data: inserted, error } = await supabase.from("parties").insert({
        host_id: user.id,
        title: title.trim(),
        description: desc.trim() || null,
        location_text: loc.trim(),
        spots_total: spots,
        starts_at,
        vibe: vibe.trim() || null,
      }).select("id").single();
      if (error) throw error;
      if (inserted?.id) {
        try {
          const { notifyNewPartyInCity } = await import("@/lib/notifications.functions");
          notifyNewPartyInCity({ data: { partyId: inserted.id } }).catch(() => {});
        } catch {}
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["parties"] });
      toast.success("Șpriț deschis.");
      onClose();
    },
    onError: (error: any) => toast.error(error?.message ?? "Nu s-a putut deschide șprițul."),
  });

  const valid = title.trim().length >= 2 && loc.trim().length >= 2 && spots >= 1;
  const missing: string[] = [];
  if (title.trim().length < 2) missing.push("titlu");
  if (loc.trim().length < 2) missing.push("locație");
  if (spots < 1) missing.push("locuri");
  const isDisabled = !valid || create.isPending;
  const handleCreateClick = () => {
    if (create.isPending) return;
    if (!valid) {
      toast.error(`mai trebuie: ${missing.join(" · ")}`);
      if (title.trim().length < 2) titleRef.current?.focus();
      else if (loc.trim().length < 2) locRef.current?.focus();
      return;
    }
    create.mutate();
  };

  const sheet = (
    <div className="fixed inset-0 z-[9999] bg-background/90 backdrop-blur-xl flex items-start justify-center px-4 pt-[calc(env(safe-area-inset-top)+0.75rem)] pb-[calc(env(safe-area-inset-bottom)+0.75rem)] sm:items-center" onClick={onClose}>
      <div
        className="w-full max-w-md bg-background border border-foreground/10 rounded-3xl p-5 space-y-4 max-h-[calc(100dvh-env(safe-area-inset-top)-env(safe-area-inset-bottom)-1.5rem)] overflow-y-auto overscroll-contain shadow-[0_24px_100px_-35px_var(--neon-crimson)]"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 1.25rem)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 -mx-5 -mt-5 px-5 pt-5 pb-3 bg-background/95 backdrop-blur-xl border-b border-foreground/10 flex items-center justify-between">
          <div>
            <div className="font-mono text-[9px] uppercase tracking-[0.28em] text-neon-crimson">// formular șpriț</div>
            <h2 className="font-display font-black text-xl">deschid un șpriț.</h2>
          </div>
          <button onClick={onClose} className="h-9 w-9 rounded-full bg-foreground/5 flex items-center justify-center"><X size={16} /></button>
        </div>

        <div className="space-y-1.5">
          <label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">// titlu</label>
          <input
            ref={titleRef}
            value={title} onChange={(e) => setTitle(e.target.value)}
            maxLength={80}
            placeholder="ex: șpriț pe terasa mea, gașca lu' tata"
            className="w-full px-3 py-2.5 rounded-xl bg-foreground/5 border border-foreground/10 text-sm focus:outline-none focus:border-neon-crimson"
          />
        </div>

        <div className="space-y-1.5">
          <label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">// unde</label>
          <input
            ref={locRef}
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

        <div className="sticky bottom-0 z-10 -mx-5 -mb-5 px-5 pt-3 pb-5 bg-background/95 backdrop-blur-xl border-t border-foreground/10">
              <button
                type="button"
                onClick={handleCreateClick}
                aria-disabled={isDisabled}
                disabled={create.isPending}
                className={`group relative w-full overflow-hidden rounded-2xl p-[1.5px] transition-all duration-300 active:scale-[0.98] ${
                  isDisabled ? "opacity-90" : "shadow-[0_10px_40px_-10px_var(--neon-crimson)] hover:shadow-[0_14px_50px_-8px_var(--neon-purple)]"
                }`}
              >
                <span
                  aria-hidden
                  className={`absolute inset-0 rounded-2xl bg-[conic-gradient(from_var(--a),var(--neon-crimson),var(--neon-purple),var(--neon-crimson))] ${
                    isDisabled ? "" : "animate-[spin_4s_linear_infinite]"
                  }`}
                  style={{ ["--a" as any]: "0deg" }}
                />
                <span className="relative flex flex-col items-center justify-center gap-1 rounded-[14px] bg-background/95 px-4 py-3 pointer-events-none">
                  {create.isPending ? (
                    <span className="font-mono text-xs uppercase tracking-[0.3em] text-foreground/80">se deschide…</span>
                  ) : (
                    <>
                      <span className="flex items-center gap-2">
                        <span className="font-display font-black uppercase tracking-[0.18em] text-base bg-gradient-to-r from-neon-crimson via-rose-400 to-neon-purple bg-clip-text text-transparent">
                          deschide șprițul
                        </span>
                        <span className="text-base translate-y-[-1px]">🥂</span>
                      </span>
                      <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-emerald-300/90 flex items-center gap-1.5">
                        <span className="h-1 w-1 rounded-full bg-emerald-300 animate-pulse" />
                        cost: 0 coins · gratis
                      </span>
                    </>
                  )}
                </span>
              </button>
              <p className="mt-2 font-mono text-[9px] uppercase tracking-[0.25em] text-center text-muted-foreground">
                {isDisabled && missing.length > 0 && !create.isPending
                  ? `lipsește: ${missing.join(" · ")}`
                  : "apare instant · dispare automat după 12h"}
              </p>
            </div>
      </div>
    </div>
  );

  if (typeof document === "undefined") return null;
  return createPortal(sheet, document.body);
}
