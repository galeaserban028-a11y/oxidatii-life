import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import {
  ArrowLeft,
  Send,
  Smile,
  Image as ImageIcon,
  Users,
  Gift,
  X,
  Loader2,
  Mic,
  Palette,
  Play,
  Pause,
  MoreVertical,
  Trash2,
  Eye,
  EyeOff,
} from "lucide-react";
import { notifyChatMessage } from "@/lib/notifications-extra.functions";

import { ReportDialog } from "@/components/app/ReportDialog";
import { MessageReactions } from "@/components/app/MessageReactions";
import { GroupSettingsSheet } from "@/components/app/GroupSettingsSheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/app/chat/$id")({
  head: () => ({ meta: [{ title: "Chat · OXIDAȚII" }] }),
  component: ChatPage,
});

type Msg = { id: string; sender_id: string; body: string; created_at: string };
type Profile = {
  id: string;
  handle?: string | null;
  display_name?: string | null;
  avatar_url?: string | null;
};
type Gift = { id: string; emoji: string; name: string; price_coins: number };

const QUICK_EMOJIS = [
  "😂",
  "❤️",
  "🔥",
  "🥲",
  "😍",
  "🥂",
  "🍻",
  "💀",
  "👀",
  "😎",
  "🥺",
  "🤝",
  "✨",
  "🤣",
  "😭",
  "🙌",
];

type Theme = { id: string; name: string; bg: string; mine: string; mineShadow: string };
const THEMES: Theme[] = [
  {
    id: "noir",
    name: "Noir",
    bg: "bg-background",
    mine: "from-neon-crimson via-neon-purple to-neon-purple",
    mineShadow: "shadow-[0_6px_24px_-8px_rgba(198,107,255,0.65)]",
  },
  {
    id: "sunset",
    name: "Sunset",
    bg: "bg-[radial-gradient(120%_80%_at_50%_0%,#3a0e1a_0%,#170710_45%,#0a0508_100%)]",
    mine: "from-[#ff3d8b] via-[#ff3d8b] to-[#c33afd]",
    mineShadow: "shadow-[0_6px_24px_-8px_rgba(255,90,90,0.7)]",
  },
  {
    id: "midnight",
    name: "Midnight",
    bg: "bg-[radial-gradient(120%_80%_at_50%_0%,#0d1f3d_0%,#070d1a_50%,#020306_100%)]",
    mine: "from-[#3b82f6] via-[#7c3aed] to-[#06b6d4]",
    mineShadow: "shadow-[0_6px_24px_-8px_rgba(56,189,248,0.7)]",
  },
  {
    id: "forest",
    name: "Forest",
    bg: "bg-[radial-gradient(120%_80%_at_50%_0%,#0e2a1f_0%,#06140e_45%,#020806_100%)]",
    mine: "from-[#22c55e] via-[#10b981] to-[#0ea5e9]",
    mineShadow: "shadow-[0_6px_24px_-8px_rgba(34,197,94,0.6)]",
  },
  {
    id: "candy",
    name: "Candy",
    bg: "bg-[radial-gradient(120%_80%_at_50%_0%,#3a0e2a_0%,#1a0712_45%,#0a0508_100%)]",
    mine: "from-[#c724ff] via-[#c724ff] to-[#a78bfa]",
    mineShadow: "shadow-[0_6px_24px_-8px_rgba(244,114,182,0.6)]",
  },
  {
    id: "paper",
    name: "Hârtie",
    bg: "bg-[radial-gradient(120%_80%_at_50%_0%,#f5f3ee_0%,#eae6dd_60%,#d8d3c6_100%)] text-[#1a1410]",
    mine: "from-[#1a1410] via-[#1a1410] to-[#2d2418]",
    mineShadow: "shadow-[0_6px_20px_-8px_rgba(0,0,0,0.45)]",
  },
];

function useChatTheme(convId: string) {
  const key = `chat-theme:${convId}`;
  const [themeId, setThemeId] = useState<string>(() => {
    if (typeof localStorage === "undefined") return "noir";
    return localStorage.getItem(key) ?? "noir";
  });
  useEffect(() => {
    localStorage.setItem(key, themeId);
  }, [key, themeId]);
  const theme = THEMES.find((t) => t.id === themeId) ?? THEMES[0];
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
  const [showGroupSettings, setShowGroupSettings] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [viewOnce, setViewOnce] = useState(false);
  const [pendingImage, setPendingImage] = useState<{ file: File; url: string } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const taRef = useRef<HTMLTextAreaElement | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const { theme, themeId, setThemeId } = useChatTheme(id);

  const { data, isLoading } = useQuery({
    queryKey: ["chat", id, user?.id],
    enabled: !!user,
    queryFn: async () => {
      const [{ data: conv }, { data: members }, { data: messages }] = await Promise.all([
        supabase.from("conversations").select("id,kind,title,party_id,created_by").eq("id", id).single(),
        supabase.from("conversation_members").select("user_id").eq("conversation_id", id),
        supabase
          .from("messages")
          .select("id,sender_id,body,created_at")
          .eq("conversation_id", id)
          .order("created_at"),
      ]);
      const otherIds = (members ?? []).map((m) => m.user_id);
      const { data: profs } = otherIds.length
        ? await supabase
            .from("profiles")
            .select("id,handle,display_name,avatar_url")
            .in("id", otherIds)
        : { data: [] };
      const profMap = new Map((profs ?? []).map((p: any) => [p.id, p]));
      return {
        conv: conv ?? { id, kind: "dm", title: null, party_id: null, created_by: null },
        members: members ?? [],
        messages: messages ?? [],
        profMap,
      };
    },
  });

  // Mark as read
  useEffect(() => {
    if (!user) return;
    supabase
      .from("conversation_members")
      .update({ last_read_at: new Date().toISOString() })
      .eq("conversation_id", id)
      .eq("user_id", user.id)
      .then(({ error }) => {
        if (error) console.error("mark-as-read failed", error);
      });
  }, [id, user, data?.messages.length]);

  // Realtime new messages
  useEffect(() => {
    if (!user?.id) return;
    const userId = user.id;
    const channelName = `chat-${id}:${userId}:${Date.now()}:${Math.random().toString(36).slice(2)}`;
    const ch = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${id}`,
        },
        (payload) => {
          qc.setQueryData(["chat", id, userId], (old: any) => {
            if (!old) return old;
            const m = payload.new as Msg;
            if (old.messages.some((x: Msg) => x.id === m.id)) return old;
            return { ...old, messages: [...old.messages, m] };
          });
        },
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${id}`,
        },
        (payload) => {
          qc.setQueryData(["chat", id, userId], (old: any) => {
            if (!old) return old;
            const oldId = (payload.old as any)?.id;
            if (!oldId) return old;
            return { ...old, messages: old.messages.filter((x: Msg) => x.id !== oldId) };
          });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [id, user?.id, qc]);

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
    return () => {
      document.body.style.overflow = prev;
    };
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
    const { guardRateLimit } = await import("@/lib/rateLimit");
    if (!(await guardRateLimit("message"))) {
      setSending(false);
      alert("Trimiți prea repede. Așteaptă puțin.");
      if (!override) setText(body);
      return;
    }
    const { error } = await supabase
      .from("messages")
      .insert({ conversation_id: id, sender_id: user.id, body });
    setSending(false);
    if (error) {
      const { prettifyAntiSpamError } = await import("@/lib/antispam");
      alert(prettifyAntiSpamError(error));
      if (!override) setText(body);
      return;
    }
    import("@/lib/native").then(({ haptic }) => haptic("light"));
    notifyChatMessage({ data: { conversationId: id, preview: body } }).catch(() => {});
  };

  const deleteMessage = (msgId: string) => {
    setDeleteTarget(msgId);
  };

  const confirmDelete = async () => {
    const msgId = deleteTarget;
    if (!msgId || !user) return;
    setDeleteTarget(null);
    // optimistic
    qc.setQueryData(["chat", id, user.id], (old: any) => {
      if (!old) return old;
      return { ...old, messages: old.messages.filter((x: Msg) => x.id !== msgId) };
    });
    const { error } = await supabase
      .from("messages")
      .delete()
      .eq("id", msgId)
      .eq("sender_id", user.id);
    if (error) {
      alert("Nu s-a putut șterge: " + error.message);
      qc.invalidateQueries({ queryKey: ["chat", id, user.id] });
    }
  };

  const cancelDelete = () => setDeleteTarget(null);

  const insertEmoji = (e: string) => {
    setText((t) => t + e);
    setShowEmoji(false);
    setTimeout(() => taRef.current?.focus(), 0);
  };

  const sendGift = async (g: Gift) => {
    if (!user) return;
    const ok = confirm(`Trimiți ${g.emoji} ${g.name} pentru ${g.price_coins} șprițuri?`);
    if (!ok) return;
    setShowGifts(false);
    const { error } = await supabase.rpc("send_chat_gift" as any, {
      _conversation_id: id,
      _gift_id: g.id,
    });
    if (error) alert(error.message);
  };

  const uploadAndSend = async (
    file: Blob,
    ext: string,
    prefix: "📷" | "🎤" | "👁️",
    durationMs?: number,
  ) => {
    if (!user) return;
    setUploading(true);
    try {
      const path = `${user.id}/${id}/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("chat-media")
        .upload(path, file, {
          contentType: file.type || `${prefix === "🎤" ? "audio" : "image"}/${ext}`,
          upsert: false,
        });
      if (upErr) throw upErr;
      const { data: signed, error: signErr } = await supabase.storage
        .from("chat-media")
        .createSignedUrl(path, 60 * 60 * 24 * 365 * 5);
      if (signErr) throw signErr;
      const url = signed.signedUrl;
      const body =
        prefix === "🎤" && durationMs
          ? `🎤 ${url}|${Math.round(durationMs / 1000)}`
          : `${prefix} ${url}`;
      const { error } = await supabase
        .from("messages")
        .insert({ conversation_id: id, sender_id: user.id, body });
      if (error) throw error;
      notifyChatMessage({ data: { conversationId: id, preview: body.slice(0, 80) } }).catch(
        () => {},
      );
    } catch (e: any) {
      const { prettifyAntiSpamError } = await import("@/lib/antispam");
      alert(prettifyAntiSpamError(e) || "nu am putut trimite");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const onPickImage = (file: File) => {
    const url = URL.createObjectURL(file);
    setPendingImage({ file, url });
  };

  const confirmSendPendingImage = async () => {
    if (!pendingImage) return;
    const { file, url } = pendingImage;
    const ext = file.name.split(".").pop() || "jpg";
    const useViewOnce = viewOnce;
    setPendingImage(null);
    URL.revokeObjectURL(url);
    await uploadAndSend(file, ext, useViewOnce ? "👁️" : "📷");
    setViewOnce(false);
  };

  const cancelPendingImage = () => {
    if (pendingImage) URL.revokeObjectURL(pendingImage.url);
    setPendingImage(null);
    if (fileRef.current) fileRef.current.value = "";
  };


  const otherProfiles: Profile[] = data
    ? (data.members
        .filter((m) => m.user_id !== user?.id)
        .map((m) => data.profMap.get(m.user_id))
        .filter(Boolean) as Profile[])
    : [];
  const peer = otherProfiles[0];
  const title =
    data?.conv.kind === "dm"
      ? peer?.handle
        ? `@${peer.handle}`
        : (peer?.display_name ?? "Conversație")
      : (data?.conv.title ?? `Grup (${data?.members.length ?? 0})`);
  const subtitle =
    data?.conv.kind === "dm"
      ? (peer?.display_name ?? "online recent")
      : `${data?.members.length ?? 0} membri`;

  const grouped = useMemo(() => {
    if (!data) return [] as { sender_id: string; items: Msg[]; mine: boolean }[];
    const out: { sender_id: string; items: Msg[]; mine: boolean }[] = [];
    for (const m of data.messages) {
      const last = out[out.length - 1];
      const mine = m.sender_id === user?.id;
      if (
        last &&
        last.sender_id === m.sender_id &&
        new Date(m.created_at).getTime() -
          new Date(last.items[last.items.length - 1].created_at).getTime() <
          4 * 60_000
      ) {
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
        <button
          onClick={() => nav({ to: "/app/inbox" })}
          aria-label="înapoi"
          className="h-11 w-11 -ml-1 rounded-full flex items-center justify-center active:bg-foreground/10 transition"
        >
          <ArrowLeft size={24} />
        </button>

        {data?.conv.kind === "dm" && peer ? (
          <Link
            to="/app/user/$id"
            params={{ id: peer.id }}
            className="flex items-center gap-3 flex-1 min-w-0 active:opacity-70 transition"
          >
            <div className="h-12 w-12 rounded-full p-[2.5px] bg-[conic-gradient(from_140deg,theme(colors.neon-crimson),theme(colors.neon-purple),theme(colors.neon-green),theme(colors.neon-crimson))] shrink-0">
              {peer.avatar_url ? (
                <img
                  src={peer.avatar_url}
                  className="h-full w-full rounded-full object-cover border-2 border-background"
                  alt=""
                />
              ) : (
                <div className="h-full w-full rounded-full border-2 border-background bg-gradient-to-br from-neon-crimson to-neon-purple flex items-center justify-center font-display font-black text-white text-lg">
                  {(peer.handle ?? "?")[0]?.toUpperCase()}
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0 leading-tight">
              <div className="font-display font-black text-base truncate">{title}</div>
              <div className="text-[11px] text-muted-foreground truncate flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-neon-green inline-block" />
                {subtitle}
              </div>
            </div>
          </Link>
        ) : (
          <button
            onClick={() => setShowGroupSettings(true)}
            className="flex items-center gap-3 flex-1 min-w-0 text-left active:opacity-70 transition"
          >
            <div className="h-12 w-12 rounded-full bg-gradient-to-br from-neon-purple to-neon-crimson flex items-center justify-center shrink-0">
              <Users size={20} className="text-white" />
            </div>
            <div className="flex-1 min-w-0 leading-tight">
              <div className="font-display font-black text-base truncate">{title}</div>
              <div className="text-[11px] text-muted-foreground truncate">{subtitle} · setări</div>
            </div>
          </button>
        )}

        <button
          onClick={() => setShowThemes((s) => !s)}
          aria-label="temă"
          className={`h-10 w-10 rounded-full flex items-center justify-center active:bg-foreground/10 transition ${showThemes ? "text-neon-purple bg-foreground/10" : "text-muted-foreground"}`}
        >
          <Palette size={20} />
        </button>

        {peer && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                aria-label="mai multe"
                className="h-10 w-10 rounded-full flex items-center justify-center active:bg-foreground/10 transition text-muted-foreground"
              >
                <MoreVertical size={20} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <ReportDialog
                targetType="user"
                targetId={peer.id}
                variant="menu-item"
                label={`Raportează @${peer.handle ?? "user"}`}
              />
              <DropdownMenuItem
                onClick={() => nav({ to: "/app/user/$id", params: { id: peer.id } })}
              >
                Deschide profilul
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </header>

      {/* Theme strip */}
      {showThemes && (
        <div className="px-3 py-3 border-b border-foreground/[0.06] bg-background/40 backdrop-blur-xl animate-fade-in">
          <div className="text-[10px] font-mono uppercase tracking-[0.25em] text-muted-foreground mb-2">
            temă fundal
          </div>
          <div className="flex gap-2 overflow-x-auto scrollbar-none pb-1">
            {THEMES.map((t) => (
              <button
                key={t.id}
                onClick={() => setThemeId(t.id)}
                className={`shrink-0 flex flex-col items-center gap-1 transition active:scale-95 ${themeId === t.id ? "" : "opacity-70"}`}
              >
                <div
                  className={`h-12 w-12 rounded-2xl border-2 ${themeId === t.id ? "border-neon-purple" : "border-foreground/15"} overflow-hidden ${t.bg}`}
                >
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
            <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              se încarcă
            </div>
          </div>
        ) : data?.messages.length === 0 ? (
          <div className="text-center py-16 space-y-3 animate-fade-in">
            <div className="mx-auto h-24 w-24 rounded-full p-[3px] bg-[conic-gradient(from_140deg,theme(colors.neon-crimson),theme(colors.neon-purple),theme(colors.neon-green),theme(colors.neon-crimson))]">
              {peer?.avatar_url ? (
                <img
                  src={peer.avatar_url}
                  className="h-full w-full rounded-full object-cover border-2 border-background"
                  alt=""
                />
              ) : (
                <div className="h-full w-full rounded-full border-2 border-background bg-gradient-to-br from-neon-crimson to-neon-purple" />
              )}
            </div>
            <div className="font-display font-black text-lg">{title}</div>
            <div className="text-xs text-muted-foreground">
              Spune ceva fain. Un „salut" merge mereu 👋
            </div>
          </div>
        ) : (
          <div className="space-y-4 max-w-2xl mx-auto">
            {grouped.map((g, gi) => {
              const sender = data!.profMap.get(g.sender_id) as Profile | undefined;
              const showSender = !g.mine && data!.conv.kind !== "dm";
              const last = g.items[g.items.length - 1];
              return (
                <div
                  key={gi}
                  className={`flex gap-2 ${g.mine ? "justify-end" : "justify-start"} animate-fade-in`}
                >
                  {!g.mine && (
                    <div className="self-end shrink-0">
                      {sender?.avatar_url ? (
                        <img
                          src={sender.avatar_url}
                          className="h-8 w-8 rounded-full object-cover"
                          alt=""
                        />
                      ) : (
                        <div className="h-8 w-8 rounded-full bg-gradient-to-br from-neon-crimson to-neon-purple" />
                      )}
                    </div>
                  )}
                  <div
                    className={`max-w-[78%] flex flex-col gap-[3px] ${g.mine ? "items-end" : "items-start"}`}
                  >
                    {showSender && (
                      <div className="text-[10px] text-muted-foreground px-2.5">
                        @{sender?.handle ?? sender?.display_name ?? "?"}
                      </div>
                    )}
                    {g.items.map((m, i) => (
                      <div key={m.id} className={`relative group flex flex-col ${g.mine ? "items-end" : "items-start"}`}>
                        <MessageBubble
                          msgId={m.id}
                          body={m.body}
                          mine={g.mine}
                          first={i === 0}
                          last={i === g.items.length - 1}
                          groupLen={g.items.length}
                          theme={theme}
                          onDelete={g.mine ? () => deleteMessage(m.id) : undefined}
                        />
                        <MessageReactions messageId={m.id} align={g.mine ? "right" : "left"} />
                      </div>
                    ))}

                    <div className="text-[10px] text-muted-foreground px-2.5">
                      {new Date(last.created_at).toLocaleTimeString("ro-RO", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
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
            {QUICK_EMOJIS.map((e) => (
              <button
                key={e}
                onClick={() => insertEmoji(e)}
                className="text-2xl h-11 w-11 rounded-full flex items-center justify-center shrink-0 active:bg-foreground/10 transition"
              >
                {e}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Composer */}
      <Composer
        text={text}
        setText={setText}
        taRef={taRef}
        onSend={() => send()}
        sending={sending}
        showEmoji={showEmoji}
        setShowEmoji={setShowEmoji}
        onOpenGifts={() => setShowGifts(true)}
        onPickFile={() => fileRef.current?.click()}
        uploading={uploading}
        onVoice={(blob, ms, ext) => uploadAndSend(blob, ext, "🎤", ms)}
        theme={theme}
        viewOnce={viewOnce}
        toggleViewOnce={() => setViewOnce((v) => !v)}
      />

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onPickImage(f);
        }}
      />

      {showGifts && <GiftSheet onClose={() => setShowGifts(false)} onSend={sendGift} />}

      {pendingImage &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className="fixed inset-0 z-[210] bg-black/85 backdrop-blur-xl flex flex-col animate-fade-in"
            style={{
              paddingTop: "max(env(safe-area-inset-top), 1rem)",
              paddingBottom: "max(env(safe-area-inset-bottom), 1rem)",
            }}
          >
            <div className="flex items-center justify-between px-4 pb-3">
              <button
                onClick={cancelPendingImage}
                className="h-10 w-10 rounded-full bg-white/10 border border-white/15 text-white flex items-center justify-center"
                aria-label="anulează"
              >
                <X size={20} />
              </button>
              <div className="text-white/90 font-display font-black uppercase text-sm tracking-widest">
                Previzualizare
              </div>
              <button
                onClick={() => setViewOnce((v) => !v)}
                className={`h-10 px-3 rounded-full border flex items-center gap-1.5 text-xs font-semibold ${
                  viewOnce
                    ? "bg-neon-purple/30 border-neon-purple/50 text-white"
                    : "bg-white/10 border-white/15 text-white/80"
                }`}
                aria-label="vezi o singură dată"
              >
                <Eye size={16} /> 1×
              </button>
            </div>
            <div className="flex-1 min-h-0 flex items-center justify-center px-4">
              <img
                src={pendingImage.url}
                alt=""
                className="max-h-full max-w-full object-contain rounded-2xl"
              />
            </div>
            <div className="px-4 pt-4 flex items-center gap-2">
              <button
                onClick={cancelPendingImage}
                className="flex-1 h-12 rounded-2xl bg-white/10 border border-white/15 text-white font-semibold"
              >
                Anulează
              </button>
              <button
                onClick={confirmSendPendingImage}
                disabled={uploading}
                className="flex-[1.4] h-12 rounded-2xl bg-gradient-to-r from-neon-purple to-neon-crimson text-white font-display font-black uppercase tracking-widest text-sm disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {uploading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" /> Trimite…
                  </>
                ) : viewOnce ? (
                  <>
                    <Eye size={16} /> Trimite 1×
                  </>
                ) : (
                  <>
                    <Send size={16} /> Trimite
                  </>
                )}
              </button>
            </div>
            {viewOnce && (
              <div className="px-4 pt-2 text-center text-[11px] uppercase tracking-widest text-white/60">
                Se vede o singură dată, apoi dispare
              </div>
            )}
          </div>,
          document.body,
        )}


      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent className="border-foreground/10 bg-background/95 backdrop-blur-2xl max-w-sm rounded-2xl">
          <AlertDialogHeader className="space-y-3">
            <div className="mx-auto h-12 w-12 rounded-full bg-neon-crimson/10 flex items-center justify-center">
              <Trash2 size={22} className="text-neon-crimson" />
            </div>
            <AlertDialogTitle className="text-center font-display font-black text-lg">
              Ștergi mesajul?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-center text-sm text-muted-foreground">
              Mesajul va fi șters pentru tine și pentru celălalt utilizator. Acțiunea este
              definitivă.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col-reverse sm:flex-col-reverse gap-2">
            <AlertDialogCancel
              onClick={cancelDelete}
              className="w-full rounded-xl h-11 font-semibold border-foreground/10 bg-foreground/[0.04] hover:bg-foreground/[0.08]"
            >
              Anulează
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="w-full rounded-xl h-11 font-semibold bg-gradient-to-r from-neon-crimson to-neon-purple text-white hover:opacity-90"
            >
              Șterge
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {data && data.conv.kind !== "dm" && (
        <GroupSettingsSheet
          open={showGroupSettings}
          onClose={() => setShowGroupSettings(false)}
          conversationId={id}
          title={data.conv.title ?? null}
          createdBy={(data.conv as any).created_by ?? null}
          members={data.members}
          profMap={data.profMap as Map<string, any>}
        />
      )}
    </div>
  );

  if (typeof document === "undefined") return null;
  return createPortal(ui, document.body);
}

function Composer({
  text,
  setText,
  taRef,
  onSend,
  sending,
  showEmoji,
  setShowEmoji,
  onOpenGifts,
  onPickFile,
  uploading,
  onVoice,
  theme,
  viewOnce,
  toggleViewOnce,
}: {
  text: string;
  setText: (v: string | ((s: string) => string)) => void;
  taRef: React.RefObject<HTMLTextAreaElement | null>;
  onSend: () => void;
  sending: boolean;
  showEmoji: boolean;
  setShowEmoji: (s: boolean | ((v: boolean) => boolean)) => void;
  onOpenGifts: () => void;
  onPickFile: () => void;
  uploading: boolean;
  onVoice: (blob: Blob, ms: number, ext: string) => void;
  theme: Theme;
  viewOnce: boolean;
  toggleViewOnce: () => void;
}) {

  const [recording, setRecording] = useState(false);
  const [recMs, setRecMs] = useState(0);
  const recRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startRef = useRef<number>(0);
  const tickRef = useRef<number | null>(null);
  const recMimeRef = useRef<{ mime: string; ext: string }>({ mime: "audio/webm", ext: "webm" });

  const startRec = async () => {
    try {
      if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
        alert("Telefonul/browserul nu suportă înregistrarea vocală aici.");
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const candidates = [
        { mime: "audio/webm;codecs=opus", ext: "webm" },
        { mime: "audio/webm", ext: "webm" },
        { mime: "audio/mp4", ext: "m4a" },
        { mime: "audio/aac", ext: "aac" },
        { mime: "audio/ogg;codecs=opus", ext: "ogg" },
      ];
      const picked = candidates.find((c) => MediaRecorder.isTypeSupported(c.mime));
      const mr = picked ? new MediaRecorder(stream, { mimeType: picked.mime }) : new MediaRecorder(stream);
      const actualMime = mr.mimeType || picked?.mime || "audio/webm";
      recMimeRef.current = {
        mime: actualMime,
        ext: actualMime.includes("mp4") ? "m4a" : actualMime.includes("aac") ? "aac" : actualMime.includes("ogg") ? "ogg" : "webm",
      };
      chunksRef.current = [];
      mr.ondataavailable = (e) => {
        if (e.data.size) chunksRef.current.push(e.data);
      };
      mr.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const ms = Date.now() - startRef.current;
        const { mime, ext } = recMimeRef.current;
        const blob = new Blob(chunksRef.current, { type: mime });
        if (ms > 400 && blob.size > 0) onVoice(blob, ms, ext);
      };
      recRef.current = mr;
      startRef.current = Date.now();
      mr.start(250);
      setRecording(true);
      setRecMs(0);
      tickRef.current = window.setInterval(() => setRecMs(Date.now() - startRef.current), 100);
    } catch (e: any) {
      alert("Nu pot accesa microfonul: " + (e?.message ?? "permisiune refuzată"));
    }
  };
  const stopRec = (cancel = false) => {
    if (tickRef.current) {
      clearInterval(tickRef.current);
      tickRef.current = null;
    }
    const mr = recRef.current;
    if (cancel && mr) {
      mr.onstop = () => mr.stream.getTracks().forEach((t) => t.stop());
    }
    mr?.stop();
    recRef.current = null;
    setRecording(false);
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSend();
      }}
      className="flex items-end gap-2 pt-2 pb-[max(env(safe-area-inset-bottom),0.6rem)] pl-[max(env(safe-area-inset-left),0.75rem)] pr-[max(env(safe-area-inset-right),0.75rem)] border-t border-foreground/[0.06] bg-background/60 backdrop-blur-2xl"
    >
      {recording ? (
        <div className="flex-1 flex items-center gap-3 rounded-3xl bg-foreground/[0.07] border border-neon-crimson/40 pl-4 pr-2 py-2.5 animate-fade-in">
          <span className="h-2.5 w-2.5 rounded-full bg-neon-crimson animate-pulse" />
          <div className="font-mono text-[13px] tabular-nums">{fmtRec(recMs)}</div>
          <div className="flex-1 flex items-center gap-[2px] overflow-hidden">
            {Array.from({ length: 28 }).map((_, i) => (
              <span
                key={i}
                className="w-[3px] rounded-full bg-neon-crimson/80"
                style={{ height: `${6 + Math.abs(Math.sin(Date.now() / 120 + i)) * 18}px` }}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={() => stopRec(true)}
            aria-label="anulează"
            className="h-9 w-9 rounded-full flex items-center justify-center text-muted-foreground active:bg-foreground/10"
          >
            <X size={18} />
          </button>
          <button
            type="button"
            onClick={() => stopRec(false)}
            aria-label="trimite vocal"
            className="h-10 w-10 rounded-full flex items-center justify-center bg-gradient-to-br from-neon-crimson to-neon-purple text-white shadow-[0_6px_18px_-6px_rgba(255,49,88,0.7)] active:scale-95"
          >
            <Send size={18} className="translate-x-[1px]" />
          </button>
        </div>
      ) : (
        <>
          <div className="flex-1 min-w-0 flex items-end gap-1 rounded-3xl bg-foreground/[0.06] border border-foreground/10 pl-1.5 pr-1.5 py-1.5 focus-within:border-foreground/25 transition-colors">
            <button
              type="button"
              onClick={() => setShowEmoji((s) => !s)}
              aria-label="emoji"
              className={`h-9 w-9 rounded-full flex items-center justify-center shrink-0 transition ${showEmoji ? "text-neon-purple bg-foreground/10" : "text-muted-foreground active:bg-foreground/10"}`}
            >
              <Smile size={20} />
            </button>
            <button
              type="button"
              onClick={onOpenGifts}
              aria-label="cadou"
              className="h-9 w-9 rounded-full flex items-center justify-center shrink-0 text-muted-foreground active:bg-foreground/10 transition"
            >
              <Gift size={18} />
            </button>
            <textarea
              ref={taRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  onSend();
                }
              }}
              placeholder="Trimite un mesaj…"
              rows={1}
              className="flex-1 resize-none max-h-[140px] bg-transparent border-0 outline-none py-1.5 px-1 text-[15px] placeholder:text-muted-foreground/70"
            />
            <button
              type="button"
              onClick={toggleViewOnce}
              aria-label="foto care dispare după vizualizare"
              title={viewOnce ? "Activ: următoarea poză se vede o singură dată, apoi dispare" : "Activează pentru poză care se vede o singură dată"}
              className={`h-9 px-2.5 rounded-full flex items-center gap-1 shrink-0 transition active:bg-foreground/10 ${viewOnce ? "text-neon-purple bg-neon-purple/15 ring-1 ring-neon-purple/40" : "text-muted-foreground"}`}
            >
              {viewOnce ? <Eye size={16} /> : <EyeOff size={16} />}
              <span className="text-[10px] font-black tracking-widest uppercase">1×</span>
            </button>
            <button
              type="button"
              onClick={onPickFile}
              disabled={uploading}
              aria-label="imagine"
              className={`h-9 w-9 rounded-full flex items-center justify-center shrink-0 active:bg-foreground/10 transition disabled:opacity-50 ${viewOnce ? "text-neon-purple" : "text-muted-foreground"}`}
            >
              {uploading ? <Loader2 size={18} className="animate-spin" /> : <ImageIcon size={18} />}
            </button>

          </div>
          {text.trim() ? (
            <button
              type="submit"
              disabled={sending}
              aria-label="trimite"
              className={`h-12 w-12 rounded-full flex items-center justify-center shrink-0 disabled:opacity-40 disabled:scale-95 transition-all bg-gradient-to-br ${theme.mine} text-white ${theme.mineShadow} active:scale-95`}
            >
              <Send size={20} strokeWidth={2.4} className="translate-x-[1px] -translate-y-[1px]" />
            </button>
          ) : (
            <button
              type="button"
              onClick={startRec}
              aria-label="vocal"
              className={`h-12 w-12 rounded-full flex items-center justify-center shrink-0 transition-all bg-gradient-to-br ${theme.mine} text-white ${theme.mineShadow} active:scale-95`}
            >
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

function MessageBubble({
  msgId,
  body,
  mine,
  first,
  last,
  groupLen,
  theme,
  onDelete,
}: {
  msgId: string;
  body: string;
  mine: boolean;
  first: boolean;
  last: boolean;
  groupLen: number;
  theme: Theme;
  onDelete?: () => void;
}) {
  const imgMatch = stripMediaPrefix(body, 0x1f4f7); // 📷
  const giftMatch = stripMediaPrefix(body, 0x1f381); // 🎁
  const voiceMatch = stripMediaPrefix(body, 0x1f3a4); // 🎤
  const viewOnceMatch = stripMediaPrefix(body, 0x1f441); // 👁


  // Long-press / right-click handlers for delete on own messages
  const pressTimer = useRef<number | null>(null);
  const longPressFired = useRef(false);
  const startPress = () => {
    if (!onDelete) return;
    longPressFired.current = false;
    pressTimer.current = window.setTimeout(() => {
      longPressFired.current = true;
      onDelete();
    }, 500);
  };
  const endPress = () => {
    if (pressTimer.current) {
      clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
  };
  const onCtx = (e: React.MouseEvent) => {
    if (!onDelete) return;
    e.preventDefault();
    onDelete();
  };
  const pressProps = onDelete
    ? {
        onPointerDown: startPress,
        onPointerUp: endPress,
        onPointerLeave: endPress,
        onPointerCancel: endPress,
        onContextMenu: onCtx,
        style: {
          touchAction: "manipulation" as const,
          userSelect: "none" as const,
          WebkitUserSelect: "none" as const,
        },
      }
    : {};

  if (giftMatch) {
    const [emoji, ...rest] = giftMatch.split(" ");
    const name = rest.join(" ");
    return (
      <div
        {...pressProps}
        className="px-3 py-3 rounded-3xl bg-gradient-to-br from-neon-purple/25 via-neon-crimson/15 to-transparent border border-foreground/10 flex items-center gap-3"
      >
        <div className="text-5xl leading-none drop-shadow-[0_4px_12px_rgba(198,107,255,0.55)] animate-pulse">
          {emoji}
        </div>
        <div className="leading-tight">
          <div className="font-display font-black text-sm">{name || "Cadou"}</div>
          <div className="text-[10px] text-muted-foreground uppercase tracking-widest">
            {mine ? "trimis" : "primit"}
          </div>
        </div>
      </div>
    );
  }

  if (voiceMatch) {
    const [url, sec] = voiceMatch.split("|");
    return (
      <div {...pressProps}>
        <VoiceBubble url={url} seconds={Number(sec) || 0} mine={mine} theme={theme} />
      </div>
    );
  }

  if (viewOnceMatch) {
    return (
      <div {...pressProps}>
        <ViewOnceBubble url={viewOnceMatch} msgId={msgId} mine={mine} theme={theme} />
      </div>
    );
  }

  if (imgMatch) {
    return (
      <div {...pressProps} className="max-w-[260px]">
        <ImageBubble url={imgMatch} />
      </div>
    );
  }

  const stripped = body.replace(/\s/g, "");
  const isEmojiOnly =
    stripped.length > 0 &&
    stripped.length <= 12 &&
    /^[\p{Emoji}\p{Emoji_Presentation}\p{Extended_Pictographic}\uFE0F\u200D]+$/u.test(stripped);
  if (isEmojiOnly && groupLen === 1) {
    return (
      <div {...pressProps} className="text-5xl leading-none py-1">
        {body}
      </div>
    );
  }

  const radius = mine
    ? `rounded-3xl ${first ? "" : "rounded-tr-md"} ${last ? "" : "rounded-br-md"}`
    : `rounded-3xl ${first ? "" : "rounded-tl-md"} ${last ? "" : "rounded-bl-md"}`;
  return (
    <div
      {...pressProps}
      className={`px-4 py-2 text-[15px] leading-snug break-words ${radius} ${
        mine
          ? `text-white bg-gradient-to-br ${theme.mine} ${theme.mineShadow}`
          : "bg-foreground/[0.08] text-foreground backdrop-blur-sm"
      }`}
    >
      {body}
    </div>
  );
}

function stripMediaPrefix(body: string, codePoint: number) {
  const trimmed = body.trimStart();
  if (trimmed.codePointAt(0) !== codePoint) return null;
  let i = String.fromCodePoint(codePoint).length;
  while (i < trimmed.length) {
    const char = trimmed[i];
    const code = trimmed.charCodeAt(i);
    if (code === 0xfe0f || code === 0x200d || /\s/.test(char)) {
      i += 1;
      continue;
    }
    break;
  }
  return trimmed.slice(i).trim();
}

function ImageBubble({ url }: { url: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <div className="rounded-3xl border border-foreground/10 bg-foreground/[0.06] px-4 py-3 text-sm text-muted-foreground">
        Poza nu se poate încărca.
      </div>
    );
  }
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="block rounded-3xl overflow-hidden border border-foreground/10 shadow-lg bg-foreground/[0.04]"
    >
      <img src={url} alt="poză trimisă" onError={() => setFailed(true)} className="w-full h-auto object-cover" />
    </a>
  );
}

function VoiceBubble({
  url,
  seconds,
  mine,
  theme,
}: {
  url: string;
  seconds: number;
  mine: boolean;
  theme: Theme;
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [audioError, setAudioError] = useState(false);

  const toggle = async () => {
    const a = audioRef.current;
    if (!a) return;
    if (playing) {
      a.pause();
    } else {
      try {
        if (a.ended || (Number.isFinite(a.duration) && a.currentTime >= a.duration - 0.05)) {
          a.currentTime = 0;
          setProgress(0);
        }
        await a.play();
      } catch {
        setAudioError(true);
      }
    }
  };

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    const onTime = () => setProgress(a.currentTime / (a.duration || seconds || 1));
    const onEnd = () => {
      setPlaying(false);
      setProgress(0);
      a.currentTime = 0;
    };
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onError = () => setAudioError(true);
    a.addEventListener("timeupdate", onTime);
    a.addEventListener("ended", onEnd);
    a.addEventListener("play", onPlay);
    a.addEventListener("pause", onPause);
    a.addEventListener("error", onError);
    return () => {
      a.removeEventListener("timeupdate", onTime);
      a.removeEventListener("ended", onEnd);
      a.removeEventListener("play", onPlay);
      a.removeEventListener("pause", onPause);
      a.removeEventListener("error", onError);
    };
  }, [seconds]);

  return (
    <div
      className={`flex items-center gap-3 px-3 py-2.5 rounded-3xl min-w-[200px] max-w-[260px] ${
        mine
          ? `text-white bg-gradient-to-br ${theme.mine} ${theme.mineShadow}`
          : "bg-foreground/[0.08] backdrop-blur-sm"
      }`}
    >
      <button
        onClick={toggle}
        className="h-10 w-10 shrink-0 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center active:scale-95 transition"
      >
        {playing ? (
          <Pause size={18} fill="currentColor" />
        ) : (
          <Play size={18} fill="currentColor" className="translate-x-[1px]" />
        )}
      </button>
      <div className="flex-1 flex items-center gap-[2px] h-8">
        {Array.from({ length: 22 }).map((_, i) => {
          const active = progress * 22 > i;
          const h = 8 + ((i * 73) % 18);
          return (
            <span
              key={i}
              className={`w-[3px] rounded-full transition-opacity ${active ? "opacity-100" : "opacity-40"} ${mine ? "bg-white" : "bg-foreground"}`}
              style={{ height: `${h}px` }}
            />
          );
        })}
      </div>
      <div
        className={`font-mono text-[11px] tabular-nums shrink-0 ${mine ? "opacity-90" : "opacity-60"}`}
      >
        {fmtRec(seconds * 1000)}
      </div>
      {audioError && <div className="text-[10px] opacity-70">eroare audio</div>}
      <audio ref={audioRef} src={url} preload="auto" playsInline />
    </div>
  );
}

function GiftSheet({ onClose, onSend }: { onClose: () => void; onSend: (g: Gift) => void }) {
  const { data: gifts = [], isLoading } = useQuery({
    queryKey: ["chat-gift-catalog"],
    queryFn: async () => {
      const { data } = await supabase
        .from("chat_gift_catalog" as any)
        .select("id,emoji,name,price_coins")
        .order("price_coins");
      return (data ?? []) as unknown as Gift[];
    },
  });
  const { user } = useAuth();
  const { data: balance } = useQuery({
    queryKey: ["my-coins", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.rpc("get_my_account_state");
      const row = Array.isArray(data) ? (data[0] as any) : null;
      return (row?.coin_balance as number | undefined) ?? 0;
    },
  });

  return (
    <div
      className="fixed inset-0 z-[110] flex items-end justify-center bg-background/70 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-background border-t border-foreground/10 rounded-t-3xl p-4 pb-[max(env(safe-area-inset-bottom),1rem)] animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="font-display font-black text-lg">Trimite un cadou</div>
            <div className="text-[11px] text-muted-foreground">Plătit cu șprițuri 🍺</div>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-xs font-mono px-2.5 py-1 rounded-full bg-foreground/[0.06]">
              🍺 {balance ?? 0}
            </div>
            <button
              onClick={onClose}
              aria-label="închide"
              className="h-9 w-9 rounded-full bg-foreground/[0.06] flex items-center justify-center"
            >
              <X size={16} />
            </button>
          </div>
        </div>
        {isLoading ? (
          <div className="py-8 text-center text-xs text-muted-foreground">se încarcă…</div>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {gifts.map((g) => {
              const canAfford = (balance ?? 0) >= g.price_coins;
              return (
                <button
                  key={g.id}
                  onClick={() => onSend(g)}
                  disabled={!canAfford}
                  className={`aspect-square rounded-2xl flex flex-col items-center justify-center gap-1 transition active:scale-95 ${
                    canAfford
                      ? "bg-gradient-to-br from-foreground/[0.04] to-foreground/[0.08] border border-foreground/10 hover:border-neon-purple/40"
                      : "bg-foreground/[0.03] border border-foreground/5 opacity-50"
                  }`}
                >
                  <div className="text-4xl drop-shadow-[0_2px_8px_rgba(198,107,255,0.35)]">
                    {g.emoji}
                  </div>
                  <div className="font-display font-bold text-[11px]">{g.name}</div>
                  <div className="text-[10px] font-mono text-muted-foreground">
                    🍺 {g.price_coins}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function ViewOnceBubble({
  url,
  msgId,
  mine,
  theme,
}: {
  url: string;
  msgId: string;
  mine: boolean;
  theme: Theme;
}) {
  const storageKey = `vo-seen:${msgId}`;
  const [seen, setSeen] = useState<boolean>(() => {
    if (typeof localStorage === "undefined") return false;
    return localStorage.getItem(storageKey) === "1";
  });
  const [viewing, setViewing] = useState(false);
  const [remaining, setRemaining] = useState(10);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  // Countdown only after the image actually loaded, so a failed photo is not burned.
  useEffect(() => {
    if (!viewing || !loaded) return;
    const t = window.setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          window.clearInterval(t);
          localStorage.setItem(storageKey, "1");
          setSeen(true);
          setViewing(false);
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => window.clearInterval(t);
  }, [viewing, loaded, storageKey]);

  // Sender always sees "Foto efemeră — trimisă"
  if (mine) {
    return (
      <div
        className={`px-4 py-3 rounded-3xl min-w-[200px] flex items-center gap-3 bg-gradient-to-br ${theme.mine} ${theme.mineShadow} text-white`}
      >
        <Eye size={20} />
        <div className="leading-tight">
          <div className="font-display font-black text-sm">Foto efemeră</div>
          <div className="text-[10px] opacity-80 uppercase tracking-widest">trimisă</div>
        </div>
      </div>
    );
  }

  const open = () => {
    if (seen) return;
    setViewing(true);
    setLoaded(false);
    setFailed(false);
    setRemaining(10);
  };

  const closeViewer = (markSeen = loaded) => {
    if (markSeen) {
      localStorage.setItem(storageKey, "1");
      setSeen(true);
    }
    setViewing(false);
  };

  return (
    <>
      <button
        onClick={open}
        disabled={seen}
        className={`px-4 py-3 rounded-3xl min-w-[200px] flex items-center gap-3 transition active:scale-[0.98] ${
          seen
            ? "bg-foreground/[0.05] text-muted-foreground"
            : "bg-gradient-to-br from-neon-purple/30 via-neon-crimson/20 to-transparent border border-neon-purple/30 text-foreground"
        }`}
      >
        {seen ? <EyeOff size={20} /> : <Eye size={20} className="text-neon-purple" />}
        <div className="leading-tight text-left">
          <div className="font-display font-black text-sm">
            {seen ? "Foto văzută" : "Foto efemeră"}
          </div>
          <div className="text-[10px] opacity-80 uppercase tracking-widest">
            {seen ? "nu se mai poate redeschide" : "apasă pentru a vedea o singură dată"}
          </div>
        </div>
      </button>

      {viewing &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className="fixed inset-0 z-[200] bg-black flex items-center justify-center animate-fade-in"
            onClick={() => closeViewer()}
          >
            {!loaded && !failed && (
              <div className="absolute inset-0 flex items-center justify-center text-white/70 text-xs uppercase tracking-widest">
                se încarcă poza…
              </div>
            )}
            {failed ? (
              <div className="mx-6 rounded-3xl border border-white/15 bg-white/10 p-5 text-center text-white">
                <div className="font-display font-black mb-1">Poza nu se poate încărca</div>
                <div className="text-xs text-white/60">Încearcă din nou. Nu am marcat-o ca văzută.</div>
              </div>
            ) : (
              <img
                src={url}
                alt="poză efemeră"
                onLoad={() => setLoaded(true)}
                onError={() => setFailed(true)}
                className={`max-h-full max-w-full object-contain select-none pointer-events-none transition-opacity ${loaded ? "opacity-100" : "opacity-0"}`}
                draggable={false}
              />
            )}
            <div className="absolute top-[max(env(safe-area-inset-top),1rem)] left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-2 rounded-full bg-black/60 border border-white/15 text-white text-xs font-mono">
              <Eye size={14} className="text-neon-purple" />
              {failed ? "eroare" : loaded ? `dispare în ${remaining}s` : "se pregătește"}
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                closeViewer();
              }}
              className="absolute top-[max(env(safe-area-inset-top),1rem)] right-4 h-10 w-10 rounded-full bg-black/60 border border-white/15 text-white flex items-center justify-center"
              aria-label="închide"
            >
              <X size={18} />
            </button>
          </div>,
          document.body,
        )}
    </>
  );
}

