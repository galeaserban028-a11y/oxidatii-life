import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { openOrCreateDM } from "@/lib/chat";
import { Plus, MapPin, Clock, X, Flame, Trash2, Check, UserX, ChevronDown, ChevronUp, MessageCircle } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/app/parties")({
  head: () => ({
    meta: [{ title: "Șprițuri · OXIDAȚII" }],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Archivo+Black&family=Hind:wght@400;500;600;700&display=swap",
      },
    ],
  }),
  component: PartiesPage,
});

type Party = {
  id: string; host_id: string; title: string; description: string | null;
  location_text: string; spots_total: number; starts_at: string;
  expires_at: string; vibe: string | null;
};

type Host = { id: string; handle: string | null; display_name: string | null; avatar_url: string | null };

const ARCHIVO = { fontFamily: "'Archivo Black', system-ui, sans-serif" } as const;
const HIND = { fontFamily: "'Hind', system-ui, sans-serif" } as const;

function timeLabel(iso: string) {
  const d = new Date(iso);
  const diff = d.getTime() - Date.now();
  const mins = Math.round(diff / 60000);
  if (mins < -30) return `acum ${Math.abs(Math.round(mins / 60))}h`;
  if (mins < 0) return "live acum";
  if (mins < 60) return `în ${mins}min`;
  if (mins < 60 * 24) return `în ${Math.round(mins / 60)}h`;
  return d.toLocaleString("ro-RO", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

function PartiesPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  async function openDM(otherId: string) {
    if (!user) return;
    try {
      const cid = await openOrCreateDM(user.id, otherId);
      navigate({ to: "/app/chat/$id", params: { id: cid } });
    } catch (e) {
      toast.error("Nu am putut deschide chat-ul");
    }
  }
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

  useEffect(() => {
    const channelName = `parties-feed:${Date.now()}:${Math.random().toString(36).slice(2)}`;
    const ch = supabase
      .channel(channelName)
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

  const acceptedFor = (id: string) => joins.filter(j => j.party_id === id && j.status === "accepted").length;
  const visibleParties = parties.filter(p => {
    const taken = acceptedFor(p.id);
    const free = p.spots_total - taken;
    const myJoin = !!user && joins.find(j => j.party_id === p.id && j.user_id === user.id);
    const isHost = user?.id === p.host_id;
    return free > 0 || !!myJoin || isHost;
  });

  return (
    <div className="pb-4" style={HIND}>
      {/* Hero */}
      <header className="px-6 pt-6 pb-2">
        <p className="text-[10px] uppercase tracking-[0.25em] text-white/40 font-bold mb-1">șprițuri live</p>
        <h1 className="text-[40px] leading-[0.9] text-white" style={ARCHIVO}>
          cine deschide?
        </h1>
        <p className="text-[11px] text-white/40 mt-2">
          {visibleParties.length} live · intră sau deschide unul
        </p>
      </header>

      {/* Hero CTA */}
      <div className="px-6 mt-5 mb-8">
        <button
          onClick={() => setShowCreate(true)}
          disabled={!user}
          className="relative overflow-hidden w-full bg-gradient-to-br from-[#1c1c1c] to-[#0a0a0a] p-5 rounded-3xl border border-[#ff3d8b]/30 active:scale-[0.98] transition-all shadow-lg disabled:opacity-40 flex items-center gap-4 text-left"
        >
          <div className="w-12 h-12 rounded-full bg-[#ff3d8b] flex items-center justify-center shadow-[0_0_20px_rgba(255,61,139,0.4)] shrink-0">
            <Flame className="w-6 h-6 text-black" strokeWidth={2.5} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm uppercase tracking-tight text-white" style={ARCHIVO}>deschide un șpriț</p>
            <p className="text-[10px] text-white/40 mt-0.5">cheamă haita · 2 coins</p>
          </div>
          <Plus className="w-5 h-5 text-[#ff3d8b] shrink-0" strokeWidth={3} />
          <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-[#ff3d8b]/15 rounded-full blur-2xl pointer-events-none" />
        </button>
      </div>

      {!user && (
        <div className="px-6 mb-6">
          <Link
            to="/login"
            className="block p-3 rounded-2xl border border-[#ff3d8b]/30 bg-[#ff3d8b]/5 text-center text-[10px] uppercase tracking-widest text-[#ff3d8b] font-bold"
          >
            intră în cont ca să chemi sau să te alături →
          </Link>
        </div>
      )}

      {/* Feed */}
      <section className="px-6">
        <div className="flex items-center gap-2 mb-5">
          <div className="w-2 h-2 rounded-full bg-[#ff3d8b] animate-pulse shadow-[0_0_8px_#ff3d8b]" />
          <h2 className="text-xs uppercase tracking-widest text-[#ff3d8b]" style={ARCHIVO}>live acum</h2>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => <div key={i} className="h-36 rounded-3xl bg-white/[0.03] animate-pulse" />)}
          </div>
        ) : visibleParties.length === 0 ? (
          <div className="p-8 rounded-3xl border border-dashed border-white/10 bg-white/[0.02] text-center">
            <Flame className="mx-auto text-[#ff3d8b]/40 mb-3" size={36} strokeWidth={1.5} />
            <div className="text-base text-white" style={ARCHIVO}>zero șprițuri acum</div>
            <div className="text-[10px] text-white/40 mt-1 uppercase tracking-widest">fii primul · deschide unul</div>
            <button
              onClick={() => setShowCreate(true)}
              disabled={!user}
              className="mt-5 inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-[#ff3d8b] text-white text-[10px] uppercase tracking-wider font-bold shadow-[0_0_18px_-4px_#ff3d8b] active:scale-95 disabled:opacity-40"
            >
              <Plus size={12} strokeWidth={3} /> deschid șpriț
            </button>
          </div>
        ) : (
          <div className="space-y-4">
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
              const city = (p.location_text.split(/[,·\-—]/)[0] ?? p.location_text).trim();
              const initial = (host?.handle ?? host?.display_name ?? "?")[0]?.toUpperCase();
              const pct = Math.min(100, (taken / p.spots_total) * 100);

              return (
                <article key={p.id} className="relative">
                  {isHost && (
                    <div className="absolute left-0 top-6 bottom-6 w-1.5 bg-[#c724ff] rounded-r-full shadow-[0_0_15px_rgba(199,36,255,0.6)] z-10" />
                  )}
                  <div className={`relative overflow-hidden bg-[#0f0f12] border border-white/10 rounded-[2rem] p-6 ${isHost ? "pl-8" : ""} shadow-xl`}>
                    <div className="absolute -top-24 -right-24 w-48 h-48 bg-[#c724ff]/5 rounded-full blur-[60px] pointer-events-none" />

                    <div className="relative z-10">
                      {/* host row */}
                      <div className="flex items-start justify-between">
                        <div className="flex gap-4 min-w-0 flex-1">
                          <div className="relative shrink-0">
                            <div className="w-14 h-14 rounded-2xl overflow-hidden bg-gradient-to-br from-[#ff3d8b] to-[#00e5ff] flex items-center justify-center text-base text-white ring-1 ring-white/10 shadow-xl" style={ARCHIVO}>
                              {host?.avatar_url
                                ? <img src={host.avatar_url} alt="" className="h-full w-full object-cover" />
                                : initial}
                            </div>
                            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-[#00e5ff] border-[3px] border-[#0f0f12] rounded-full shadow-[0_0_8px_#00e5ff]" />
                          </div>
                          <div className="pt-1 min-w-0 flex-1">
                            <h3 className="text-white font-bold text-lg tracking-tight truncate">{p.title}</h3>
                            <p className="text-white/40 text-[11px] mt-0.5 flex items-center gap-1.5 truncate">
                              <span className={`font-bold uppercase tracking-wide ${isHost ? "text-[#00e5ff]" : "text-white/60"}`}>
                                {isHost ? "Tu (Host)" : `@${host?.handle ?? host?.display_name ?? "anonim"}`}
                              </span>
                              {city && <><span className="text-white/20">·</span><MapPin size={10} className="inline shrink-0" />{city}</>}
                            </p>
                          </div>
                        </div>
                        {isHost ? (
                          <button
                            onClick={() => handleDelete(p.id, p.title)}
                            disabled={deleteMutation.isPending}
                            aria-label="șterge șpriț"
                            className="p-2 text-white/20 hover:text-[#ff3d8b] hover:bg-[#ff3d8b]/10 rounded-xl disabled:opacity-30 transition-all shrink-0"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        ) : (
                          <div className="px-2 py-1 bg-[#ff3d8b]/10 border border-[#ff3d8b]/20 rounded-lg shrink-0 flex items-center gap-1">
                            <Clock size={9} className="text-[#ff3d8b]" />
                            <p className="text-[10px] font-bold text-[#ff3d8b]">{timeLabel(p.starts_at)}</p>
                          </div>
                        )}
                      </div>

                      {/* description */}
                      {p.description?.trim() && (
                        <p className="mt-5 px-1 text-white/70 italic text-sm font-medium leading-snug line-clamp-2">
                          „{p.description.trim()}"
                        </p>
                      )}

                      {/* meta + vibe */}
                      <div className="mt-5 flex items-center gap-2 flex-wrap">
                        <span className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-[10px] uppercase tracking-widest text-white/60 font-black flex items-center gap-1">
                          <MapPin size={10} />{p.location_text}
                        </span>
                        {p.vibe && (
                          <span className="text-[#00e5ff] text-[10px] font-black tracking-widest uppercase border border-[#00e5ff]/30 px-3 py-1.5 rounded-lg bg-[#00e5ff]/5">
                            {p.vibe}
                          </span>
                        )}
                      </div>

                      {/* spots progress */}
                      <div className="mt-5">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[10px] uppercase tracking-widest font-black">
                            <span className="text-white">{taken}</span>
                            <span className="text-white/30">/{p.spots_total}</span>
                            <span className="ml-1.5 text-white/40">vin</span>
                          </span>
                          <span className={`text-[10px] uppercase tracking-widest font-black ${free === 0 ? "text-[#c724ff]" : "text-white/40"}`}>
                            {free === 0 ? "plin" : `${free} locuri`}
                          </span>
                        </div>
                        <div className="h-1 rounded-full bg-white/5 overflow-hidden">
                          <div
                            className={`h-full ${free === 0 ? "bg-[#c724ff]" : "bg-gradient-to-r from-[#ff3d8b] to-[#c724ff]"}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>

                      {/* CTA */}
                      <div className="mt-5 flex justify-end">
                        {isHost ? (
                          <div className="group/btn relative">
                            <div className="absolute -inset-1 bg-gradient-to-r from-[#ff3d8b] to-[#c724ff] rounded-2xl blur-md opacity-50 group-hover/btn:opacity-100 transition duration-500" />
                            <div className="relative bg-gradient-to-r from-[#ff3d8b] to-[#c724ff] px-5 py-3 rounded-2xl flex items-center gap-2 shadow-2xl">
                              <span className="text-white text-[11px] font-black tracking-[0.12em] uppercase">Gestionezi</span>
                              <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
                              </svg>
                            </div>
                          </div>
                        ) : myStatus === "accepted" ? (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => openDM(p.host_id)}
                              className="h-10 w-10 rounded-full flex items-center justify-center bg-gradient-to-br from-[#ff3d8b] to-[#c724ff] text-white shadow-[0_0_18px_-4px_#c724ff] active:scale-95 transition-transform"
                              aria-label="mesaj host"
                              title="Mesaj host"
                            >
                              <MessageCircle size={16} strokeWidth={2.5} />
                            </button>
                            <button
                              onClick={() => joinMutation.mutate({ partyId: p.id, joinId: myJoin?.id ?? null })}
                              disabled={joinMutation.isPending}
                              className="px-5 py-2.5 text-[10px] font-bold rounded-full uppercase tracking-wider bg-white/5 border border-[#00e5ff]/40 text-[#00e5ff] active:scale-95 disabled:opacity-30 transition-transform"
                            >
                              ✓ vii
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => joinMutation.mutate({ partyId: p.id, joinId: myJoin?.id ?? null })}
                            disabled={!user || joinMutation.isPending || (full && !myJoin)}
                            className={`px-5 py-2.5 text-[10px] font-bold rounded-full uppercase tracking-wider active:scale-95 disabled:opacity-30 transition-transform ${
                              myStatus === "pending"
                                ? "bg-white/5 border border-white/15 text-white/60"
                                : full
                                  ? "bg-white/5 text-white/40"
                                  : "bg-[#ff3d8b] text-white shadow-[0_0_18px_-4px_#ff3d8b]"
                            }`}
                          >
                            {myStatus === "pending" ? "în așteptare" : full ? "plin" : "vin și eu"}
                          </button>
                        )}
                      </div>

                      {/* Host management */}
                      {isHost && partyJoins.length > 0 && (
                        <div className="mt-5">
                          <HostJoinsPanel
                            pending={pending}
                            accepted={accepted}
                            profileMap={profileMap}
                            onAccept={(id) => acceptMutation.mutate(id)}
                            onReject={(id) => kickMutation.mutate(id)}
                            onMessage={(uid) => openDM(uid)}
                            busy={acceptMutation.isPending || kickMutation.isPending}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* Disclaimer */}
      <div className="mx-6 mt-8 mb-2 px-4 py-3 rounded-2xl bg-[#ff3d8b]/5 border border-[#ff3d8b]/10 text-center">
        <p className="text-[9px] font-bold text-[#ff3d8b]/60 uppercase tracking-tight">
          alcoolul dăunează grav sănătății.
        </p>
      </div>

      <div className="h-24" />

      {showCreate && <CreatePartySheet onClose={() => setShowCreate(false)} />}
    </div>
  );
}

type JoinRow = { id: string; party_id: string; user_id: string; status: string; created_at: string };

function HostJoinsPanel({
  pending, accepted, profileMap, onAccept, onReject, onMessage, busy,
}: {
  pending: JoinRow[];
  accepted: JoinRow[];
  profileMap: Map<string, Host>;
  onAccept: (joinId: string) => void;
  onReject: (joinId: string) => void;
  onMessage: (userId: string) => void;
  busy: boolean;
}) {
  const [open, setOpen] = useState(pending.length > 0);
  const total = pending.length + accepted.length;
  return (
    <div className="rounded-2xl border border-white/5 bg-black/40 overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-3 py-2.5 text-[10px] uppercase tracking-widest"
      >
        <span className="flex items-center gap-2">
          <span className="text-white/40 font-bold">cereri</span>
          {pending.length > 0 && (
            <span className="px-1.5 py-0.5 rounded-full bg-[#ff3d8b] text-black text-[9px] font-bold">{pending.length} noi</span>
          )}
          <span className="text-white/30">{total} total</span>
        </span>
        {open ? <ChevronUp size={12} className="text-white/40" /> : <ChevronDown size={12} className="text-white/40" />}
      </button>
      {open && (
        <div className="px-3 pb-3 space-y-2.5">
          {pending.map(j => {
            const u = profileMap.get(j.user_id);
            return (
              <div key={j.id} className="flex items-center gap-2.5">
                <Link
                  to="/app/user/$id" params={{ id: j.user_id }}
                  className="flex items-center gap-2 flex-1 min-w-0 group"
                >
                  <div className="h-8 w-8 rounded-lg overflow-hidden bg-gradient-to-br from-[#00e5ff] to-[#ff3d8b] flex items-center justify-center text-[10px] text-white shrink-0" style={ARCHIVO}>
                    {u?.avatar_url ? <img src={u.avatar_url} alt="" className="h-full w-full object-cover" /> : (u?.handle ?? "?")[0]?.toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-white truncate group-hover:underline">@{u?.handle ?? u?.display_name ?? "anonim"}</div>
                    <div className="text-[9px] uppercase tracking-widest text-white/30">vezi profil →</div>
                  </div>
                </Link>
                <button
                  onClick={() => onAccept(j.id)} disabled={busy}
                  aria-label="accept"
                  className="h-8 w-8 rounded-full flex items-center justify-center bg-[#00e5ff]/15 text-[#00e5ff] border border-[#00e5ff]/40 active:scale-95 disabled:opacity-40"
                >
                  <Check size={14} strokeWidth={3} />
                </button>
                <button
                  onClick={() => onReject(j.id)} disabled={busy}
                  aria-label="respinge"
                  className="h-8 w-8 rounded-full flex items-center justify-center bg-[#c724ff]/10 text-[#c724ff] border border-[#c724ff]/40 active:scale-95 disabled:opacity-40"
                >
                  <X size={14} strokeWidth={3} />
                </button>
              </div>
            );
          })}
          {accepted.length > 0 && (
            <>
              {pending.length > 0 && <div className="h-px bg-white/5 my-2" />}
              <div className="text-[9px] uppercase tracking-widest text-[#00e5ff] font-bold">vin</div>
              {accepted.map(j => {
                const u = profileMap.get(j.user_id);
                return (
                  <div key={j.id} className="flex items-center gap-2.5">
                    <Link
                      to="/app/user/$id" params={{ id: j.user_id }}
                      className="flex items-center gap-2 flex-1 min-w-0 group"
                    >
                      <div className="h-8 w-8 rounded-lg overflow-hidden bg-gradient-to-br from-[#00e5ff] to-[#c724ff] flex items-center justify-center text-[10px] text-white shrink-0" style={ARCHIVO}>
                        {u?.avatar_url ? <img src={u.avatar_url} alt="" className="h-full w-full object-cover" /> : (u?.handle ?? "?")[0]?.toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-white truncate group-hover:underline">@{u?.handle ?? u?.display_name ?? "anonim"}</div>
                      </div>
                    </Link>
                    <button
                      onClick={() => onMessage(j.user_id)}
                      aria-label="mesaj"
                      title="Mesaj"
                      className="h-8 w-8 rounded-full flex items-center justify-center bg-gradient-to-br from-[#ff3d8b] to-[#c724ff] text-white shadow-[0_0_12px_-4px_#c724ff] active:scale-95"
                    >
                      <MessageCircle size={14} strokeWidth={2.5} />
                    </button>
                    <button
                      onClick={() => onReject(j.id)} disabled={busy}
                      aria-label="elimină"
                      className="h-8 w-8 rounded-full flex items-center justify-center text-white/40 border border-white/10 hover:text-[#c724ff] hover:border-[#c724ff]/40 active:scale-95 disabled:opacity-40"
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

const PARTY_COST = 2;

function CreatePartySheet({ onClose }: { onClose: () => void }) {
  const { user, profile, refreshProfile } = useAuth() as any;
  const qc = useQueryClient();
  const scrollRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  const locRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [loc, setLoc] = useState("");
  const [spots, setSpots] = useState(10);
  const [vibe, setVibe] = useState("");
  const [whenMin, setWhenMin] = useState(0);

  const balance = profile?.coin_balance ?? 0;
  const canAfford = balance >= PARTY_COST;

  useEffect(() => {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ top: 0 });
      titleRef.current?.focus();
    });
  }, []);

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
        const { error: payErr } = await supabase.rpc("spend_coins", {
          _amount: PARTY_COST, _kind: "spend", _ref_id: inserted.id,
        });
        if (payErr) {
          await supabase.from("parties").delete().eq("id", inserted.id);
          throw new Error(/insufficient/i.test(payErr.message) ? `n-ai destui coins (ai ${balance}, trebuie ${PARTY_COST})` : payErr.message);
        }
        try {
          const { notifyNewPartyInCity } = await import("@/lib/notifications.functions");
          notifyNewPartyInCity({ data: { partyId: inserted.id } }).catch(() => {});
        } catch {}
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["parties"] });
      refreshProfile?.();
      toast.success(`Șpriț deschis. -${PARTY_COST} coins 🍺`);
      onClose();
    },
    onError: (error: any) => toast.error(error?.message ?? "Nu s-a putut deschide șprițul."),
  });

  const valid = title.trim().length >= 2 && loc.trim().length >= 2 && spots >= 1;
  const missing: string[] = [];
  if (title.trim().length < 2) missing.push("titlu");
  if (loc.trim().length < 2) missing.push("locație");
  if (spots < 1) missing.push("locuri");
  if (!canAfford) missing.push(`${PARTY_COST} coins (ai ${balance})`);
  const isDisabled = !valid || !canAfford || create.isPending;
  const handleCreateClick = () => {
    if (create.isPending) return;
    if (!valid || !canAfford) {
      toast.error(`mai trebuie: ${missing.join(" · ")}`);
      if (title.trim().length < 2) titleRef.current?.focus();
      else if (loc.trim().length < 2) locRef.current?.focus();
      return;
    }
    create.mutate();
  };

  const inputCls = "w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-[#ff3d8b]";
  const labelCls = "text-[10px] uppercase tracking-widest text-white/40 font-bold";

  const sheet = (
    <div
      className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-xl flex items-start justify-center px-4 pt-[calc(env(safe-area-inset-top)+0.75rem)] pb-[calc(env(safe-area-inset-bottom)+0.75rem)] sm:items-center"
      onClick={onClose}
      style={HIND}
    >
      <div
        ref={scrollRef}
        className="w-full max-w-md bg-[#0a0a0a] border border-white/10 rounded-3xl p-5 space-y-4 max-h-[calc(100dvh-env(safe-area-inset-top)-env(safe-area-inset-bottom)-1.5rem)] overflow-y-auto overscroll-contain shadow-[0_24px_100px_-35px_#ff3d8b]"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 1.25rem)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 -mx-5 -mt-5 px-5 pt-5 pb-3 bg-[#0a0a0a]/95 backdrop-blur-xl border-b border-white/5 flex items-center justify-between">
          <div>
            <div className="text-[9px] uppercase tracking-[0.28em] text-[#ff3d8b] font-bold">formular șpriț</div>
            <h2 className="text-2xl text-white mt-0.5" style={ARCHIVO}>deschid un șpriț.</h2>
          </div>
          <button onClick={onClose} className="h-9 w-9 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/60"><X size={16} /></button>
        </div>

        <div className="space-y-1.5">
          <label className={labelCls}>titlu</label>
          <input
            ref={titleRef}
            value={title} onChange={(e) => setTitle(e.target.value)}
            maxLength={80}
            placeholder="ex: șpriț pe terasa mea, gașca lu' tata"
            className={inputCls}
          />
        </div>

        <div className="space-y-1.5">
          <label className={labelCls}>unde</label>
          <input
            ref={locRef}
            value={loc} onChange={(e) => setLoc(e.target.value)}
            maxLength={120}
            placeholder="ex: scara mea, Cluj — Mărăști, casa Mihaela"
            className={inputCls}
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1.5">
            <label className={labelCls}>locuri</label>
            <input
              type="number" min={1} max={99}
              value={spots} onChange={(e) => setSpots(Math.max(1, Math.min(99, +e.target.value || 1)))}
              className={inputCls}
            />
          </div>
          <div className="space-y-1.5">
            <label className={labelCls}>vibe</label>
            <input
              value={vibe} onChange={(e) => setVibe(e.target.value)}
              maxLength={32}
              placeholder="manele / techno / chill"
              className={inputCls}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className={labelCls}>începe</label>
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
                className={`shrink-0 px-3 py-1.5 rounded-full text-[10px] uppercase tracking-widest font-bold border transition ${
                  whenMin === o.v
                    ? "bg-[#ff3d8b] border-[#ff3d8b] text-black"
                    : "border-white/10 text-white/50 bg-white/5"
                }`}
              >{o.l}</button>
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          <label className={labelCls}>descriere (opțional)</label>
          <textarea
            value={desc} onChange={(e) => setDesc(e.target.value)}
            maxLength={280} rows={3}
            placeholder="veniți cu băutură, scara 2, sun-mă când ajungi"
            className={`${inputCls} resize-none`}
          />
        </div>

        <div className="sticky bottom-0 z-10 -mx-5 -mb-5 px-5 pt-3 pb-5 bg-[#0a0a0a]/95 backdrop-blur-xl border-t border-white/5">
          <button
            type="button"
            onClick={handleCreateClick}
            aria-disabled={isDisabled}
            disabled={create.isPending}
            className={`relative w-full overflow-hidden rounded-2xl py-4 px-4 transition-all active:scale-[0.98] ${
              isDisabled
                ? "bg-white/5 border border-white/10"
                : "bg-gradient-to-r from-[#ff3d8b] via-[#ffea00] to-[#c724ff] shadow-[0_10px_40px_-10px_#ff3d8b]"
            }`}
          >
            {create.isPending ? (
              <span className="text-[11px] uppercase tracking-[0.3em] text-white/80 font-bold">se deschide…</span>
            ) : (
              <div className="flex flex-col items-center gap-1">
                <span className={`text-sm uppercase tracking-[0.18em] ${isDisabled ? "text-white/40" : "text-black"}`} style={ARCHIVO}>
                  deschide șprițul 🥂
                </span>
                <span className={`text-[10px] uppercase tracking-[0.25em] flex items-center gap-1.5 font-bold ${
                  canAfford ? (isDisabled ? "text-white/40" : "text-black/70") : "text-[#c724ff]"
                }`}>
                  cost: {PARTY_COST} coins · ai {balance} 🍺
                </span>
              </div>
            )}
          </button>
          <p className="mt-2 text-[9px] uppercase tracking-[0.25em] text-center text-white/30 font-bold">
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
