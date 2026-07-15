import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Vote, Check, X, Trophy, Search, Plus, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Venue = { id: string; name: string; city_id?: string | null };
type PollOption = {
  id: string;
  venue_id: string | null;
  venue_name: string | null;
  label: string | null;
  source: string;
  votes: number;
  lat?: number | null;
  lng?: number | null;
};
type Poll = {
  id: string;
  host_id: string;
  conversation_id: string | null;
  title: string | null;
  status: string;
  expires_at: string;
  my_vote: string | null;
  options: PollOption[];
};

/** Create a new decision poll. Used from squad / chat. */
export function CreateDecisionPollSheet({
  open,
  onOpenChange,
  conversationId,
  cityId,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  conversationId?: string | null;
  cityId?: string | null;
  onCreated?: (pollId: string) => void;
}) {
  const [picked, setPicked] = useState<Venue[]>([]);
  const [search, setSearch] = useState("");
  const [minutes, setMinutes] = useState(30);

  // suggestions: top venues by recent check-ins in city (proxy for Spritz Index)
  const { data: suggested = [] } = useQuery({
    queryKey: ["decision-suggested", cityId ?? "all"],
    enabled: open,
    queryFn: async () => {
      let q = supabase.from("venues").select("id,name,city_id").limit(8);
      if (cityId && cityId !== "all") q = q.eq("city_id", cityId);
      const { data } = await q;
      return (data ?? []) as Venue[];
    },
  });

  const { data: searchResults = [] } = useQuery({
    queryKey: ["decision-search", search],
    enabled: open && search.length >= 2,
    queryFn: async () => {
      const { data } = await supabase
        .from("venues")
        .select("id,name,city_id")
        .ilike("name", `%${search}%`)
        .limit(15);
      return (data ?? []) as Venue[];
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      if (picked.length < 2) throw new Error("Adaugă cel puțin 2 opțiuni");
      const { data, error } = await supabase.rpc("create_decision_poll", {
        _conversation_id: conversationId ?? null,
        _venue_ids: picked.map((v) => v.id),
        _expires_minutes: minutes,
        _title: null,
      } as never);
      if (error) throw error;
      return data as string;
    },
    onSuccess: (id) => {
      toast.success("Sondaj trimis 🗳️");
      setPicked([]);
      onCreated?.(id);
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggle = (v: Venue) =>
    setPicked((p) => (p.find((x) => x.id === v.id) ? p.filter((x) => x.id !== v.id) : [...p, v]));

  if (!open) return null;
  const list = search.length >= 2 ? searchResults : suggested;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center bg-black/65"
      onClick={() => onOpenChange(false)}
    >
      <div
        className="w-full max-w-md max-h-[88vh] overflow-hidden rounded-t-3xl bg-[#0c0a18] border-t border-white/10 flex flex-col"
        onClick={(e) => e.stopPropagation()}
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Vote size={18} className="text-[#c724ff]" />
            <div>
              <div className="font-bold text-white">Unde mergem?</div>
              <div className="text-[10px] uppercase tracking-widest text-white/40">
                creează vot pentru grup
              </div>
            </div>
          </div>
          <button
            onClick={() => onOpenChange(false)}
            className="h-7 w-7 grid place-items-center rounded-full border border-white/15 text-white/60"
          >
            <X size={13} />
          </button>
        </div>

        <div className="p-4 border-b border-white/10 space-y-3">
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Caută local..."
              className="w-full pl-9 pr-3 py-2.5 rounded-full bg-white/[0.05] border border-white/10 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-[#c724ff]/40"
            />
          </div>
          {picked.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {picked.map((v) => (
                <button
                  key={v.id}
                  onClick={() => toggle(v)}
                  className="text-[11px] px-2.5 py-1 rounded-full bg-gradient-to-r from-[#ff3d8b]/30 to-[#c724ff]/30 border border-[#c724ff]/40 text-white flex items-center gap-1"
                >
                  {v.name} <X size={10} />
                </button>
              ))}
            </div>
          )}
          <div className="flex items-center gap-2 text-xs">
            <Clock size={12} className="text-white/40" />
            <span className="text-white/50">expiră în</span>
            {[15, 30, 60].map((m) => (
              <button
                key={m}
                onClick={() => setMinutes(m)}
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                  minutes === m
                    ? "bg-[#c724ff]/30 border border-[#c724ff]/50 text-white"
                    : "border border-white/15 text-white/50"
                }`}
              >
                {m}m
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-y-auto p-3 space-y-1.5 flex-1">
          <div className="text-[10px] uppercase tracking-widest text-white/40 px-2 mb-1">
            {search.length >= 2 ? "rezultate" : "sugestii din zona ta"}
          </div>
          {list.length === 0 && (
            <div className="text-center text-white/40 text-sm py-6">Niciun rezultat.</div>
          )}
          {list.map((v) => {
            const isPicked = !!picked.find((x) => x.id === v.id);
            return (
              <button
                key={v.id}
                onClick={() => toggle(v)}
                className={`w-full text-left p-3 rounded-2xl border flex items-center gap-3 transition ${
                  isPicked
                    ? "bg-[#c724ff]/10 border-[#c724ff]/40"
                    : "bg-white/[0.03] border-white/10 hover:border-white/25"
                }`}
              >
                <div className="flex-1 font-medium text-white text-sm">{v.name}</div>
                {isPicked ? (
                  <Check size={15} className="text-[#39ffd2]" />
                ) : (
                  <Plus size={15} className="text-white/40" />
                )}
              </button>
            );
          })}
        </div>

        <div className="p-4 border-t border-white/10">
          <button
            disabled={picked.length < 2 || create.isPending}
            onClick={() => create.mutate()}
            className="w-full py-3 rounded-full font-bold text-sm uppercase tracking-wider bg-gradient-to-r from-[#ff3d8b] to-[#c724ff] text-white disabled:opacity-40 active:scale-[0.98] transition"
          >
            {create.isPending ? "trimit..." : `trimite vot (${picked.length})`}
          </button>
        </div>
      </div>
    </div>
  );
}

/** Render an active poll card (in chat / squad). Realtime updates. */
export function DecisionPollCard({ pollId }: { pollId: string }) {
  const qc = useQueryClient();
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);

  const { data: poll } = useQuery({
    queryKey: ["decision-poll", pollId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_decision_poll", {
        _poll_id: pollId,
      } as never);
      if (error) throw error;
      return data as unknown as Poll;
    },
  });

  useEffect(() => {
    const ch = supabase
      .channel(`poll:${pollId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "decision_votes", filter: `poll_id=eq.${pollId}` },
        () => qc.invalidateQueries({ queryKey: ["decision-poll", pollId] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [pollId, qc]);

  const vote = useMutation({
    mutationFn: async (optionId: string) => {
      const { guardRateLimit } = await import("@/lib/rateLimit");
      if (!(await guardRateLimit("vote"))) throw new Error("Prea multe voturi. Așteaptă un minut.");
      const { error } = await supabase.rpc("cast_decision_vote", {
        _poll_id: pollId,
        _option_id: optionId,
      } as never);
      if (error) throw error;
    },
    onSuccess: async () => {
      const { haptic } = await import("@/lib/native");
      haptic("light");
      qc.invalidateQueries({ queryKey: ["decision-poll", pollId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const totalVotes = useMemo(() => poll?.options.reduce((a, o) => a + o.votes, 0) ?? 0, [poll]);
  const expired = poll ? new Date(poll.expires_at).getTime() < now : false;
  const winner = expired && poll ? [...poll.options].sort((a, b) => b.votes - a.votes)[0] : null;
  const minsLeft = poll
    ? Math.max(0, Math.round((new Date(poll.expires_at).getTime() - now) / 60_000))
    : 0;

  if (!poll) {
    return (
      <div className="rounded-2xl bg-white/[0.03] border border-white/10 p-4 animate-pulse h-32" />
    );
  }

  return (
    <div className="rounded-2xl bg-gradient-to-br from-[#1a0e2a] to-[#0c0a18] border border-[#c724ff]/30 overflow-hidden">
      <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Vote size={15} className="text-[#c724ff]" />
          <div className="font-bold text-white text-sm">Unde mergem?</div>
        </div>
        <div
          className={`text-[10px] uppercase tracking-widest font-bold ${
            expired ? "text-[#ffea00]" : "text-white/50"
          }`}
        >
          {expired ? "închis" : `${minsLeft}m`}
        </div>
      </div>
      <div className="p-3 space-y-2">
        {poll.options
          .slice()
          .sort((a, b) => b.votes - a.votes)
          .map((o) => {
            const pct = totalVotes ? Math.round((o.votes / totalVotes) * 100) : 0;
            const isMine = poll.my_vote === o.id;
            const isWinner = winner?.id === o.id;
            return (
              <button
                key={o.id}
                disabled={expired}
                onClick={() => vote.mutate(o.id)}
                className={`relative w-full text-left p-3 rounded-xl overflow-hidden border transition ${
                  isWinner
                    ? "border-[#ffea00]/60 bg-[#ffea00]/5"
                    : isMine
                      ? "border-[#39ffd2]/50 bg-[#39ffd2]/5"
                      : "border-white/10 bg-white/[0.03] hover:border-white/25"
                } disabled:cursor-not-allowed`}
              >
                <div
                  className="absolute inset-y-0 left-0 bg-gradient-to-r from-[#c724ff]/20 to-[#ff3d8b]/10 transition-all"
                  style={{ width: `${pct}%` }}
                />
                <div className="relative flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    {isWinner && <Trophy size={13} className="text-[#ffea00] shrink-0" />}
                    {isMine && !isWinner && <Check size={13} className="text-[#39ffd2] shrink-0" />}
                    <span className="font-medium text-white text-sm truncate">
                      {o.venue_name ?? o.label ?? "—"}
                    </span>
                  </div>
                  <div className="text-[11px] font-bold text-white/70 tabular-nums">
                    {o.votes} • {pct}%
                  </div>
                </div>
              </button>
            );
          })}
      </div>
      {expired && winner && (
        <div className="px-4 py-3 border-t border-white/10 text-center text-[11px] uppercase tracking-widest text-[#ffea00] font-bold">
          🏆 {winner.venue_name ?? "—"} a câștigat
        </div>
      )}
    </div>
  );
}
