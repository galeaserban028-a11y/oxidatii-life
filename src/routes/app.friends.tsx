import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

export const Route = createFileRoute("/app/friends")({
  head: () => ({ meta: [{ title: "Prieteni · OXIDAȚII" }] }),
  component: FriendsPage,
});

type Friendship = {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: "pending" | "accepted" | "blocked";
};

async function loadFriends(userId: string) {
  const { data: rows } = await supabase
    .from("friendships")
    .select("id, requester_id, addressee_id, status")
    .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`);
  const list = (rows ?? []) as Friendship[];

  const otherIds = Array.from(
    new Set(list.map((r) => (r.requester_id === userId ? r.addressee_id : r.requester_id))),
  );
  const { data: profiles } = otherIds.length
    ? await supabase.from("profiles").select("id, handle, display_name, avatar_url, rank, current_streak, longest_streak").in("id", otherIds)
    : { data: [] as any[] };
  const profMap = new Map((profiles ?? []).map((p: any) => [p.id, p]));

  const accepted = list.filter((r) => r.status === "accepted");
  const incoming = list.filter((r) => r.status === "pending" && r.addressee_id === userId);
  const outgoing = list.filter((r) => r.status === "pending" && r.requester_id === userId);

  return { accepted, incoming, outgoing, profMap, userId };
}

function FriendsPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["friends", user?.id],
    queryFn: () => loadFriends(user!.id),
    enabled: !!user,
  });

  const { data: searchResults } = useQuery({
    queryKey: ["friend-search", search],
    queryFn: async () => {
      const q = search.trim().toLowerCase().replace(/^@/, "");
      if (q.length < 2) return [];
      const { data } = await supabase
        .from("profiles")
        .select("id, handle, display_name, avatar_url, rank")
        .or(`handle.ilike.%${q}%,display_name.ilike.%${q}%`)
        .neq("id", user?.id ?? "")
        .limit(10);
      return data ?? [];
    },
    enabled: !!user && search.trim().length >= 2,
  });

  async function sendRequest(addresseeId: string) {
    if (!user) return;
    const { error } = await supabase
      .from("friendships")
      .insert({ requester_id: user.id, addressee_id: addresseeId, status: "pending" });
    if (error) {
      if (error.code === "23505") toast.error("Există deja o cerere.");
      else toast.error(error.message);
      return;
    }
    toast.success("Cerere trimisă.");
    qc.invalidateQueries({ queryKey: ["friends"] });
  }

  async function accept(id: string) {
    const { error } = await supabase.from("friendships").update({ status: "accepted" }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Prieten nou.");
    qc.invalidateQueries({ queryKey: ["friends"] });
  }

  async function remove(id: string) {
    const { error } = await supabase.from("friendships").delete().eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["friends"] });
  }

  if (!user) {
    return (
      <div className="px-4 pt-6 pb-4 text-center space-y-3">
        <p className="text-sm text-muted-foreground">Fă-ți cont ca să adaugi prieteni.</p>
        <Link to="/signup" className="inline-block font-display uppercase text-sm tracking-widest px-5 py-3 rounded-md text-white"
          style={{ background: "var(--gradient-chaos)" }}>Cont nou</Link>
      </div>
    );
  }

  return (
    <div className="px-4 pt-5 pb-6 space-y-5">
      <header>
        <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-neon-green">// PRIETENI</div>
        <h1 className="font-display uppercase text-2xl mt-1 leading-none">Băieții tăi.</h1>
        <p className="text-xs text-muted-foreground mt-1">Adaugă prieteni după @handle ca să-i vezi pe hartă când ies în oraș.</p>
      </header>

      {/* Step-by-step visual */}
      <div className="rounded-xl border border-foreground/10 p-4 space-y-3 bg-foreground/[0.02]">
        <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">cum adaugi prieteni</div>
        <div className="flex items-center gap-3">
          <div className="h-7 w-7 rounded-full bg-neon-green/15 text-neon-green flex items-center justify-center font-display text-xs shrink-0">1</div>
          <p className="text-sm">Scrie @handle-ul sau numele în căsuța de mai jos</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="h-7 w-7 rounded-full bg-neon-green/15 text-neon-green flex items-center justify-center font-display text-xs shrink-0">2</div>
          <p className="text-sm">Apasă <span className="font-display text-neon-crimson">+ adaugă</span> pe cel pe care-l cunoști</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="h-7 w-7 rounded-full bg-neon-green/15 text-neon-green flex items-center justify-center font-display text-xs shrink-0">3</div>
          <p className="text-sm">Când acceptă, îl vezi <span className="text-neon-purple font-display">live pe hartă</span> când iese</p>
        </div>
      </div>

      {/* Search */}
      <div className="space-y-2">
        <div className="relative">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="@handle sau nume..."
            className="w-full p-3 pl-10 rounded-xl bg-foreground/[0.05] border border-foreground/15 text-sm focus:outline-none focus:border-neon-crimson/50 transition-colors"
          />
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
          </svg>
        </div>

        {searchResults && searchResults.length > 0 && (
          <div className="space-y-1 rounded-xl border border-foreground/10 overflow-hidden">
            {searchResults.map((p: any) => {
              const alreadyKnown = data?.accepted.some((f) => f.requester_id === p.id || f.addressee_id === p.id)
                || data?.outgoing.some((f) => f.addressee_id === p.id)
                || data?.incoming.some((f) => f.requester_id === p.id);
              return (
                <div key={p.id} className="flex items-center gap-3 p-3 bg-foreground/[0.03] hover:bg-foreground/[0.06] transition-colors">
                  <Avatar p={p} />
                  <div className="flex-1 min-w-0">
                    <div className="font-display text-sm truncate">@{p.handle ?? p.display_name}</div>
                    <div className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">{p.rank}</div>
                  </div>
                  {alreadyKnown ? (
                    <span className="font-mono text-[9px] uppercase text-muted-foreground">deja</span>
                  ) : (
                    <button onClick={() => sendRequest(p.id)}
                      className="font-display uppercase text-[10px] tracking-widest px-4 py-2 rounded-lg text-white active:scale-95 transition-transform"
                      style={{ background: "var(--gradient-chaos)" }}>+ adaugă</button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {search.trim().length >= 2 && (!searchResults || searchResults.length === 0) && (
          <div className="text-center text-sm text-muted-foreground py-4">Niciun rezultat pentru "{search.trim()}"</div>
        )}
      </div>

      {isLoading || !data ? (
        <div className="space-y-2">{[0,1,2].map(i => <div key={i} className="h-14 rounded-xl bg-foreground/[0.04] animate-pulse" />)}</div>
      ) : (
        <>
          {/* Incoming */}
          {data.incoming.length > 0 && (
            <section className="space-y-2">
              <div className="font-mono text-[10px] uppercase tracking-widest text-neon-crimson">// cereri primite ({data.incoming.length})</div>
              {data.incoming.map((r) => {
                const p = data.profMap.get(r.requester_id);
                return (
                  <div key={r.id} className="flex items-center gap-3 p-3 rounded-xl bg-foreground/[0.04] border border-neon-crimson/30">
                    <Avatar p={p} />
                    <div className="flex-1 min-w-0">
                      <div className="font-display text-sm truncate">@{p?.handle ?? p?.display_name ?? "?"}</div>
                      <div className="font-mono text-[9px] uppercase text-muted-foreground">vrea să fie prieten</div>
                    </div>
                    <button onClick={() => accept(r.id)} className="font-display uppercase text-[10px] tracking-widest px-3 py-2 rounded-lg text-white active:scale-95 transition-transform"
                      style={{ background: "var(--gradient-chaos)" }}>accept</button>
                    <button onClick={() => remove(r.id)} className="font-mono text-[10px] uppercase text-muted-foreground px-2">x</button>
                  </div>
                );
              })}
            </section>
          )}

          {/* Accepted */}
          <section className="space-y-2">
            <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">// prietenii tăi ({data.accepted.length})</div>
            {data.accepted.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-foreground/15 p-8 text-center space-y-3">
                <div className="text-3xl opacity-30">🍷</div>
                <p className="text-sm text-muted-foreground">Niciun prieten încă.<br/>Caută-i după handle mai sus ↑</p>
              </div>
            ) : data.accepted.map((r) => {
              const otherId = r.requester_id === user.id ? r.addressee_id : r.requester_id;
              const p = data.profMap.get(otherId);
              const streak = p?.current_streak ?? 0;
              return (
                <div key={r.id} className="flex items-center gap-3 p-3 rounded-xl bg-foreground/[0.04]">
                  <Avatar p={p} />
                  <div className="flex-1 min-w-0">
                    <div className="font-display text-sm truncate">@{p?.handle ?? p?.display_name ?? "?"}</div>
                    <div className="font-mono text-[9px] uppercase text-muted-foreground">{p?.rank}</div>
                  </div>
                  {streak > 0 && (
                    <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-neon-crimson/10 border border-neon-crimson/30">
                      <span className="text-sm leading-none">🔥</span>
                      <span className="font-display text-xs leading-none text-neon-crimson">{streak}</span>
                    </div>
                  )}
                  <button onClick={() => remove(r.id)} className="font-mono text-[10px] uppercase text-muted-foreground px-2">scoate</button>
                </div>
              );
            })}
          </section>

          {/* Outgoing */}
          {data.outgoing.length > 0 && (
            <section className="space-y-2">
              <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">// trimise ({data.outgoing.length})</div>
              {data.outgoing.map((r) => {
                const p = data.profMap.get(r.addressee_id);
                return (
                  <div key={r.id} className="flex items-center gap-3 p-2 rounded-xl bg-foreground/[0.04] opacity-70">
                    <Avatar p={p} />
                    <div className="flex-1 min-w-0">
                      <div className="font-display text-sm truncate">@{p?.handle ?? p?.display_name ?? "?"}</div>
                      <div className="font-mono text-[9px] uppercase text-muted-foreground">așteaptă răspuns</div>
                    </div>
                    <button onClick={() => remove(r.id)} className="font-mono text-[10px] uppercase text-muted-foreground px-2">anulează</button>
                  </div>
                );
              })}
            </section>
          )}
        </>
      )}

      <Link to="/app/map" className="block text-center font-mono text-[10px] uppercase tracking-widest text-neon-purple py-4">
        → vezi-i pe hartă
      </Link>
    </div>
  );
}

function Avatar({ p }: { p: any }) {
  const initial = (p?.handle ?? p?.display_name ?? "?")[0]?.toUpperCase();
  return (
    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-neon-crimson to-neon-purple flex items-center justify-center font-display text-sm shrink-0 overflow-hidden">
      {p?.avatar_url ? <img src={p.avatar_url} alt="" className="h-full w-full object-cover" /> : initial}
    </div>
  );
}
