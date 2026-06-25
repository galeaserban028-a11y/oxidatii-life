import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { openOrCreateDM } from "@/lib/chat";
import { useNavigate } from "@tanstack/react-router";
import { Plus, MessageCircle, Trash2, UsersRound, Flame, MapPin, Vote } from "lucide-react";
import { useState } from "react";
import { CreateDecisionPollSheet, DecisionPollCard } from "@/components/app/DecisionMode";

export const Route = createFileRoute("/app/squad")({
  head: () => ({
    meta: [{ title: "Organizare șpriț · OXIDAȚII" }],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Archivo+Black&family=Hind:wght@400;500;600;700&display=swap",
      },
    ],
  }),
  component: SquadPage,
});

type LiveParty = {
  id: string; host_id: string; title: string; description: string | null;
  location_text: string; spots_total: number; starts_at: string; vibe: string | null;
};

const ARCHIVO = { fontFamily: "'Archivo Black', system-ui, sans-serif" } as const;
const HIND = { fontFamily: "'Hind', system-ui, sans-serif" } as const;

function timeShort(iso: string) {
  const diff = new Date(iso).getTime() - Date.now();
  const mins = Math.round(diff / 60000);
  if (mins < -30) return `${Math.abs(Math.round(mins / 60))}h în urmă`;
  if (mins < 0) return "live";
  if (mins < 60) return `în ${mins}m`;
  if (mins < 60 * 24) return `${new Date(iso).toLocaleTimeString("ro-RO", { hour: "2-digit", minute: "2-digit" })}`;
  return new Date(iso).toLocaleDateString("ro-RO", { day: "numeric", month: "short" });
}

function SquadPage() {
  const { user } = useAuth();
  const nav = useNavigate();
  const qc = useQueryClient();

  const { data: liveParties = [] } = useQuery({
    queryKey: ["squad-live-parties"],
    queryFn: async () => {
      const { data } = await supabase
        .from("parties")
        .select("id,host_id,title,description,location_text,spots_total,starts_at,vibe")
        .gt("expires_at", new Date().toISOString())
        .order("starts_at", { ascending: true })
        .limit(20);
      return (data ?? []) as LiveParty[];
    },
    refetchInterval: 30_000,
  });

  const partyIds = liveParties.map(p => p.id);
  const { data: joins = [] } = useQuery({
    queryKey: ["squad-joins", partyIds.sort().join(",")],
    enabled: partyIds.length > 0,
    queryFn: async () => {
      const { data } = await supabase
        .from("party_joins").select("party_id,user_id").in("party_id", partyIds);
      return (data ?? []) as { party_id: string; user_id: string }[];
    },
    refetchInterval: 20_000,
  });

  const visibleParties = liveParties.filter(p => {
    const taken = joins.filter(j => j.party_id === p.id).length;
    const free = p.spots_total - taken;
    const inParty = !!user && joins.some(j => j.party_id === p.id && j.user_id === user.id);
    const isHost = user?.id === p.host_id;
    return free > 0 || inParty || isHost;
  });

  const hostIds = Array.from(new Set(visibleParties.map(p => p.host_id)));
  const { data: hosts = [] } = useQuery({
    queryKey: ["squad-hosts", hostIds.sort().join(",")],
    enabled: hostIds.length > 0,
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("id,handle,display_name,avatar_url").in("id", hostIds);
      return (data ?? []) as { id: string; handle: string | null; display_name: string | null; avatar_url: string | null }[];
    },
  });
  const hostMap = new Map(hosts.map(h => [h.id, h]));

  const joinMutation = useMutation({
    mutationFn: async ({ partyId, joined }: { partyId: string; joined: boolean }) => {
      if (!user) throw new Error("login");
      if (joined) await supabase.from("party_joins").delete().eq("party_id", partyId).eq("user_id", user.id);
      else await supabase.from("party_joins").insert({ party_id: partyId, user_id: user.id });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["squad-joins"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (partyId: string) => {
      if (!user) throw new Error("login");
      const { error } = await supabase.from("parties").delete().eq("id", partyId).eq("host_id", user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["squad-live-parties"] });
      qc.invalidateQueries({ queryKey: ["parties"] });
    },
  });

  const handleDelete = (partyId: string, title: string) => {
    if (confirm(`Ștergi șprițul "${title}"? Nu se mai poate recupera.`)) {
      deleteMutation.mutate(partyId);
    }
  };

  const { data: friends = [], isLoading } = useQuery({
    queryKey: ["squad-friends", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data: f } = await supabase
        .from("friendships")
        .select("requester_id,addressee_id,status")
        .eq("status", "accepted")
        .or(`requester_id.eq.${user!.id},addressee_id.eq.${user!.id}`);
      const ids = (f ?? []).map((r: any) => r.requester_id === user!.id ? r.addressee_id : r.requester_id);
      if (ids.length === 0) return [];
      const { data: profs } = await supabase
        .from("profiles")
        .select("id,handle,display_name,avatar_url,city:cities(name)")
        .in("id", ids);
      return profs ?? [];
    },
  });

  const { data: groups = [] } = useQuery({
    queryKey: ["squad-groups", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data: mems } = await supabase
        .from("conversation_members")
        .select("conversation_id")
        .eq("user_id", user!.id);
      const ids = (mems ?? []).map((m: any) => m.conversation_id);
      if (ids.length === 0) return [];
      const { data: convs } = await supabase
        .from("conversations")
        .select("id,title,kind,last_message_at")
        .in("id", ids)
        .eq("kind", "group")
        .order("last_message_at", { ascending: false });
      return convs ?? [];
    },
  });

  async function startDM(friendId: string) {
    if (!user) return;
    const id = await openOrCreateDM(user.id, friendId);
    nav({ to: "/app/chat/$id", params: { id } });
  }

  const openCount = visibleParties.length;
  const groupCount = groups.length;
  const friendCount = friends.length;

  return (
    <div className="pb-4" style={HIND}>
      {/* Title */}
      <header className="px-6 pt-6 pb-2">
        <p className="text-[10px] uppercase tracking-[0.25em] text-white/40 font-bold mb-1">haita ta</p>
        <h1 className="text-[40px] leading-[0.9] text-white" style={ARCHIVO}>
          cu cine ieșim?
        </h1>
      </header>

      {/* Stats Row — scroll-to chips */}
      <div className="px-6 mt-5 mb-7 grid grid-cols-3 gap-2">
        <a href="#live" className="bg-white/5 rounded-2xl py-3 border border-white/5 flex flex-col items-center active:scale-95 transition">
          <span className="text-xl text-[#ff3d8b]" style={ARCHIVO}>{openCount}</span>
          <span className="text-[8px] uppercase tracking-widest text-white/30 font-bold mt-1">live</span>
        </a>
        <a href="#groups" className="bg-white/5 rounded-2xl py-3 border border-white/5 flex flex-col items-center active:scale-95 transition">
          <span className="text-xl text-[#c724ff]" style={ARCHIVO}>{groupCount}</span>
          <span className="text-[8px] uppercase tracking-widest text-white/30 font-bold mt-1">găști</span>
        </a>
        <a href="#friends" className="bg-white/5 rounded-2xl py-3 border border-white/5 flex flex-col items-center active:scale-95 transition">
          <span className="text-xl text-[#00e5ff]" style={ARCHIVO}>{friendCount}</span>
          <span className="text-[8px] uppercase tracking-widest text-white/30 font-bold mt-1">haita</span>
        </a>
      </div>

      {/* Hero Action Grid */}
      <div className="px-6 grid grid-cols-2 gap-4 mb-10">
        <Link
          to="/app/parties"
          className="relative overflow-hidden bg-gradient-to-br from-[#1c1c1c] to-[#0a0a0a] p-5 rounded-3xl border border-[#ff3d8b]/30 active:scale-95 transition-all shadow-lg"
        >
          <div className="w-10 h-10 rounded-full bg-[#ff3d8b] flex items-center justify-center mb-4 shadow-[0_0_20px_rgba(255,61,139,0.4)]">
            <Flame className="w-5 h-5 text-black" strokeWidth={2.5} />
          </div>
          <p className="text-xs uppercase mb-1 tracking-tight text-white" style={ARCHIVO}>deschide unul</p>
          <p className="text-[10px] text-white/40">cheamă lumea</p>
          <div className="absolute -right-4 -bottom-4 w-16 h-16 bg-[#ff3d8b]/15 rounded-full blur-xl pointer-events-none" />
        </Link>

        <Link
          to="/app/friends"
          className="relative overflow-hidden bg-gradient-to-br from-[#1c1c1c] to-[#0a0a0a] p-5 rounded-3xl border border-[#c724ff]/30 active:scale-95 transition-all shadow-lg"
        >
          <div className="w-10 h-10 rounded-full bg-[#c724ff] flex items-center justify-center mb-4 shadow-[0_0_20px_rgba(199,36,255,0.4)]">
            <UsersRound className="w-5 h-5 text-black" strokeWidth={2.5} />
          </div>
          <p className="text-xs uppercase mb-1 tracking-tight text-white" style={ARCHIVO}>grup nou</p>
          <p className="text-[10px] text-white/40">cu prietenii tăi</p>
          <div className="absolute -right-4 -bottom-4 w-16 h-16 bg-[#c724ff]/15 rounded-full blur-xl pointer-events-none" />
        </Link>
      </div>

      {/* LIVE ȘPRIȚURI */}
      <section id="live" className="px-6 mb-10 scroll-mt-4">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-[#ff3d8b] animate-pulse shadow-[0_0_8px_#ff3d8b]" />
            <h2 className="text-xs uppercase tracking-widest text-[#ff3d8b]" style={ARCHIVO}>live acum</h2>
          </div>
          {openCount > 0 && (
            <Link to="/app/parties" className="text-[10px] text-white/30 uppercase font-bold tracking-wider">
              vezi tot →
            </Link>
          )}
        </div>

        {visibleParties.length === 0 ? (
          <Link
            to="/app/parties"
            className="block p-6 rounded-3xl border border-dashed border-white/10 bg-white/[0.02] text-center active:scale-[0.99] transition"
          >
            <Flame className="mx-auto text-[#ff3d8b]/40 mb-2" size={28} strokeWidth={1.5} />
            <div className="text-sm text-white" style={ARCHIVO}>nimic deschis acum</div>
            <div className="text-[10px] text-white/40 mt-1 uppercase tracking-widest">deschide tu primul →</div>
          </Link>
        ) : (
          <div className="space-y-4">
            {visibleParties.map(p => {
              const host = hostMap.get(p.host_id);
              const taken = joins.filter(j => j.party_id === p.id).length;
              const free = Math.max(0, p.spots_total - taken);
              const joined = !!user && joins.some(j => j.party_id === p.id && j.user_id === user.id);
              const isHost = user?.id === p.host_id;
              const full = free === 0 && !joined;
              const city = (p.location_text.split(/[,·\-—]/)[0] ?? p.location_text).trim();
              const initial = (host?.handle ?? host?.display_name ?? "?")[0]?.toUpperCase();

              return (
                <article key={p.id} className="relative">
                  {isHost && (
                    <div className="absolute left-0 top-6 bottom-6 w-1.5 bg-[#c724ff] rounded-r-full shadow-[0_0_15px_rgba(199,36,255,0.6)] z-10" />
                  )}
                  <div className={`relative overflow-hidden bg-[#0f0f12] border border-white/10 rounded-[2rem] p-6 ${isHost ? "pl-8" : ""} shadow-xl`}>
                    <div className="absolute -top-24 -right-24 w-48 h-48 bg-[#c724ff]/5 rounded-full blur-[60px] pointer-events-none" />

                    <div className="relative z-10">
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
                          <div className="px-2 py-1 bg-[#ff3d8b]/10 border border-[#ff3d8b]/20 rounded-lg shrink-0">
                            <p className="text-[10px] font-bold text-[#ff3d8b]">{timeShort(p.starts_at)}</p>
                          </div>
                        )}
                      </div>

                      {p.description?.trim() && (
                        <p className="mt-5 px-1 text-white/70 italic text-sm font-medium leading-snug line-clamp-2">
                          „{p.description.trim()}"
                        </p>
                      )}

                      <div className="mt-6 flex items-end justify-between gap-3">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="bg-white/5 px-3 py-1.5 rounded-lg border border-white/5">
                            <span className="text-white/40 text-[9px] font-black uppercase tracking-widest block leading-none">Locuri</span>
                            <span className={`text-sm font-black tracking-tight ${full ? "text-[#c724ff]" : "text-white"}`}>
                              {taken}<span className="text-white/30">/{p.spots_total}</span>
                            </span>
                          </div>
                          {p.vibe && (
                            <span className="text-[#00e5ff] text-[10px] font-black tracking-widest uppercase border border-[#00e5ff]/30 px-3 py-2 rounded-lg bg-[#00e5ff]/5 truncate">
                              {p.vibe}
                            </span>
                          )}
                        </div>

                        {isHost ? (
                          <Link
                            to="/app/parties"
                            className="group/btn relative shrink-0"
                          >
                            <div className="absolute -inset-1 bg-gradient-to-r from-[#ff3d8b] to-[#c724ff] rounded-2xl blur-md opacity-50 group-hover/btn:opacity-100 transition duration-500" />
                            <div className="relative bg-gradient-to-r from-[#ff3d8b] to-[#c724ff] px-5 py-3 rounded-2xl flex items-center gap-2 shadow-2xl active:scale-95 transition-transform">
                              <span className="text-white text-[11px] font-black tracking-[0.12em] uppercase">Gestionezi</span>
                              <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
                              </svg>
                            </div>
                          </Link>
                        ) : (
                          <button
                            onClick={() => joinMutation.mutate({ partyId: p.id, joined })}
                            disabled={!user || joinMutation.isPending || (full && !joined)}
                            className={`shrink-0 px-5 py-2.5 text-[10px] font-bold rounded-full uppercase tracking-wider active:scale-95 disabled:opacity-30 transition-transform ${
                              joined
                                ? "bg-white/5 border border-[#00e5ff]/40 text-[#00e5ff]"
                                : full
                                  ? "bg-white/5 text-white/40"
                                  : "bg-[#ff3d8b] text-white shadow-[0_0_18px_-4px_#ff3d8b]"
                            }`}
                          >
                            {joined ? "vii" : full ? "plin" : "vin și eu"}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* GRUPURI */}
      {groups.length > 0 && (
        <section id="groups" className="px-6 mb-10 scroll-mt-4">
          <h2 className="text-xs uppercase tracking-widest text-[#c724ff] mb-5" style={ARCHIVO}>grupuri active</h2>
          <div className="space-y-3">
            {groups.map((g: any) => (
              <Link
                key={g.id}
                to="/app/chat/$id"
                params={{ id: g.id }}
                className="flex items-center justify-between bg-white/5 p-4 rounded-2xl border border-white/5 active:scale-[0.99] transition"
              >
                <div className="flex items-center gap-4 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#c724ff] to-[#00e5ff] flex items-center justify-center text-sm text-white shrink-0" style={ARCHIVO}>
                    {(g.title ?? "G")[0].toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-white truncate">{g.title ?? "grup fără nume"}</p>
                    <p className="text-[10px] text-white/40">
                      {g.last_message_at ? new Date(g.last_message_at).toLocaleDateString("ro-RO", { day: "numeric", month: "short" }) : "—"}
                    </p>
                  </div>
                </div>
                <MessageCircle className="text-[#c724ff]/60 shrink-0" size={18} />
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* PRIETENI */}
      <section id="friends" className="px-6 mb-6 scroll-mt-4">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xs uppercase tracking-widest text-[#00e5ff]" style={ARCHIVO}>
            haita ({friendCount})
          </h2>
          {friendCount > 0 && (
            <Link to="/app/friends" className="text-[10px] text-white/30 uppercase font-bold tracking-wider">
              gestionează →
            </Link>
          )}
        </div>

        {isLoading ? (
          <div className="py-8 text-center text-[10px] uppercase tracking-widest text-white/30">o secundă…</div>
        ) : friends.length === 0 ? (
          <Link
            to="/app/friends"
            className="block py-6 rounded-3xl border border-dashed border-white/10 bg-white/[0.02] text-center active:scale-[0.99] transition"
          >
            <div className="text-sm text-white" style={ARCHIVO}>nu ai adăugat încă pe nimeni</div>
            <div className="text-[10px] text-white/40 mt-1 uppercase tracking-widest">caută prieteni →</div>
          </Link>
        ) : (
          <div className="divide-y divide-white/5">
            {friends.map((p: any) => (
              <div key={p.id} className="flex items-center justify-between py-3">
                <Link to="/app/user/$id" params={{ id: p.id }} className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="w-10 h-10 rounded-full overflow-hidden bg-gradient-to-br from-[#ff3d8b] to-[#00e5ff] flex items-center justify-center text-sm text-white shrink-0" style={ARCHIVO}>
                    {p.avatar_url
                      ? <img src={p.avatar_url} alt="" className="h-full w-full object-cover" />
                      : (p.handle ?? "?")[0]?.toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-white truncate">@{p.handle ?? p.display_name}</p>
                    <p className="text-[10px] text-white/40 truncate">{p.city?.name ?? "—"}</p>
                  </div>
                </Link>
                <button
                  onClick={() => startDM(p.id)}
                  aria-label="trimite mesaj"
                  className="w-10 h-10 flex items-center justify-center rounded-full bg-white/5 text-white/60 border border-white/5 hover:text-[#00e5ff] hover:border-[#00e5ff]/40 active:scale-95 transition shrink-0"
                >
                  <MessageCircle size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Disclaimer */}
      <div className="mx-6 mt-4 mb-2 px-4 py-3 rounded-2xl bg-[#ff3d8b]/5 border border-[#ff3d8b]/10 text-center">
        <p className="text-[9px] font-bold text-[#ff3d8b]/60 uppercase tracking-tight">
          alcoolul dăunează grav sănătății.
        </p>
      </div>

      {/* extra bottom space for tab bar */}
      <div className="h-24" />
    </div>
  );
}
