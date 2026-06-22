import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { X, Send } from "lucide-react";

type Msg = {
  id: string;
  user_id: string;
  body: string;
  created_at: string;
  author?: { handle: string | null; display_name: string | null; avatar_url: string | null } | null;
};

export default function VenueNightChat({
  venueId,
  venueName,
  date,
  onClose,
}: {
  venueId: string;
  venueName: string;
  date: string;
  onClose: () => void;
}) {
  const { user } = useAuth();
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancel = false;
    (async () => {
      const { data } = await supabase
        .from("venue_night_chats")
        .select("id, user_id, body, created_at, author:profiles!venue_night_chats_user_id_fkey(handle, display_name, avatar_url)")
        .eq("venue_id", venueId)
        .eq("intent_date", date)
        .order("created_at", { ascending: true })
        .limit(200);
      if (cancel) return;
      setMsgs((data as any) ?? []);
      requestAnimationFrame(() => scrollRef.current?.scrollTo({ top: 999999 }));
    })();
    return () => { cancel = true; };
  }, [venueId, date]);

  useEffect(() => {
    const ch = supabase
      .channel(`vnc:${venueId}:${date}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "venue_night_chats", filter: `venue_id=eq.${venueId}` },
        async (payload) => {
          const row = payload.new as any;
          if (row.intent_date !== date) return;
          // hydrate author
          const { data: prof } = await supabase
            .from("profiles")
            .select("handle, display_name, avatar_url")
            .eq("id", row.user_id)
            .maybeSingle();
          setMsgs((prev) => prev.some(m => m.id === row.id) ? prev : [...prev, { ...row, author: prof }]);
          requestAnimationFrame(() => scrollRef.current?.scrollTo({ top: 999999, behavior: "smooth" }));
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [venueId, date]);

  async function send() {
    if (!user || !body.trim()) return;
    setSending(true);
    try {
      const { error } = await supabase.from("venue_night_chats").insert({
        venue_id: venueId,
        intent_date: date,
        user_id: user.id,
        body: body.trim().slice(0, 240),
      } as any);
      if (error) throw error;
      setBody("");
    } catch (e: any) {
      toast.error(e.message ?? "Eroare la trimitere");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[80] bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center" onClick={onClose}>
      <div
        className="w-full sm:max-w-md h-[80vh] sm:h-[70vh] sm:rounded-3xl rounded-t-3xl bg-[#0a0a0a] border border-white/10 flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <div className="min-w-0">
            <div className="text-[10px] font-mono uppercase tracking-[0.25em] text-[#ffea00]">chat diseară</div>
            <div className="text-[15px] text-white font-semibold truncate">{venueName}</div>
          </div>
          <button onClick={onClose} className="h-9 w-9 rounded-full bg-white/5 border border-white/10 text-white/70 flex items-center justify-center">
            <X size={16} />
          </button>
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
          {msgs.length === 0 && (
            <div className="text-center text-white/40 text-sm pt-12">
              Nimeni n-a scris încă.<br/>Sparge gheața 👋
            </div>
          )}
          {msgs.map((m) => {
            const mine = m.user_id === user?.id;
            return (
              <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"} gap-2`}>
                {!mine && (
                  <div className="size-7 rounded-full bg-white/10 overflow-hidden shrink-0">
                    {m.author?.avatar_url && <img src={m.author.avatar_url} alt="" className="h-full w-full object-cover" />}
                  </div>
                )}
                <div className={`max-w-[75%] rounded-2xl px-3 py-2 ${mine ? "bg-[#ffea00] text-black" : "bg-white/[0.07] text-white"}`}>
                  {!mine && (
                    <div className="text-[10px] text-white/50 mb-0.5">@{m.author?.handle ?? "anon"}</div>
                  )}
                  <div className="text-[14px] leading-snug whitespace-pre-wrap break-words">{m.body}</div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="border-t border-white/10 p-2 flex gap-2">
          <input
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") send(); }}
            maxLength={240}
            placeholder="scrie ceva..."
            className="flex-1 rounded-full bg-white/5 border border-white/10 px-4 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-[#ffea00]/40"
          />
          <button onClick={send} disabled={sending || !body.trim()} className="h-10 w-10 rounded-full bg-[#ffea00] text-black flex items-center justify-center disabled:opacity-40">
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
