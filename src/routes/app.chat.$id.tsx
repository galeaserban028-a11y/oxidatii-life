import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { ArrowLeft, Send, Smile, Image as ImageIcon, Users } from "lucide-react";

export const Route = createFileRoute("/app/chat/$id")({
  head: () => ({ meta: [{ title: "Chat · OXIDAȚII" }] }),
  component: ChatPage,
});

type Msg = { id: string; sender_id: string; body: string; created_at: string };
type Profile = { id: string; handle?: string | null; display_name?: string | null; avatar_url?: string | null };

function ChatPage() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const nav = useNavigate();
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const taRef = useRef<HTMLTextAreaElement | null>(null);

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

  // Auto-grow textarea
  useEffect(() => {
    const el = taRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 140) + "px";
  }, [text]);

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

  const otherProfiles: Profile[] = data
    ? (data.members.filter(m => m.user_id !== user?.id).map(m => data.profMap.get(m.user_id)).filter(Boolean) as Profile[])
    : [];
  const peer = otherProfiles[0];
  const title = data?.conv.kind === "dm"
    ? (peer?.handle ? `@${peer.handle}` : peer?.display_name ?? "Conversație")
    : (data?.conv.title ?? `Grup (${data?.members.length ?? 0})`);
  const subtitle = data?.conv.kind === "dm"
    ? (peer?.display_name ?? "online recent")
    : `${data?.members.length ?? 0} membri`;

  // Group consecutive messages by sender for IG-style bubbles
  const grouped = useMemo(() => {
    if (!data) return [] as { sender_id: string; items: Msg[]; mine: boolean }[];
    const out: { sender_id: string; items: Msg[]; mine: boolean }[] = [];
    for (const m of data.messages) {
      const last = out[out.length - 1];
      const mine = m.sender_id === user?.id;
      if (last && last.sender_id === m.sender_id && (new Date(m.created_at).getTime() - new Date(last.items[last.items.length - 1].created_at).getTime() < 4 * 60_000)) {
        last.items.push(m);
      } else {
        out.push({ sender_id: m.sender_id, items: [m], mine });
      }
    }
    return out;
  }, [data, user?.id]);

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-background">
      {/* Header */}
      <header className="relative flex items-center gap-3 px-3 pt-[max(env(safe-area-inset-top),0.5rem)] pb-3 border-b border-foreground/[0.06] bg-background/85 backdrop-blur-xl">
        <button
          onClick={() => nav({ to: "/app/inbox" })}
          aria-label="înapoi"
          className="h-10 w-10 -ml-1 rounded-full flex items-center justify-center active:bg-foreground/10 transition"
        >
          <ArrowLeft size={22} />
        </button>

        {data?.conv.kind === "dm" && peer ? (
          <Link to="/app/user/$id" params={{ id: peer.id }} className="flex items-center gap-3 flex-1 min-w-0 active:opacity-70 transition">
            <div className="relative shrink-0">
              <div className="h-10 w-10 rounded-full p-[2px] bg-[conic-gradient(from_140deg,theme(colors.neon-crimson),theme(colors.neon-purple),theme(colors.neon-green),theme(colors.neon-crimson))]">
                {peer.avatar_url
                  ? <img src={peer.avatar_url} className="h-full w-full rounded-full object-cover border-2 border-background" alt="" />
                  : <div className="h-full w-full rounded-full border-2 border-background bg-gradient-to-br from-neon-crimson to-neon-purple flex items-center justify-center font-display font-black text-white">{(peer.handle ?? "?")[0]?.toUpperCase()}</div>}
              </div>
            </div>
            <div className="flex-1 min-w-0 leading-tight">
              <div className="font-display font-black text-[15px] truncate">{title}</div>
              <div className="text-[11px] text-muted-foreground truncate">{subtitle}</div>
            </div>
          </Link>
        ) : (
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-neon-purple to-neon-crimson flex items-center justify-center shrink-0">
              <Users size={18} className="text-white" />
            </div>
            <div className="flex-1 min-w-0 leading-tight">
              <div className="font-display font-black text-[15px] truncate">{title}</div>
              <div className="text-[11px] text-muted-foreground truncate">{subtitle}</div>
            </div>
          </div>
        )}
      </header>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-4">
        {isLoading ? (
          <div className="flex flex-col items-center gap-2 py-12">
            <div className="h-8 w-8 rounded-full border-2 border-foreground/15 border-t-foreground animate-spin" />
            <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">se încarcă</div>
          </div>
        ) : data?.messages.length === 0 ? (
          <div className="text-center py-16 space-y-3 animate-fade-in">
            <div className="mx-auto h-20 w-20 rounded-full p-[3px] bg-[conic-gradient(from_140deg,theme(colors.neon-crimson),theme(colors.neon-purple),theme(colors.neon-green),theme(colors.neon-crimson))]">
              {peer?.avatar_url
                ? <img src={peer.avatar_url} className="h-full w-full rounded-full object-cover border-2 border-background" alt="" />
                : <div className="h-full w-full rounded-full border-2 border-background bg-gradient-to-br from-neon-crimson to-neon-purple" />}
            </div>
            <div className="font-display font-black text-base">{title}</div>
            <div className="text-xs text-muted-foreground">Spune ceva fain. Un „salut” merge mereu 👋</div>
          </div>
        ) : (
          <div className="space-y-4 max-w-2xl mx-auto">
            {grouped.map((g, gi) => {
              const sender = data!.profMap.get(g.sender_id) as Profile | undefined;
              const showSender = !g.mine && data!.conv.kind !== "dm";
              const last = g.items[g.items.length - 1];
              return (
                <div key={gi} className={`flex gap-2 ${g.mine ? "justify-end" : "justify-start"} animate-fade-in`}>
                  {!g.mine && (
                    <div className="self-end shrink-0">
                      {sender?.avatar_url
                        ? <img src={sender.avatar_url} className="h-7 w-7 rounded-full object-cover" alt="" />
                        : <div className="h-7 w-7 rounded-full bg-gradient-to-br from-neon-crimson to-neon-purple" />}
                    </div>
                  )}
                  <div className={`max-w-[78%] flex flex-col gap-[3px] ${g.mine ? "items-end" : "items-start"}`}>
                    {showSender && (
                      <div className="text-[10px] text-muted-foreground px-2.5">
                        @{sender?.handle ?? sender?.display_name ?? "?"}
                      </div>
                    )}
                    {g.items.map((m, i) => {
                      const first = i === 0;
                      const lastOne = i === g.items.length - 1;
                      // IG-style bubble rounding: tight on the "tail" side
                      const radius = g.mine
                        ? `rounded-3xl ${first ? "" : "rounded-tr-md"} ${lastOne ? "" : "rounded-br-md"}`
                        : `rounded-3xl ${first ? "" : "rounded-tl-md"} ${lastOne ? "" : "rounded-bl-md"}`;
                      return (
                        <div
                          key={m.id}
                          className={`px-4 py-2 text-[15px] leading-snug break-words ${radius} ${
                            g.mine
                              ? "text-white bg-gradient-to-br from-neon-crimson via-neon-purple to-neon-purple shadow-[0_6px_20px_-8px_theme(colors.neon-purple/0.65)]"
                              : "bg-foreground/[0.07] text-foreground"
                          }`}
                        >
                          {m.body}
                        </div>
                      );
                    })}
                    <div className="text-[10px] text-muted-foreground px-2.5">
                      {new Date(last.created_at).toLocaleTimeString("ro-RO", { hour: "2-digit", minute: "2-digit" })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Composer */}
      <form
        onSubmit={(e) => { e.preventDefault(); send(); }}
        className="flex items-end gap-2 px-3 pt-2 pb-[max(env(safe-area-inset-bottom),0.6rem)] border-t border-foreground/[0.06] bg-background/85 backdrop-blur-xl"
      >
        <div className="flex-1 flex items-end gap-1.5 rounded-3xl bg-foreground/[0.06] border border-foreground/10 pl-3 pr-1.5 py-1.5 focus-within:border-foreground/25 transition-colors">
          <button type="button" aria-label="emoji" className="h-8 w-8 rounded-full flex items-center justify-center text-muted-foreground active:bg-foreground/10 transition shrink-0">
            <Smile size={20} />
          </button>
          <textarea
            ref={taRef}
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder="Trimite un mesaj…"
            rows={1}
            className="flex-1 resize-none max-h-[140px] bg-transparent border-0 outline-none py-1.5 text-[15px] placeholder:text-muted-foreground/70"
          />
          <button type="button" aria-label="imagine" className="h-8 w-8 rounded-full flex items-center justify-center text-muted-foreground active:bg-foreground/10 transition shrink-0">
            <ImageIcon size={18} />
          </button>
        </div>
        <button
          type="submit"
          disabled={!text.trim() || sending}
          aria-label="trimite"
          className="h-11 w-11 rounded-full flex items-center justify-center shrink-0 disabled:opacity-40 disabled:scale-95 transition-all bg-gradient-to-br from-neon-crimson via-neon-purple to-neon-purple text-white shadow-[0_8px_22px_-8px_theme(colors.neon-purple/0.7)] active:scale-95"
        >
          <Send size={18} strokeWidth={2.4} className="translate-x-[1px] -translate-y-[1px]" />
        </button>
      </form>
    </div>
  );
}
