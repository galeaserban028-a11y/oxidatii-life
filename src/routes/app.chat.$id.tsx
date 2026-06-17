import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { ArrowLeft, Send, Smile, Image as ImageIcon, Users, Gift, X, Loader2, Mic, Palette, Play, Pause, MoreVertical } from "lucide-react";
import { notifyChatMessage } from "@/lib/notifications-extra.functions";
import { ReportDialog } from "@/components/app/ReportDialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export const Route = createFileRoute("/app/chat/$id")({
  head: () => ({ meta: [{ title: "Chat · OXIDAȚII" }] }),
  component: ChatPage,
});

type Msg = { id: string; sender_id: string; body: string; created_at: string };
type Profile = { id: string; handle?: string | null; display_name?: string | null; avatar_url?: string | null };
type Gift = { id: string; emoji: string; name: string; price_coins: number };

const QUICK_EMOJIS = ["😂", "❤️", "🔥", "🥲", "😍", "🥂", "🍻", "💀", "👀", "😎", "🥺", "🤝", "✨", "🤣", "😭", "🙌"];

type Theme = { id: string; name: string; bg: string; mine: string; mineShadow: string };
const THEMES: Theme[] = [
  { id: "noir",    name: "Noir",    bg: "bg-background",
    mine: "from-neon-crimson via-neon-purple to-neon-purple",
    mineShadow: "shadow-[0_6px_24px_-8px_rgba(198,107,255,0.65)]" },
  { id: "sunset",  name: "Sunset",  bg: "bg-[radial-gradient(120%_80%_at_50%_0%,#3a0e1a_0%,#170710_45%,#0a0508_100%)]",
    mine: "from-[#ff3d8b] via-[#ff3d8b] to-[#c33afd]",
    mineShadow: "shadow-[0_6px_24px_-8px_rgba(255,90,90,0.7)]" },
  { id: "midnight",name: "Midnight",bg: "bg-[radial-gradient(120%_80%_at_50%_0%,#0d1f3d_0%,#070d1a_50%,#020306_100%)]",
    mine: "from-[#3b82f6] via-[#7c3aed] to-[#06b6d4]",
    mineShadow: "shadow-[0_6px_24px_-8px_rgba(56,189,248,0.7)]" },
  { id: "forest",  name: "Forest",  bg: "bg-[radial-gradient(120%_80%_at_50%_0%,#0e2a1f_0%,#06140e_45%,#020806_100%)]",
    mine: "from-[#22c55e] via-[#10b981] to-[#0ea5e9]",
    mineShadow: "shadow-[0_6px_24px_-8px_rgba(34,197,94,0.6)]" },
  { id: "candy",   name: "Candy",   bg: "bg-[radial-gradient(120%_80%_at_50%_0%,#3a0e2a_0%,#1a0712_45%,#0a0508_100%)]",
    mine: "from-[#c724ff] via-[#c724ff] to-[#a78bfa]",
    mineShadow: "shadow-[0_6px_24px_-8px_rgba(244,114,182,0.6)]" },
  { id: "paper",   name: "Hârtie",  bg: "bg-[radial-gradient(120%_80%_at_50%_0%,#f5f3ee_0%,#eae6dd_60%,#d8d3c6_100%)] text-[#1a1410]",
    mine: "from-[#1a1410] via-[#1a1410] to-[#2d2418]",
    mineShadow: "shadow-[0_6px_20px_-8px_rgba(0,0,0,0.45)]" },
];

function useChatTheme(convId: string) {
  const key = `chat-theme:${convId}`;
  const [themeId, setThemeId] = useState<string>(() => {
    if (typeof localStorage === "undefined") return "noir";
    return localStorage.getItem(key) ?? "noir";
  });
  useEffect(() => { localStorage.setItem(key, themeId); }, [key, themeId]);
  const theme = THEMES.find(t => t.id === themeId) ?? THEMES[0];
  return { theme, themeId, setThemeId };
}

function ChatPage() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const nav = useNavigate();
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [showGifts, setShowGifts] = useState(false);
  const [showThemes, setShowThemes] = useState(false);
  const [uploading, setUploading] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const taRef = useRef<HTMLTextAreaElement | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const { theme, themeId, setThemeId } = useChatTheme(id);

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

  // Lock background scroll
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  // Scroll to bottom on new message
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [data?.messages.length]);

  const send = async (override?: string) => {
    if (!user) return;
    const body = (override ?? text).trim();
    if (!body || sending) return;
    if (!override) setText("");
    setSending(true);
    const { error } = await supabase.from("messages").insert({ conversation_id: id, sender_id: user.id, body });
    setSending(false);
    if (error) { alert(error.message); if (!override) setText(body); return; }
    notifyChatMessage({ data: { conversationId: id, preview: body } }).catch(() => {});
  };

  const insertEmoji = (e: string) => {
    setText(t => t + e);
    setShowEmoji(false);
    setTimeout(() => taRef.current?.focus(), 0);
  };

  const sendGift = async (g: Gift) => {
    if (!user) return;
    const ok = confirm(`Trimiți ${g.emoji} ${g.name} pentru ${g.price_coins} șprițuri?`);
    if (!ok) return;
    setShowGifts(false);
    const { error } = await supabase.rpc("send_chat_gift" as any, { _conversation_id: id, _gift_id: g.id });
    if (error) alert(error.message);
  };

  const uploadAndSend = async (file: Blob, ext: string, prefix: "📷" | "🎤", durationMs?: number) => {
    if (!user) return;
    setUploading(true);
    try {
      const path = `${user.id}/${id}/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("chat-media").upload(path, file, { contentType: file.type || `${prefix === "🎤" ? "audio" : "image"}/${ext}`, upsert: false });
      if (upErr) throw upErr;
      const { data: signed, error: signErr } = await supabase.storage.from("chat-media").createSignedUrl(path, 60 * 60 * 24 * 365 * 5);
      if (signErr) throw signErr;
      const url = signed.signedUrl;
      const body = prefix === "🎤" && durationMs
        ? `🎤 ${url}|${Math.round(durationMs / 1000)}`
        : `${prefix} ${url}`;
      const { error } = await supabase.from("messages").insert({ conversation_id: id, sender_id: user.id, body });
      if (error) throw error;
      notifyChatMessage({ data: { conversationId: id, preview: body.slice(0, 80) } }).catch(() => {});
    } catch (e: any) {
      alert(e.message ?? "nu am putut trimite");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const onPickImage = (file: File) => {
    const ext = file.name.split(".").pop() || "jpg";
    uploadAndSend(file, ext, "📷");
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

  const ui = (
    <div className={`fixed inset-0 z-[100] flex flex-col text-foreground ${theme.bg}`}>
      {/* Header */}
      <header className="relative flex items-center gap-3 px-3 pt-[max(env(safe-area-inset-top),0.5rem)] pb-3 border-b border-foreground/[0.06] bg-background/40 backdrop-blur-2xl">
        <button onClick={() => nav({ to: "/app/inbox" })} aria-label="înapoi"
          className="h-11 w-11 -ml-1 rounded-full flex items-center justify-center active:bg-foreground/10 transition">
          <ArrowLeft size={24} />
        </button>

        {data?.conv.kind === "dm" && peer ? (
          <Link to="/app/user/$id" params={{ id: peer.id }} className="flex items-center gap-3 flex-1 min-w-0 active:opacity-70 transition">
            <div className="h-12 w-12 rounded-full p-[2.5px] bg-[conic-gradient(from_140deg,theme(colors.neon-crimson),theme(colors.neon-purple),theme(colors.neon-green),theme(colors.neon-crimson))] shrink-0">
              {peer.avatar_url
                ? <img src={peer.avatar_url} className="h-full w-full rounded-full object-cover border-2 border-background" alt="" />
                : <div className="h-full w-full rounded-full border-2 border-background bg-gradient-to-br from-neon-crimson to-neon-purple flex items-center justify-center font-display font-black text-white text-lg">{(peer.handle ?? "?")[0]?.toUpperCase()}</div>}
            </div>
            <div className="flex-1 min-w-0 leading-tight">
              <div className="font-display font-black text-base truncate">{title}</div>
              <div className="text-[11px] text-muted-foreground truncate flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-neon-green inline-block" />{subtitle}
              </div>
            </div>
          </Link>
        ) : (
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="h-12 w-12 rounded-full bg-gradient-to-br from-neon-purple to-neon-crimson flex items-center justify-center shrink-0">
              <Users size={20} className="text-white" />
            </div>
            <div className="flex-1 min-w-0 leading-tight">
              <div className="font-display font-black text-base truncate">{title}</div>
              <div className="text-[11px] text-muted-foreground truncate">{subtitle}</div>
            </div>
          </div>
        )}

        <button onClick={() => setShowThemes(s => !s)} aria-label="temă"
          className={`h-10 w-10 rounded-full flex items-center justify-center active:bg-foreground/10 transition ${showThemes ? "text-neon-purple bg-foreground/10" : "text-muted-foreground"}`}>
          <Palette size={20} />
        </button>

        {peer && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button aria-label="mai multe"
                className="h-10 w-10 rounded-full flex items-center justify-center active:bg-foreground/10 transition text-muted-foreground">
                <MoreVertical size={20} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <ReportDialog targetType="user" targetId={peer.id} variant="menu-item" label={`Raportează @${peer.handle ?? "user"}`} />
              <DropdownMenuItem
                onClick={() => nav({ to: "/app/user/$id", params: { id: peer.id } })}>
                Deschide profilul
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </header>

      {/* Theme strip */}
      {showThemes && (
        <div className="px-3 py-3 border-b border-foreground/[0.06] bg-background/40 backdrop-blur-xl animate-fade-in">
          <div className="text-[10px] font-mono uppercase tracking-[0.25em] text-muted-foreground mb-2">temă fundal</div>
          <div className="flex gap-2 overflow-x-auto scrollbar-none pb-1">
            {THEMES.map(t => (
              <button key={t.id} onClick={() => setThemeId(t.id)}
                className={`shrink-0 flex flex-col items-center gap-1 transition active:scale-95 ${themeId === t.id ? "" : "opacity-70"}`}>
                <div className={`h-12 w-12 rounded-2xl border-2 ${themeId === t.id ? "border-neon-purple" : "border-foreground/15"} overflow-hidden ${t.bg}`}>
                  <div className={`h-full w-full bg-gradient-to-br ${t.mine} opacity-90`} />
                </div>
                <div className="text-[10px] font-mono uppercase tracking-wider">{t.name}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-4">
        {isLoading ? (
          <div className="flex flex-col items-center gap-2 py-12">
            <div className="h-8 w-8 rounded-full border-2 border-foreground/15 border-t-foreground animate-spin" />
            <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">se încarcă</div>
          </div>
        ) : data?.messages.length === 0 ? (
          <div className="text-center py-16 space-y-3 animate-fade-in">
            <div className="mx-auto h-24 w-24 rounded-full p-[3px] bg-[conic-gradient(from_140deg,theme(colors.neon-crimson),theme(colors.neon-purple),theme(colors.neon-green),theme(colors.neon-crimson))]">
              {peer?.avatar_url
                ? <img src={peer.avatar_url} className="h-full w-full rounded-full object-cover border-2 border-background" alt="" />
                : <div className="h-full w-full rounded-full border-2 border-background bg-gradient-to-br from-neon-crimson to-neon-purple" />}
            </div>
            <div className="font-display font-black text-lg">{title}</div>
            <div className="text-xs text-muted-foreground">Spune ceva fain. Un „salut" merge mereu 👋</div>
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
                        ? <img src={sender.avatar_url} className="h-8 w-8 rounded-full object-cover" alt="" />
                        : <div className="h-8 w-8 rounded-full bg-gradient-to-br from-neon-crimson to-neon-purple" />}
                    </div>
                  )}
                  <div className={`max-w-[78%] flex flex-col gap-[3px] ${g.mine ? "items-end" : "items-start"}`}>
                    {showSender && (
                      <div className="text-[10px] text-muted-foreground px-2.5">
                        @{sender?.handle ?? sender?.display_name ?? "?"}
                      </div>
                    )}
                    {g.items.map((m, i) => <MessageBubble key={m.id} body={m.body} mine={g.mine} first={i === 0} last={i === g.items.length - 1} groupLen={g.items.length} theme={theme} />)}
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

      {/* Emoji bar */}
      {showEmoji && (
        <div className="px-3 py-2 border-t border-foreground/[0.06] bg-background/60 backdrop-blur-xl animate-fade-in">
          <div className="flex gap-1 overflow-x-auto scrollbar-none">
            {QUICK_EMOJIS.map(e => (
              <button key={e} onClick={() => insertEmoji(e)}
                className="text-2xl h-11 w-11 rounded-full flex items-center justify-center shrink-0 active:bg-foreground/10 transition">
                {e}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Composer */}
      <Composer
        text={text} setText={setText}
        taRef={taRef}
        onSend={() => send()}
        sending={sending}
        showEmoji={showEmoji} setShowEmoji={setShowEmoji}
        onOpenGifts={() => setShowGifts(true)}
        onPickFile={() => fileRef.current?.click()}
        uploading={uploading}
        onVoice={(blob, ms) => uploadAndSend(blob, "webm", "🎤", ms)}
        theme={theme}
      />
      <input ref={fileRef} type="file" accept="image/*" className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) onPickImage(f); }} />

      {showGifts && <GiftSheet onClose={() => setShowGifts(false)} onSend={sendGift} />}
    </div>
  );

  if (typeof document === "undefined") return null;
  return createPortal(ui, document.body);
}

function Composer({ text, setText, taRef, onSend, sending, showEmoji, setShowEmoji, onOpenGifts, onPickFile, uploading, onVoice, theme }: {
  text: string; setText: (v: string | ((s: string) => string)) => void;
  taRef: React.RefObject<HTMLTextAreaElement | null>;
  onSend: () => void; sending: boolean;
  showEmoji: boolean; setShowEmoji: (s: boolean | ((v: boolean) => boolean)) => void;
  onOpenGifts: () => void; onPickFile: () => void; uploading: boolean;
  onVoice: (blob: Blob, ms: number) => void;
  theme: Theme;
}) {
  const [recording, setRecording] = useState(false);
  const [recMs, setRecMs] = useState(0);
  const recRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startRef = useRef<number>(0);
  const tickRef = useRef<number | null>(null);

  const startRec = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream, { mimeType: MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "" });
      chunksRef.current = [];
      mr.ondataavailable = (e) => { if (e.data.size) chunksRef.current.push(e.data); };
      mr.onstop = () => {
        stream.getTracks().forEach(t => t.stop());
        const ms = Date.now() - startRef.current;
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        if (ms > 400 && blob.size > 0) onVoice(blob, ms);
      };
      recRef.current = mr;
      startRef.current = Date.now();
      mr.start();
      setRecording(true);
      setRecMs(0);
      tickRef.current = window.setInterval(() => setRecMs(Date.now() - startRef.current), 100);
    } catch (e: any) {
      alert("Nu pot accesa microfonul: " + (e?.message ?? "permisiune refuzată"));
    }
  };
  const stopRec = (cancel = false) => {
    if (tickRef.current) { clearInterval(tickRef.current); tickRef.current = null; }
    const mr = recRef.current;
    if (cancel && mr) { mr.onstop = () => mr.stream.getTracks().forEach(t => t.stop()); }
    mr?.stop();
    recRef.current = null;
    setRecording(false);
  };

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSend(); }}
      className="flex items-end gap-2 px-3 pt-2 pb-[max(env(safe-area-inset-bottom),0.6rem)] border-t border-foreground/[0.06] bg-background/60 backdrop-blur-2xl">
      {recording ? (
        <div className="flex-1 flex items-center gap-3 rounded-3xl bg-foreground/[0.07] border border-neon-crimson/40 pl-4 pr-2 py-2.5 animate-fade-in">
          <span className="h-2.5 w-2.5 rounded-full bg-neon-crimson animate-pulse" />
          <div className="font-mono text-[13px] tabular-nums">{fmtRec(recMs)}</div>
          <div className="flex-1 flex items-center gap-[2px] overflow-hidden">
            {Array.from({ length: 28 }).map((_, i) => (
              <span key={i} className="w-[3px] rounded-full bg-neon-crimson/80" style={{ height: `${6 + Math.abs(Math.sin((Date.now()/120) + i)) * 18}px` }} />
            ))}
          </div>
          <button type="button" onClick={() => stopRec(true)} aria-label="anulează"
            className="h-9 w-9 rounded-full flex items-center justify-center text-muted-foreground active:bg-foreground/10">
            <X size={18} />
          </button>
          <button type="button" onClick={() => stopRec(false)} aria-label="trimite vocal"
            className="h-10 w-10 rounded-full flex items-center justify-center bg-gradient-to-br from-neon-crimson to-neon-purple text-white shadow-[0_6px_18px_-6px_rgba(255,49,88,0.7)] active:scale-95">
            <Send size={18} className="translate-x-[1px]" />
          </button>
        </div>
      ) : (
        <>
          <div className="flex-1 flex items-end gap-1 rounded-3xl bg-foreground/[0.06] border border-foreground/10 pl-1.5 pr-1.5 py-1.5 focus-within:border-foreground/25 transition-colors">
            <button type="button" onClick={() => setShowEmoji(s => !s)} aria-label="emoji"
              className={`h-9 w-9 rounded-full flex items-center justify-center shrink-0 transition ${showEmoji ? "text-neon-purple bg-foreground/10" : "text-muted-foreground active:bg-foreground/10"}`}>
              <Smile size={20} />
            </button>
            <button type="button" onClick={onOpenGifts} aria-label="cadou"
              className="h-9 w-9 rounded-full flex items-center justify-center shrink-0 text-muted-foreground active:bg-foreground/10 transition">
              <Gift size={18} />
            </button>
            <textarea ref={taRef} value={text}
              onChange={e => setText(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); onSend(); } }}
              placeholder="Trimite un mesaj…" rows={1}
              className="flex-1 resize-none max-h-[140px] bg-transparent border-0 outline-none py-1.5 px-1 text-[15px] placeholder:text-muted-foreground/70" />
            <button type="button" onClick={onPickFile} disabled={uploading} aria-label="imagine"
              className="h-9 w-9 rounded-full flex items-center justify-center shrink-0 text-muted-foreground active:bg-foreground/10 transition disabled:opacity-50">
              {uploading ? <Loader2 size={18} className="animate-spin" /> : <ImageIcon size={18} />}
            </button>
          </div>
          {text.trim() ? (
            <button type="submit" disabled={sending} aria-label="trimite"
              className={`h-12 w-12 rounded-full flex items-center justify-center shrink-0 disabled:opacity-40 disabled:scale-95 transition-all bg-gradient-to-br ${theme.mine} text-white ${theme.mineShadow} active:scale-95`}>
              <Send size={20} strokeWidth={2.4} className="translate-x-[1px] -translate-y-[1px]" />
            </button>
          ) : (
            <button type="button" onClick={startRec} aria-label="vocal"
              className={`h-12 w-12 rounded-full flex items-center justify-center shrink-0 transition-all bg-gradient-to-br ${theme.mine} text-white ${theme.mineShadow} active:scale-95`}>
              <Mic size={20} strokeWidth={2.4} />
            </button>
          )}
        </>
      )}
    </form>
  );
}

function fmtRec(ms: number) {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

function MessageBubble({ body, mine, first, last, groupLen, theme }: { body: string; mine: boolean; first: boolean; last: boolean; groupLen: number; theme: Theme }) {
  const imgMatch = body.startsWith("📷 ") ? body.slice(2).trim() : null;
  const giftMatch = body.startsWith("🎁 ") ? body.slice(2).trim() : null;
  const voiceMatch = body.startsWith("🎤 ") ? body.slice(2).trim() : null;

  if (giftMatch) {
    const [emoji, ...rest] = giftMatch.split(" ");
    const name = rest.join(" ");
    return (
      <div className="px-3 py-3 rounded-3xl bg-gradient-to-br from-neon-purple/25 via-neon-crimson/15 to-transparent border border-foreground/10 flex items-center gap-3">
        <div className="text-5xl leading-none drop-shadow-[0_4px_12px_rgba(198,107,255,0.55)] animate-pulse">{emoji}</div>
        <div className="leading-tight">
          <div className="font-display font-black text-sm">{name || "Cadou"}</div>
          <div className="text-[10px] text-muted-foreground uppercase tracking-widest">{mine ? "trimis" : "primit"}</div>
        </div>
      </div>
    );
  }

  if (voiceMatch) {
    const [url, sec] = voiceMatch.split("|");
    return <VoiceBubble url={url} seconds={Number(sec) || 0} mine={mine} theme={theme} />;
  }

  if (imgMatch) {
    return (
      <a href={imgMatch} target="_blank" rel="noreferrer" className="block max-w-[260px] rounded-3xl overflow-hidden border border-foreground/10 shadow-lg">
        <img src={imgMatch} alt="" className="w-full h-auto object-cover" />
      </a>
    );
  }

  const stripped = body.replace(/\s/g, "");
  const isEmojiOnly = stripped.length > 0 && stripped.length <= 12 && /^[\p{Emoji}\p{Emoji_Presentation}\p{Extended_Pictographic}\uFE0F\u200D]+$/u.test(stripped);
  if (isEmojiOnly && groupLen === 1) {
    return <div className="text-5xl leading-none py-1">{body}</div>;
  }

  const radius = mine
    ? `rounded-3xl ${first ? "" : "rounded-tr-md"} ${last ? "" : "rounded-br-md"}`
    : `rounded-3xl ${first ? "" : "rounded-tl-md"} ${last ? "" : "rounded-bl-md"}`;
  return (
    <div className={`px-4 py-2 text-[15px] leading-snug break-words ${radius} ${
      mine
        ? `text-white bg-gradient-to-br ${theme.mine} ${theme.mineShadow}`
        : "bg-foreground/[0.08] text-foreground backdrop-blur-sm"
    }`}>
      {body}
    </div>
  );
}

function VoiceBubble({ url, seconds, mine, theme }: { url: string; seconds: number; mine: boolean; theme: Theme }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);

  const toggle = () => {
    const a = audioRef.current;
    if (!a) return;
    if (playing) { a.pause(); } else { a.play(); }
  };

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    const onTime = () => setProgress(a.currentTime / (a.duration || seconds || 1));
    const onEnd = () => { setPlaying(false); setProgress(0); };
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    a.addEventListener("timeupdate", onTime);
    a.addEventListener("ended", onEnd);
    a.addEventListener("play", onPlay);
    a.addEventListener("pause", onPause);
    return () => {
      a.removeEventListener("timeupdate", onTime);
      a.removeEventListener("ended", onEnd);
      a.removeEventListener("play", onPlay);
      a.removeEventListener("pause", onPause);
    };
  }, [seconds]);

  return (
    <div className={`flex items-center gap-3 px-3 py-2.5 rounded-3xl min-w-[200px] max-w-[260px] ${
      mine ? `text-white bg-gradient-to-br ${theme.mine} ${theme.mineShadow}` : "bg-foreground/[0.08] backdrop-blur-sm"
    }`}>
      <button onClick={toggle} className="h-10 w-10 shrink-0 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center active:scale-95 transition">
        {playing ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" className="translate-x-[1px]" />}
      </button>
      <div className="flex-1 flex items-center gap-[2px] h-8">
        {Array.from({ length: 22 }).map((_, i) => {
          const active = progress * 22 > i;
          const h = 8 + ((i * 73) % 18);
          return <span key={i} className={`w-[3px] rounded-full transition-opacity ${active ? "opacity-100" : "opacity-40"} ${mine ? "bg-white" : "bg-foreground"}`} style={{ height: `${h}px` }} />;
        })}
      </div>
      <div className={`font-mono text-[11px] tabular-nums shrink-0 ${mine ? "opacity-90" : "opacity-60"}`}>{fmtRec(seconds * 1000)}</div>
      <audio ref={audioRef} src={url} preload="metadata" />
    </div>
  );
}

function GiftSheet({ onClose, onSend }: { onClose: () => void; onSend: (g: Gift) => void }) {
  const { data: gifts = [], isLoading } = useQuery({
    queryKey: ["chat-gift-catalog"],
    queryFn: async () => {
      const { data } = await supabase.from("chat_gift_catalog" as any).select("id,emoji,name,price_coins").order("price_coins");
      return ((data ?? []) as unknown) as Gift[];
    },
  });
  const { user } = useAuth();
  const { data: balance } = useQuery({
    queryKey: ["my-coins", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("coin_balance").eq("id", user!.id).single();
      return (data as any)?.coin_balance ?? 0;
    },
  });

  return (
    <div className="fixed inset-0 z-[110] flex items-end justify-center bg-background/70 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div className="w-full max-w-md bg-background border-t border-foreground/10 rounded-t-3xl p-4 pb-[max(env(safe-area-inset-bottom),1rem)] animate-scale-in" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="font-display font-black text-lg">Trimite un cadou</div>
            <div className="text-[11px] text-muted-foreground">Plătit cu șprițuri 🍺</div>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-xs font-mono px-2.5 py-1 rounded-full bg-foreground/[0.06]">🍺 {balance ?? 0}</div>
            <button onClick={onClose} aria-label="închide" className="h-9 w-9 rounded-full bg-foreground/[0.06] flex items-center justify-center"><X size={16} /></button>
          </div>
        </div>
        {isLoading ? (
          <div className="py-8 text-center text-xs text-muted-foreground">se încarcă…</div>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {gifts.map(g => {
              const canAfford = (balance ?? 0) >= g.price_coins;
              return (
                <button key={g.id} onClick={() => onSend(g)} disabled={!canAfford}
                  className={`aspect-square rounded-2xl flex flex-col items-center justify-center gap-1 transition active:scale-95 ${
                    canAfford
                      ? "bg-gradient-to-br from-foreground/[0.04] to-foreground/[0.08] border border-foreground/10 hover:border-neon-purple/40"
                      : "bg-foreground/[0.03] border border-foreground/5 opacity-50"
                  }`}>
                  <div className="text-4xl drop-shadow-[0_2px_8px_rgba(198,107,255,0.35)]">{g.emoji}</div>
                  <div className="font-display font-bold text-[11px]">{g.name}</div>
                  <div className="text-[10px] font-mono text-muted-foreground">🍺 {g.price_coins}</div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
