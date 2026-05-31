import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { openOrCreateDM } from "@/lib/chat";
import { useNavigate } from "@tanstack/react-router";
import { Users, Plus, MessageCircle, MapPin, Clock, Flame } from "lucide-react";

export const Route = createFileRoute("/app/squad")({
  head: () => ({ meta: [{ title: "Organizare șpriț · OXIDAȚII" }] }),
  component: SquadPage,
});

type LiveParty = {
  id: string; host_id: string; title: string; description: string | null;
  location_text: string; spots_total: number; starts_at: string; vibe: string | null;
};

function timeShort(iso: string) {
  const diff = new Date(iso).getTime() - Date.now();
  const mins = Math.round(diff / 60000);
  if (mins < -30) return `${Math.abs(Math.round(mins / 60))}h în urmă`;
  if (mins < 0) return "live";
  if (mins < 60) return `în ${mins}m`;
  if (mins < 60 * 24) return `în ${Math.round(mins / 60)}h`;
  return new Date(iso).toLocaleDateString("ro-RO", { day: "numeric", month: "short" });
}



function SquadPage() {
  const { user } = useAuth();
  const nav = useNavigate();
  const qc = useQueryClient();

  // Live parties — locuri disponibile RIGHT NOW
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

  // hide full parties unless user is already in or is host
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


  // Friends list = haita ta
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

  // Active group conversations
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
    <div className="pb-4">
      {/* Header — compact */}
      <header className="px-4 pt-5 pb-3">
        <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">organizare</div>
        <h1 className="font-display font-black text-2xl mt-1 tracking-tight leading-none">cu cine ieșim?</h1>
      </header>

      {/* Quick stats strip */}
      <div className="px-4 mb-3">
        <div className="grid grid-cols-3 gap-1.5 rounded-xl border border-foreground/10 bg-foreground/[0.03] p-1.5">
          <a href="#live" className="flex flex-col items-center py-1.5 rounded-lg active:bg-foreground/5">
            <div className="font-display font-black text-lg leading-none text-neon-crimson">{openCount}</div>
            <div className="font-mono text-[8px] uppercase tracking-widest text-muted-foreground mt-1">deschise</div>
          </a>
          <a href="#groups" className="flex flex-col items-center py-1.5 rounded-lg active:bg-foreground/5 border-x border-foreground/10">
            <div className="font-display font-black text-lg leading-none text-neon-green">{groupCount}</div>
            <div className="font-mono text-[8px] uppercase tracking-widest text-muted-foreground mt-1">găști</div>
          </a>
          <a href="#friends" className="flex flex-col items-center py-1.5 rounded-lg active:bg-foreground/5">
            <div className="font-display font-black text-lg leading-none text-neon-purple">{friendCount}</div>
            <div className="font-mono text-[8px] uppercase tracking-widest text-muted-foreground mt-1">haita</div>
          </a>
        </div>
      </div>

      {/* Primary actions — side by side */}
      <div className="px-4 mb-5 grid grid-cols-2 gap-2">
        <Link
          to="/app/parties"
          className="relative overflow-hidden rounded-2xl border border-neon-crimson/40 bg-gradient-to-br from-neon-crimson/20 to-neon-crimson/[0.04] p-3 active:scale-[0.98] transition"
        >
          <div className="absolute -top-4 -right-4 h-16 w-16 rounded-full bg-neon-crimson/30 blur-2xl pointer-events-none" />
          <Flame className="text-neon-crimson mb-2" size={20} />
          <div className="font-display font-black text-sm leading-tight">Chem haita</div>
          <div className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground mt-0.5">deschide șpriț</div>
        </Link>
        <Link
          to="/app/inbox"
          className="relative overflow-hidden rounded-2xl border border-neon-purple/40 bg-gradient-to-br from-neon-purple/20 to-neon-purple/[0.04] p-3 active:scale-[0.98] transition"
        >
          <div className="absolute -top-4 -right-4 h-16 w-16 rounded-full bg-neon-purple/30 blur-2xl pointer-events-none" />
          <Plus className="text-neon-purple mb-2" size={20} strokeWidth={2.6} />
          <div className="font-display font-black text-sm leading-tight">Fă gașcă</div>
          <div className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground mt-0.5">invită oxidați</div>
        </Link>
      </div>

      {/* LIVE ȘPRIȚURI */}
      <section id="live" className="px-4 space-y-2 scroll-mt-4">
        <div className="flex items-center justify-between">
          <div className="font-mono text-[10px] uppercase tracking-widest text-neon-crimson flex items-center gap-1.5">
            <Flame size={11} /> șprițuri deschise · {openCount}
          </div>
          {openCount > 0 && (
            <Link to="/app/parties" className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
              vezi tot →
            </Link>
          )}
        </div>

        {visibleParties.length === 0 ? (
          <Link to="/app/parties" className="block p-5 rounded-2xl border border-dashed border-neon-crimson/25 bg-neon-crimson/[0.03] text-center">
            <div className="text-2xl mb-1">🍻</div>
            <div className="font-display font-bold text-sm">Zero șprițuri deschise.</div>
            <div className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground mt-1">fii primul → deschide unul</div>
          </Link>
        ) : (
          <div className="space-y-2">
            {visibleParties.map(p => {
              const host = hostMap.get(p.host_id);
              const taken = joins.filter(j => j.party_id === p.id).length;
              const free = Math.max(0, p.spots_total - taken);
              const joined = !!user && joins.some(j => j.party_id === p.id && j.user_id === user.id);
              const isHost = user?.id === p.host_id;
              const full = free === 0 && !joined;
              const city = (p.location_text.split(/[,·\-—]/)[0] ?? p.location_text).trim().toUpperCase();
              const note = p.description?.trim();
              return (
                <article key={p.id} className="relative overflow-hidden rounded-2xl border border-foreground/10 bg-foreground/[0.04]">
                  <div className="absolute -top-6 -right-6 h-24 w-24 rounded-full bg-neon-crimson/20 blur-2xl pointer-events-none" />
                  <div className="relative p-3.5 space-y-2.5">
                    <div className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest">
                      <span className="px-1.5 py-0.5 rounded bg-neon-crimson/15 text-neon-crimson border border-neon-crimson/30 flex items-center gap-1">
                        <MapPin size={9} /> {city}
                      </span>
                      {p.vibe && (
                        <span className="px-1.5 py-0.5 rounded bg-neon-purple/15 text-neon-purple border border-neon-purple/30">
                          {p.vibe}
                        </span>
                      )}
                      <span className="ml-auto text-muted-foreground flex items-center gap-1">
                        <Clock size={9} /> {timeShort(p.starts_at)}
                      </span>
                    </div>

                    <div className="flex items-end justify-between gap-3">
                      <h3 className="font-display font-black text-base leading-tight flex-1 break-words">
                        {p.title}
                      </h3>
                      <div className={`text-right shrink-0 ${free === 0 ? "text-neon-crimson" : "text-neon-green"}`}>
                        <div className="font-display font-black text-lg leading-none">
                          {taken}<span className="text-muted-foreground">/</span>{p.spots_total}
                        </div>
                        <div className="font-mono text-[8px] uppercase tracking-widest text-muted-foreground mt-0.5">
                          {free === 0 ? "plin" : `${free} libere`}
                        </div>
                      </div>
                    </div>

                    {note && (
                      <p className="text-xs text-foreground/75 leading-snug line-clamp-2">
                        „{note}"
                      </p>
                    )}

                    <div className="flex items-center gap-2 pt-1.5 border-t border-foreground/5">
                      <div className="h-6 w-6 rounded-full overflow-hidden bg-gradient-to-br from-neon-crimson to-neon-purple flex items-center justify-center font-display text-[10px] text-white shrink-0">
                        {host?.avatar_url ? <img src={host.avatar_url} alt="" className="h-full w-full object-cover" /> : (host?.handle ?? "?")[0]?.toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0 font-mono text-[10px] uppercase tracking-widest text-muted-foreground truncate">
                        @{host?.handle ?? host?.display_name ?? "anonim"}
                      </div>
                      <button
                        onClick={() => joinMutation.mutate({ partyId: p.id, joined })}
                        disabled={!user || joinMutation.isPending || (full && !joined) || isHost}
                        className={`shrink-0 px-3 py-1.5 rounded-lg font-mono text-[10px] uppercase tracking-widest active:scale-95 disabled:opacity-30 transition ${
                          joined
                            ? "bg-neon-green/15 text-neon-green border border-neon-green/50"
                            : full
                              ? "bg-foreground/10 text-muted-foreground"
                              : "bg-neon-crimson text-white shadow-[0_0_12px_-4px_var(--neon-crimson)]"
                        }`}
                      >
                        {isHost ? "ești gazdă" : joined ? "✓ vin" : full ? "plin" : "vin și eu"}
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* Divider */}
      <div className="px-4 my-5"><div className="h-px bg-foreground/10" /></div>

      {/* Active groups */}
      {groups.length > 0 && (
        <section id="groups" className="px-4 space-y-2 scroll-mt-4 mb-5">
          <div className="font-mono text-[10px] uppercase tracking-widest text-neon-green flex items-center gap-1.5">
            <Users size={11} /> găști active · {groups.length}
          </div>
          {groups.map((g: any) => (
            <Link key={g.id} to="/app/chat/$id" params={{ id: g.id }}
              className="flex items-center gap-3 p-3 rounded-xl bg-foreground/[0.04] border border-foreground/10 active:scale-[0.99] transition">
              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-neon-green to-neon-purple flex items-center justify-center font-display font-black text-white">
                {(g.title ?? "G")[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-display font-bold text-sm truncate">{g.title ?? "Haită fără nume"}</div>
                <div className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">grup · {new Date(g.last_message_at).toLocaleDateString("ro-RO")}</div>
              </div>
              <MessageCircle className="text-neon-green" size={18} />
            </Link>
          ))}
        </section>
      )}

      {/* Friends */}
      <section id="friends" className="px-4 space-y-2 scroll-mt-4">
        <div className="flex items-center justify-between">
          <div className="font-mono text-[10px] uppercase tracking-widest text-neon-purple flex items-center gap-1.5">
            <Users size={11} /> haita ta · {friends.length}
          </div>
          {friends.length > 0 && (
            <Link to="/app/friends" className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
              gestionează →
            </Link>
          )}
        </div>
        {isLoading ? (
          <div className="py-8 text-center font-mono text-[10px] uppercase tracking-widest text-muted-foreground">se încarcă…</div>
        ) : friends.length === 0 ? (
          <Link to="/app/friends" className="block py-6 rounded-2xl border border-dashed border-foreground/15 text-center">
            <div className="text-2xl mb-1">🍷</div>
            <div className="font-display font-bold text-sm">Zero oxidați în haită</div>
            <div className="text-xs text-muted-foreground mt-1">Adaugă prieteni →</div>
          </Link>
        ) : (
          <div className="space-y-1.5">
            {friends.map((p: any) => (
              <div key={p.id} className="flex items-center gap-3 p-2.5 rounded-xl bg-foreground/[0.04] border border-foreground/10">
                <Link to="/app/user/$id" params={{ id: p.id }} className="h-9 w-9 rounded-full overflow-hidden bg-gradient-to-br from-neon-crimson to-neon-purple flex items-center justify-center font-display font-black text-white shrink-0 text-sm">
                  {p.avatar_url ? <img src={p.avatar_url} alt="" className="h-full w-full object-cover" /> : (p.handle ?? "?")[0]?.toUpperCase()}
                </Link>
                <Link to="/app/user/$id" params={{ id: p.id }} className="flex-1 min-w-0">
                  <div className="font-display font-bold text-sm truncate">@{p.handle ?? p.display_name}</div>
                  <div className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground truncate">{p.city?.name ?? "—"}</div>
                </Link>
                <button onClick={() => startDM(p.id)}
                  className="px-2.5 py-1.5 rounded-md border border-neon-green/40 text-neon-green font-mono text-[9px] uppercase tracking-widest flex items-center gap-1 active:scale-95">
                  <MessageCircle size={11} /> dm
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

