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

  const hostIds = Array.from(new Set(liveParties.map(p => p.host_id)));
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

  return (
    <div className="px-4 pt-6 pb-4 space-y-4">
      <header>
        <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-neon-purple">// organizare șpriț</div>
        <h1 className="font-display font-black text-2xl mt-1 tracking-tight">organizare șpriț.</h1>
        <p className="text-xs text-muted-foreground mt-1">Cheamă haita, fă o gașcă, stabiliți unde turnați diseară.</p>
      </header>

      {/* New group CTA */}
      <Link
        to="/app/inbox"
        className="flex items-center gap-3 p-3 rounded-2xl bg-gradient-to-r from-neon-purple/20 via-neon-crimson/15 to-neon-green/15 border border-neon-purple/40 active:scale-[0.99] transition"
      >
        <div className="h-10 w-10 rounded-xl bg-neon-purple/20 border border-neon-purple/50 flex items-center justify-center">
          <Plus className="text-neon-purple" size={20} strokeWidth={2.6} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-display font-bold text-sm">Fă gașcă nouă</div>
          <div className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">invită oxidați · stabiliți loc</div>
        </div>
        <div className="font-display text-neon-purple">→</div>
      </Link>

      {/* Active groups */}
      {groups.length > 0 && (
        <section className="space-y-2">
          <div className="font-mono text-[10px] uppercase tracking-widest text-neon-green flex items-center gap-1.5">
            <Users size={11} /> găști active ({groups.length})
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
      <section className="space-y-2">
        <div className="font-mono text-[10px] uppercase tracking-widest text-neon-crimson flex items-center gap-1.5">
          <Users size={11} /> haita ta ({friends.length})
        </div>
        {isLoading ? (
          <div className="py-8 text-center font-mono text-[10px] uppercase tracking-widest text-muted-foreground">se încarcă…</div>
        ) : friends.length === 0 ? (
          <Link to="/app/friends" className="block py-8 rounded-2xl border border-dashed border-foreground/15 text-center">
            <div className="text-3xl mb-1">🍷</div>
            <div className="font-display font-bold text-sm">Zero oxidați în haită</div>
            <div className="text-xs text-muted-foreground mt-1">Adaugă prieteni →</div>
          </Link>
        ) : (
          friends.map((p: any) => (
            <div key={p.id} className="flex items-center gap-3 p-3 rounded-xl bg-foreground/[0.04] border border-foreground/10">
              <Link to="/app/user/$id" params={{ id: p.id }} className="h-10 w-10 rounded-full overflow-hidden bg-gradient-to-br from-neon-crimson to-neon-purple flex items-center justify-center font-display font-black text-white shrink-0">
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
          ))
        )}
      </section>
    </div>
  );
}

