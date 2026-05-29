import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { ArrowLeft, Send, Users } from "lucide-react";

export const Route = createFileRoute("/app/chat/$id")({
  head: () => ({ meta: [{ title: "Chat · OXIDAȚII" }] }),
  component: ChatPage,
});

type Msg = { id: string; sender_id: string; body: string; created_at: string };

function ChatPage() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const nav = useNavigate();
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["chat", id, user?.id],
    enabled: !!user,
    queryFn: async () => {
      const [{ data: conv }, { data: members }, { data: messages }] = await Promise.all([
        supabase.from("conversations").select("id,kind,title,party_id").eq("id", id).single(),
        supabase.from("conversation_members").select("user_id").eq("conversation_id", id),
        supabase.from("messages").select("id,sender_id,body,created_at").eq("conversation_id", id).order("created_at"),
      ]);
      const otherIds = (members ?? []).map(m => m.user_id);
      const { data: profs } = otherIds.length
        ? await supabase.from("profiles").select("id,handle,display_name,avatar_url").in("id", otherIds)
        : { data: [] };
      const profMap = new Map((profs ?? []).map((p: any) => [p.id, p]));
      return { conv: conv ?? { id, kind: "dm", title: null, party_id: null }, members: members ?? [], messages: messages ?? [], profMap };
    },
  });

  // Mark as read
  useEffect(() => {
    if (!user) return;
    supabase.from("conversation_members").update({ last_read_at: new Date().toISOString() })
      .eq("conversation_id", id).eq("user_id", user.id).then(() => {});
  }, [id, user, data?.messages.length]);

  // Realtime new messages
  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel(`chat-${id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${id}` }, (payload) => {
        qc.setQueryData(["chat", id, user.id], (old: any) => {
          if (!old) return old;
          const m = payload.new as Msg;
          if (old.messages.some((x: Msg) => x.id === m.id)) return old;
          return { ...old, messages: [...old.messages, m] };
        });
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [id, user, qc]);

  // Scroll to bottom on new message
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [data?.messages.length]);

  const send = async () => {
    if (!user || !text.trim() || sending) return;
    const body = text.trim();
    setText(""); setSending(true);
    const { error } = await supabase.from("messages").insert({ conversation_id: id, sender_id: user.id, body });
    setSending(false);
    if (error) { alert(error.message); setText(body); }
  };

  const otherProfiles = data ? (data.members.filter(m => m.user_id !== user?.id).map(m => data.profMap.get(m.user_id)).filter(Boolean)) : [];
  const title = data?.conv.kind === "dm"
    ? (otherProfiles[0]?.handle ? `@${otherProfiles[0].handle}` : otherProfiles[0]?.display_name ?? "Conversație")
    : (data?.conv.title ?? `Grup (${data?.members.length ?? 0})`);

  return (
    <div className="fixed inset-0 flex flex-col bg-background">
      <header className="flex items-center gap-3 px-3 py-3 border-b border-foreground/10 backdrop-blur bg-background/80">
        <button onClick={() => nav({ to: "/app/inbox" })} className="h-9 w-9 rounded-full bg-foreground/10 flex items-center justify-center">
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1 min-w-0">
          <div className="font-display font-black truncate">{title}</div>
          <div className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground flex items-center gap-1">
            {data?.conv.kind !== "dm" && <Users size={9} />}
            {data?.members.length ?? 0} {data?.conv.kind === "dm" ? "dm" : "membri"}
          </div>
        </div>
        {data?.conv.kind === "dm" && otherProfiles[0] && (
          <Link to="/app/user/$id" params={{ id: otherProfiles[0].id }}>
            {otherProfiles[0].avatar_url
              ? <img src={otherProfiles[0].avatar_url} className="h-9 w-9 rounded-full object-cover" alt="" />
              : <div className="h-9 w-9 rounded-full bg-gradient-to-br from-neon-crimson to-neon-purple" />}
          </Link>
        )}
      </header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-4 space-y-2">
        {isLoading ? (
          <div className="text-center font-mono text-xs text-muted-foreground py-8">se încarcă...</div>
        ) : data?.messages.length === 0 ? (
          <div className="text-center py-12 space-y-1">
            <div className="text-3xl">👋</div>
            <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">trimite primul mesaj</div>
          </div>
        ) : (
          data?.messages.map((m, i) => {
            const mine = m.sender_id === user?.id;
            const prev = data.messages[i - 1];
            const showSender = !mine && data.conv.kind !== "dm" && (!prev || prev.sender_id !== m.sender_id);
            const sender = data.profMap.get(m.sender_id);
            return (
              <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[78%] ${mine ? "items-end" : "items-start"} flex flex-col`}>
                  {showSender && (
                    <div className="font-mono text-[9px] uppercase tracking-widest text-neon-purple px-1 mb-0.5">
                      @{sender?.handle ?? sender?.display_name ?? "?"}
                    </div>
                  )}
                  <div className={`px-3 py-2 rounded-2xl text-sm leading-snug ${
                    mine
                      ? "bg-neon-green text-background rounded-br-sm"
                      : "bg-foreground/10 text-foreground rounded-bl-sm"
                  }`}>
                    {m.body}
                  </div>
                  <div className="font-mono text-[9px] text-muted-foreground px-1 mt-0.5">
                    {new Date(m.created_at).toLocaleTimeString("ro-RO", { hour: "2-digit", minute: "2-digit" })}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <form onSubmit={(e) => { e.preventDefault(); send(); }}
        className="flex items-end gap-2 p-3 border-t border-foreground/10 bg-background pb-[max(env(safe-area-inset-bottom),0.75rem)]">
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
          placeholder="scrie..."
          rows={1}
          className="flex-1 resize-none max-h-32 px-3 py-2.5 rounded-2xl bg-foreground/5 border border-foreground/15 font-display text-sm focus:outline-none focus:border-neon-green/50"
        />
        <button type="submit" disabled={!text.trim() || sending}
          className="h-11 w-11 rounded-full bg-neon-green text-background flex items-center justify-center disabled:opacity-40 shrink-0">
          <Send size={18} strokeWidth={2.6} />
        </button>
      </form>
    </div>
  );
}
