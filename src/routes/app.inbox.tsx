import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { throttle } from "@/lib/throttle";
import { useAuth } from "@/lib/auth";
import { openOrCreateDM, createGroupChat } from "@/lib/chat";
import { ArrowLeft, PenSquare, Users, Loader2, Search, X, Check, Trash2, ImageIcon, Video, Mic, Paperclip } from "lucide-react";
import { toast } from "sonner";
import { errorMessage } from "@/lib/errors";

export const Route = createFileRoute("/app/inbox")({
  head: () => ({ meta: [{ title: "Mesaje · OXIDAȚII" }] }),
  component: InboxPage,
});

type Tab = "mesaje" | "grupuri" | "prieteni";

function InboxPage() {
  const { user } = useAuth();
  const nav = useNavigate();
  const qc = useQueryClient();
  const [showNew, setShowNew] = useState(false);
  const [tab, setTab] = useState<Tab>("mesaje");

  type ConvBase = { id: string; kind: string; title: string | null; last_message_at: string | null };
  type ConvWithRead = ConvBase & { last_read_at: string | null };
  type LastMsg = { conversation_id: string; body: string | null; sender_id: string; created_at: string };
  type ProfLite = { id: string; handle: string | null; display_name: string | null; avatar_url: string | null };
  type ConvItem = ConvWithRead & { others: ProfLite[]; last: LastMsg | null; unread: boolean };

  const { data: conversations = [] as ConvItem[], isLoading } = useQuery<ConvItem[]>({
    queryKey: ["inbox", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data: members } = await supabase
        .from("conversation_members")
        .select(
          "conversation_id, last_read_at, conversations:conversation_id(id,kind,title,last_message_at)",
        )
        .eq("user_id", user!.id);
      if (!members) return [];
      type MemberRow = { conversation_id: string; last_read_at: string | null; conversations: ConvBase | null };
      const convs = (members as MemberRow[])
        .map((m) => (m.conversations ? { ...m.conversations, last_read_at: m.last_read_at } : null))
        .filter((c): c is ConvWithRead => !!c)
        .sort((a, b) => (b.last_message_at ?? "").localeCompare(a.last_message_at ?? ""));

      const ids = convs.map((c) => c.id);
      if (!ids.length) return [];
      const [{ data: lastMsgs }, { data: allMems }] = await Promise.all([
        supabase
          .from("messages")
          .select("conversation_id,body,sender_id,created_at")
          .in("conversation_id", ids)
          .order("created_at", { ascending: false }),
        supabase
          .from("conversation_members")
          .select("conversation_id,user_id")
          .in("conversation_id", ids),
      ]);
      const lastByConv = new Map<string, LastMsg>();
      for (const m of (lastMsgs ?? []) as LastMsg[])
        if (!lastByConv.has(m.conversation_id)) lastByConv.set(m.conversation_id, m);

      const otherIds = new Set<string>();
      type MemLite = { conversation_id: string; user_id: string };
      const memRows = (allMems ?? []) as MemLite[];
      for (const m of memRows) if (m.user_id !== user!.id) otherIds.add(m.user_id);
      const { data: profs } = otherIds.size
        ? await supabase
            .from("profiles")
            .select("id,handle,display_name,avatar_url")
            .in("id", Array.from(otherIds))
        : { data: [] as ProfLite[] };
      const profMap = new Map<string, ProfLite>(
        ((profs ?? []) as ProfLite[]).map((p) => [p.id, p]),
      );

      return convs.map((c) => {
        const others = memRows
          .filter((m) => m.conversation_id === c.id && m.user_id !== user!.id)
          .map((m) => profMap.get(m.user_id))
          .filter((p): p is ProfLite => !!p);
        const last = lastByConv.get(c.id) ?? null;
        const unread = !!last && last.sender_id !== user!.id && !!c.last_read_at && last.created_at > c.last_read_at;
        return { ...c, others, last, unread };
      });
    },
  });

  useEffect(() => {
    if (!user?.id) return;
    const userId = user.id;
    const channelName = `inbox-stream:${userId}:${Date.now()}:${Math.random().toString(36).slice(2)}`;
    // Throttle: messages stream is global; coalesce bursts to 1 refetch / 1.5s
    const refresh = throttle(() => {
      qc.invalidateQueries({ queryKey: ["inbox", userId] });
    }, 1500);
    const ch = supabase
      .channel(channelName)
      .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, refresh)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "conversation_members",
          filter: `user_id=eq.${userId}`,
        },
        refresh,
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [user?.id, qc]);

  const dms = useMemo(() => conversations.filter((c) => c.kind === "dm"), [conversations]);
  const groups = useMemo(() => conversations.filter((c) => c.kind !== "dm"), [conversations]);

  const filtered = tab === "prieteni" ? [] : tab === "grupuri" ? groups : dms;

  return (
    <div className="px-5 pt-6 pb-8 space-y-7 max-w-2xl mx-auto">
      {/* Top bar */}
      <div className="flex items-center justify-between">
        <Link
          to="/app"
          aria-label="înapoi"
          className="h-11 w-11 -ml-2 rounded-2xl flex items-center justify-center bg-zinc-900/30 border border-white/5 active:scale-95 transition"
        >
          <ArrowLeft size={20} />
        </Link>
        <div className="text-[10px] uppercase tracking-[0.3em] text-zinc-500">mesaje</div>
        <button
          onClick={() => setShowNew(true)}
          aria-label="mesaj nou"
          className="h-11 w-11 -mr-2 rounded-2xl flex items-center justify-center bg-zinc-900/30 border border-white/5 active:scale-95 transition"
        >
          <PenSquare size={18} />
        </button>
      </div>

      <header className="space-y-2">
        <h1 className="font-display font-black uppercase text-4xl leading-[0.9] tracking-tighter">
          Conversațiile
          <br />
          <span className="text-fuchsia-500">tale.</span>
        </h1>
        <p className="text-[10px] text-zinc-500 uppercase tracking-widest">
          DM-uri și grupuri cu trupa.
        </p>
        <Link
          to="/app/lastcalls"
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-neon-violet/15 border border-neon-violet/40 text-neon-violet text-xs font-display font-bold uppercase tracking-wider hover:bg-neon-violet/25 transition"
        >
          ⚡ Last Calls
        </Link>
      </header>

      {/* Friends row (story-style) — only on Mesaje */}
      {tab === "mesaje" && conversations.length > 0 && (
        <FriendsRow
          onPick={async (peerId) => {
            if (!user) return;
            const cid = await openOrCreateDM(user.id, peerId);
            nav({ to: "/app/chat/$id", params: { id: cid } });
          }}
        />
      )}

      {/* Tab bar — text style with underline indicator */}
      <div className="flex gap-6 text-[13px] font-black uppercase tracking-wide border-b border-zinc-800/50">
        {(
          [
            ["mesaje", "Mesaje"],
            ["grupuri", "Grupuri"],
            ["prieteni", "Prieteni"],
          ] as const
        ).map(([k, label]) => (
          <button
            key={k}
            onClick={() => setTab(k as Tab)}
            className={`relative py-3 transition ${
              tab === k ? "text-white" : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            {label}
            {tab === k && (
              <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-neon-crimson via-neon-purple to-neon-green rounded-full" />
            )}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="py-10 flex flex-col items-center gap-2">
          <div className="h-7 w-7 rounded-full border-2 border-foreground/15 border-t-foreground animate-spin" />
          <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            se încarcă
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-14 text-center space-y-3">
          <div className="mx-auto h-16 w-16 rounded-full bg-gradient-to-br from-neon-crimson via-neon-purple to-neon-green opacity-90 flex items-center justify-center text-2xl">
            💬
          </div>
          <div className="font-display font-black text-base">
            {tab === "prieteni"
              ? "Niciun prieten încă"
              : tab === "grupuri"
                ? "Niciun grup încă"
                : "Liniște deplină"}
          </div>
          <div className="text-xs text-muted-foreground">
            {tab === "grupuri"
              ? "Fă un grup cu trupa ca să țineți noaptea împreună."
              : "Începe o conversație nouă cu cineva din gașcă."}
          </div>

          <button
            onClick={() => setShowNew(true)}
            className="mt-2 inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-gradient-to-br from-neon-crimson via-neon-purple to-neon-purple text-white font-display font-black text-xs shadow-[0_8px_22px_-8px_theme(colors.neon-purple/0.7)] active:scale-[0.97] transition"
          >
            <PenSquare size={14} /> Mesaj nou
          </button>
        </div>
      ) : tab === "prieteni" ? (
        <FriendsList
          onMessage={async (peerId) => {
            if (!user) return;
            const cid = await openOrCreateDM(user.id, peerId);
            nav({ to: "/app/chat/$id", params: { id: cid } });
          }}
        />
      ) : (
        <div className="space-y-1 -mx-5">
          {filtered.map((c) => {
            const isDM = c.kind === "dm";
            const title = isDM
              ? c.others[0]?.handle
                ? `@${c.others[0].handle}`
                : (c.others[0]?.display_name ?? "necunoscut")
              : (c.title ?? `grup · ${c.others.length + 1}`);
            const initial = (
              isDM ? (c.others[0]?.handle ?? c.others[0]?.display_name ?? "?")[0] : "G"
            ).toUpperCase();
            return (
              <ConversationRow
                key={c.id}
                conv={c}
                title={title}
                initial={initial}
                isDM={isDM}
                meId={user?.id}
                onDeleted={() => qc.invalidateQueries({ queryKey: ["inbox", user?.id] })}
              />
            );
          })}
        </div>
      )}

      {/* Floating new-message FAB */}
      <button
        onClick={() => setShowNew(true)}
        aria-label="mesaj nou"
        className="fixed bottom-28 right-5 w-16 h-16 rounded-2xl bg-gradient-to-br from-fuchsia-600 to-rose-600 flex items-center justify-center shadow-[0_0_30px_rgba(225,29,72,0.45)] border border-white/20 rotate-3 active:scale-95 transition-transform z-40"
      >
        <PenSquare size={26} className="-rotate-3 text-white" strokeWidth={2.5} />
      </button>

      {showNew && (
        <NewMessageSheet
          onClose={() => setShowNew(false)}
          onOpen={(id) => {
            setShowNew(false);
            nav({ to: "/app/chat/$id", params: { id } });
          }}
        />
      )}
    </div>
  );
}

function FriendsRow({ onPick }: { onPick: (id: string) => void }) {
  const { user } = useAuth();
  const { data: friends = [] } = useQuery({
    queryKey: ["friends-row", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data: rows } = await supabase
        .from("friendships")
        .select("requester_id,addressee_id,status")
        .eq("status", "accepted")
        .or(`requester_id.eq.${user!.id},addressee_id.eq.${user!.id}`);
      type FR = { requester_id: string; addressee_id: string; status: string };
      const ids = ((rows ?? []) as FR[]).map((r) =>
        r.requester_id === user!.id ? r.addressee_id : r.requester_id,
      );
      if (!ids.length) return [];
      const { data: profs } = await supabase
        .from("profiles")
        .select("id,handle,display_name,avatar_url")
        .in("id", ids);
      return profs ?? [];
    },
  });
  if (!friends.length) return null;
  return (
    <div className="-mx-5 px-5 overflow-x-auto scrollbar-none">
      <div className="flex gap-4 pb-1">
        {friends.slice(0, 20).map((f) => (
          <button
            key={f.id}
            onClick={() => onPick(f.id)}
            className="flex flex-col items-center gap-2 w-[72px] shrink-0 active:scale-95 transition"
          >
            <div className="h-16 w-16 rounded-full p-[2px] bg-gradient-to-tr from-lime-400 to-fuchsia-600">
              <div className="h-full w-full rounded-full border-2 border-black overflow-hidden bg-zinc-800">
                {f.avatar_url ? (
                  <img src={f.avatar_url} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="h-full w-full bg-gradient-to-br from-fuchsia-600 to-rose-600 flex items-center justify-center font-display font-black text-white">
                    {(f.handle ?? "?")[0]?.toUpperCase()}
                  </div>
                )}
              </div>
            </div>
            <div className="text-[9px] font-bold uppercase tracking-tighter truncate w-full text-center text-zinc-400">
              @{f.handle ?? f.display_name ?? "?"}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function FriendsList({ onMessage }: { onMessage: (id: string) => void }) {
  const { user } = useAuth();
  const { data: friends = [], isLoading } = useQuery({
    queryKey: ["friends-list", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data: rows } = await supabase
        .from("friendships")
        .select("requester_id,addressee_id,status")
        .eq("status", "accepted")
        .or(`requester_id.eq.${user!.id},addressee_id.eq.${user!.id}`);
      const ids = (rows ?? []).map((r: any) =>
        r.requester_id === user!.id ? r.addressee_id : r.requester_id,
      );
      if (!ids.length) return [];
      const { data: profs } = await supabase
        .from("profiles")
        .select("id,handle,display_name,avatar_url")
        .in("id", ids);
      return profs ?? [];
    },
  });

  if (isLoading) {
    return (
      <div className="py-10 flex flex-col items-center gap-2">
        <div className="h-7 w-7 rounded-full border-2 border-foreground/15 border-t-foreground animate-spin" />
        <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          se încarcă
        </div>
      </div>
    );
  }

  if (!friends.length) {
    return (
      <div className="py-14 text-center space-y-3">
        <div className="mx-auto h-16 w-16 rounded-full bg-gradient-to-br from-neon-crimson via-neon-purple to-neon-green opacity-90 flex items-center justify-center">
          <Users size={26} className="text-white" />
        </div>
        <div className="font-display font-black text-base">Niciun prieten încă</div>
        <div className="text-xs text-muted-foreground">
          Adaugă oameni din gașcă pentru a începe.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-1 -mx-5">
      {friends.map((f: any) => (
        <button
          key={f.id}
          onClick={() => onMessage(f.id)}
          className="w-full flex items-center gap-4 px-5 py-3 border-y border-transparent hover:bg-zinc-900/30 active:bg-zinc-900/60 transition text-left"
        >
          <div className="h-12 w-12 rounded-full p-[2px] bg-gradient-to-tr from-lime-400 to-fuchsia-600 shrink-0">
            <div className="h-full w-full rounded-full border-2 border-black overflow-hidden bg-zinc-800">
              {f.avatar_url ? (
                <img src={f.avatar_url} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="h-full w-full bg-gradient-to-br from-fuchsia-600 to-rose-600 flex items-center justify-center font-display font-black text-white">
                  {(f.handle ?? "?")[0]?.toUpperCase()}
                </div>
              )}
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-display font-black uppercase tracking-tight text-sm text-white truncate">
              @{f.handle ?? f.display_name ?? "?"}
            </div>
            {f.display_name && f.handle && (
              <div className="text-[11px] text-zinc-500 truncate">{f.display_name}</div>
            )}
          </div>
          <div className="text-[10px] font-black uppercase tracking-widest text-lime-400 shrink-0">
            mesaj
          </div>
        </button>
      ))}
    </div>
  );
}

const REVEAL = 88;
const TRIGGER = 80; // more intentional open threshold
const VELOCITY_THRESHOLD = 1.2; // px/ms — fast left flick also opens
const VISIBILITY_THRESHOLD = 28; // show delete button only after deliberate left swipe

function formatPreview(body: string | null | undefined): ReactNode {
  if (!body) return "";
  const trimmed = body.trim();
  const isUrl = /^https?:\/\/\S+$/i.test(trimmed);
  if (isUrl) {
    if (/\.(png|jpe?g|gif|webp|heic|heif|avif)(\?|$)/i.test(trimmed)) return <ImageIcon size={14} className="inline text-fuchsia-400" />;
    if (/\.(mp4|mov|webm|m4v)(\?|$)/i.test(trimmed)) return <Video size={14} className="inline text-cyan-400" />;
    if (/\.(mp3|m4a|ogg|wav|webm)(\?|$)/i.test(trimmed)) return <Mic size={14} className="inline text-lime-400" />;
    if (/\/storage\/v1\/object\//i.test(trimmed)) return <Paperclip size={14} className="inline text-zinc-400" />;
    // Generic link: show clean URL text, no emoji/icon
    return trimmed.replace(/^https?:\/\/(www\.)?/i, "").replace(/\/$/, "");
  }
  // Strip inline URLs from mixed text (no emoji, no icon)
  return trimmed.replace(/https?:\/\/\S+/gi, "").replace(/\s+/g, " ").trim();
}

function ConversationRow({
  conv,
  title,
  initial,
  isDM,
  meId,
  onDeleted,
}: {
  conv: any;
  title: string;
  initial: string;
  isDM: boolean;
  meId?: string;
  onDeleted: () => void;
}) {
  const nav = useNavigate();
  const [dx, setDx] = useState(0);
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [removed, setRemoved] = useState(false);
  const start = useRef<{ x: number; y: number; t: number; lock: "h" | "v" | null }>({
    x: 0,
    y: 0,
    t: 0,
    lock: null,
  });
  const currentDx = useRef(0);
  const moved = useRef(false);

  function applyDx(next: number) {
    currentDx.current = next;
    setDx(next);
  }

  function onPointerDown(e: React.PointerEvent) {
    if (deleting) return;
    start.current = { x: e.clientX, y: e.clientY, t: Date.now(), lock: null };
    currentDx.current = open ? -REVEAL : 0;
    moved.current = false;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }
  function onPointerMove(e: React.PointerEvent) {
    const ddx = e.clientX - start.current.x;
    const ddy = e.clientY - start.current.y;
    if (!start.current.lock) {
      if (Math.abs(ddx) < 6 && Math.abs(ddy) < 6) return;
      start.current.lock = Math.abs(ddx) > Math.abs(ddy) ? "h" : "v";
    }
    if (start.current.lock !== "h") return;
    moved.current = true;
    const base = open ? -REVEAL : 0;
    let next = base + ddx;
    if (next > 0) next = next / 4; // rubberband right
    if (next < -REVEAL - 30) next = -REVEAL - 30 + (next + REVEAL + 30) / 4;
    applyDx(next);
  }
  function onPointerUp() {
    if (start.current.lock !== "h") {
      applyDx(open ? -REVEAL : 0);
      return;
    }
    const elapsed = Date.now() - start.current.t;
    const base = open ? -REVEAL : 0;
    const travel = Math.abs(currentDx.current - base);
    const velocity = elapsed > 0 ? travel / elapsed : 0;
    const movingLeft = currentDx.current < base;

    let willOpen: boolean;
    if (open) {
      // Stay open unless pulled back past the halfway point
      willOpen = currentDx.current < -(REVEAL / 2);
    } else {
      // Open only on deliberate distance or a fast left flick
      willOpen = currentDx.current < -TRIGGER || (movingLeft && velocity > VELOCITY_THRESHOLD);
    }

    setOpen(willOpen);
    applyDx(willOpen ? -REVEAL : 0);
  }

  function onClickRow(e: React.MouseEvent) {
    if (moved.current) {
      e.preventDefault();
      moved.current = false;
      return;
    }
    if (open) {
      e.preventDefault();
      setOpen(false);
      applyDx(0);
      return;
    }
    nav({ to: "/app/chat/$id", params: { id: conv.id } });
  }

  async function handleDelete(e: React.MouseEvent) {
    e.stopPropagation();
    if (!meId || deleting) return;
    setDeleting(true);
    const { error } = await supabase
      .from("conversation_members")
      .delete()
      .eq("conversation_id", conv.id)
      .eq("user_id", meId);
    if (error) {
      toast.error("Nu s-a putut șterge");
      setDeleting(false);
      return;
    }
    setRemoved(true);
    setTimeout(onDeleted, 250);
  }

  if (removed) return null;

  const subtitle = conv.last
    ? formatPreview(conv.last.body)
    : isDM
      ? "Spune ceva 👋"
      : "Grup nou";

  return (
    <div className="relative overflow-hidden">
      {/* Delete action behind — visible only while swiping left or when row is open */}
      <div
        className={`absolute inset-y-0 right-0 flex items-stretch transition-opacity duration-200 ${
          open || dx < -VISIBILITY_THRESHOLD ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      >
        <button
          onClick={handleDelete}
          disabled={deleting}
          aria-label="Șterge conversația"
          className="w-[88px] flex flex-col items-center justify-center gap-1 bg-gradient-to-b from-rose-600 to-red-700 text-white active:scale-95 transition disabled:opacity-60"
        >
          {deleting ? (
            <Loader2 size={20} className="animate-spin" />
          ) : (
            <>
              <Trash2 size={20} />
              <span className="text-[9px] font-black uppercase tracking-widest">Șterge</span>
            </>
          )}
        </button>
      </div>

      {/* Foreground row */}
      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onClick={onClickRow}
        style={{
          transform: `translateX(${dx}px)`,
          transition:
            start.current.lock === "h" &&
            Date.now() - start.current.t < 1000 &&
            Math.abs(dx) !== REVEAL &&
            dx !== 0
              ? "none"
              : "transform 220ms cubic-bezier(0.22, 1, 0.36, 1)",
          touchAction: "pan-y",
        }}
        className={`relative flex items-center gap-4 px-5 py-4 border-y cursor-pointer select-none ${
          conv.unread
            ? "bg-zinc-900/40 border-zinc-800/50"
            : "border-transparent hover:bg-zinc-900/20"
        }`}
      >
        {conv.unread && (
          <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-12 bg-lime-400 rounded-r-full shadow-[0_0_10px_#00e5ff]" />
        )}
        <div className="relative shrink-0">
          <div className="h-14 w-14 rounded-full bg-zinc-800 border border-zinc-700 overflow-hidden">
            {isDM && conv.others[0]?.avatar_url ? (
              <img
                src={conv.others[0].avatar_url}
                alt=""
                className="h-full w-full object-cover pointer-events-none"
                draggable={false}
              />
            ) : (
              <div className="h-full w-full bg-gradient-to-br from-fuchsia-600 to-rose-600 flex items-center justify-center font-display font-black text-white text-lg">
                {isDM ? initial : <Users size={20} />}
              </div>
            )}
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-baseline gap-2 mb-1">
            <h3
              className={`font-display uppercase tracking-tight truncate text-sm ${conv.unread ? "font-black text-white" : "font-bold text-zinc-300"}`}
            >
              {title}
            </h3>
            <span
              className={`text-[10px] font-bold shrink-0 tabular-nums uppercase ${conv.unread ? "text-lime-400" : "text-zinc-600"}`}
            >
              {timeAgo(conv.last?.created_at ?? conv.last_message_at)}
            </span>
          </div>
          <p
            className={`text-xs truncate ${conv.unread ? "text-zinc-300 font-medium" : "text-zinc-500"}`}
          >
            {conv.last && conv.last.sender_id === meId && (
              <span className="text-zinc-600 italic mr-1">Tu:</span>
            )}
            {subtitle}
          </p>
        </div>
      </div>
    </div>
  );
}

function timeAgo(iso?: string) {
  if (!iso) return "";
  const d = new Date(iso);
  const s = Math.floor((Date.now() - d.getTime()) / 1000);
  if (s < 60) return "acum";
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}z`;
}

function NewMessageSheet({
  onClose,
  onOpen,
}: {
  onClose: () => void;
  onOpen: (id: string) => void;
}) {
  const { user } = useAuth();
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [title, setTitle] = useState("");
  const [saving, setSaving] = useState(false);

  const { data: people = [] } = useQuery({
    queryKey: ["people-for-message", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const [{ data: friendRows }, { data: followRows }] = await Promise.all([
        supabase
          .from("friendships")
          .select("requester_id,addressee_id,status")
          .eq("status", "accepted")
          .or(`requester_id.eq.${user!.id},addressee_id.eq.${user!.id}`),
        supabase
          .from("follows")
          .select("following_id")
          .eq("follower_id", user!.id)
          .eq("status", "accepted"),
      ]);
      const friendIds = new Set(
        (friendRows ?? []).map((r: any) =>
          r.requester_id === user!.id ? r.addressee_id : r.requester_id,
        ),
      );
      const followIds = new Set((followRows ?? []).map((r: any) => r.following_id));
      const allIds = Array.from(new Set([...friendIds, ...followIds]));
      if (!allIds.length) return [];
      const { data: profs } = await supabase
        .from("profiles")
        .select("id,handle,display_name,avatar_url")
        .in("id", allIds);
      return (profs ?? []).map((p: any) => ({
        ...p,
        isFriend: friendIds.has(p.id),
        isFollowing: followIds.has(p.id),
      }));
    },
  });
  const friends = people;

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return friends;
    return friends.filter(
      (f: any) =>
        (f.handle ?? "").toLowerCase().includes(needle) ||
        (f.display_name ?? "").toLowerCase().includes(needle),
    );
  }, [friends, q]);

  const toggle = (id: string) =>
    setSelected((s) => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });

  const go = async () => {
    if (!user || selected.size < 1) return;
    setSaving(true);
    try {
      const ids = Array.from(selected);
      if (ids.length === 1) {
        const id = await openOrCreateDM(user.id, ids[0]);
        onOpen(id);
      } else {
        const finalTitle = title.trim() || `grup · ${new Date().toLocaleDateString("ro-RO")}`;
        const id = await createGroupChat(user.id, finalTitle, ids);
        onOpen(id);
      }
    } catch (e) {
      alert(errorMessage(e, "ceva nu a mers"));
      setSaving(false);
    }
  };

  const mode = selected.size <= 1 ? "dm" : "grup";

  return (
    <div className="fixed inset-0 z-[100] bg-background/95 backdrop-blur-md flex flex-col">
      <div className="flex items-center justify-between p-4 border-b border-foreground/10">
        <div>
          <div className="font-display font-black text-xl">mesaj nou</div>
          <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            {selected.size === 0
              ? "alege o persoană"
              : selected.size === 1
                ? "conversație 1 la 1"
                : `grup · ${selected.size} persoane`}
          </div>
        </div>
        <button
          onClick={onClose}
          aria-label="închide"
          className="h-10 w-10 rounded-full bg-foreground/10 flex items-center justify-center"
        >
          <X size={16} />
        </button>
      </div>

      <div className="p-4 space-y-3 border-b border-foreground/5">
        <div className="relative">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="caută prieten sau pe cine urmărești…"
            className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-foreground/5 border border-foreground/15 text-sm"
          />
        </div>
        {mode === "grup" && (
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="nume grup (opțional)"
            className="w-full px-3 py-2.5 rounded-xl bg-foreground/5 border border-foreground/15 font-display text-sm"
          />
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
        {friends.length === 0 ? (
          <div className="text-center py-10 text-xs text-muted-foreground">
            nu ai prieteni sau persoane urmărite încă
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-10 text-xs text-muted-foreground">
            nimeni nu se potrivește
          </div>
        ) : (
          filtered.map((f: any) => {
            const isSel = selected.has(f.id);
            return (
              <button
                key={f.id}
                onClick={() => toggle(f.id)}
                className={`w-full flex items-center gap-3 p-2.5 rounded-xl border transition ${
                  isSel
                    ? "bg-foreground/10 border-foreground/40"
                    : "bg-foreground/[0.03] border-foreground/10"
                }`}
              >
                <div className="h-10 w-10 rounded-full overflow-hidden bg-gradient-to-br from-neon-crimson to-neon-purple flex items-center justify-center font-display text-sm text-white shrink-0">
                  {f.avatar_url ? (
                    <img src={f.avatar_url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    (f.handle ?? "?")[0]?.toUpperCase()
                  )}
                </div>
                <div className="flex-1 text-left min-w-0">
                  <div className="font-display font-bold text-sm truncate">
                    @{f.handle ?? f.display_name}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    {f.display_name && f.handle && (
                      <div className="text-[11px] text-muted-foreground truncate">
                        {f.display_name}
                      </div>
                    )}
                    <span
                      className={`text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded ${f.isFriend ? "bg-lime-400/15 text-lime-400" : "bg-fuchsia-500/15 text-fuchsia-400"}`}
                    >
                      {f.isFriend ? "prieten" : "urmărești"}
                    </span>
                  </div>
                </div>
                <div
                  className={`h-5 w-5 rounded-full border flex items-center justify-center ${isSel ? "bg-foreground border-foreground" : "border-foreground/25"}`}
                >
                  {isSel && <Check size={12} className="text-background" />}
                </div>
              </button>
            );
          })
        )}
      </div>

      <div className="p-4 border-t border-foreground/10">
        <button
          onClick={go}
          disabled={saving || selected.size < 1}
          className="w-full py-3 rounded-xl bg-foreground text-background font-display font-black text-sm uppercase tracking-wide disabled:opacity-40 flex items-center justify-center gap-2"
        >
          {saving && <Loader2 className="animate-spin" size={16} />}
          {selected.size === 0
            ? "alege pe cineva"
            : mode === "dm"
              ? "deschide conversația"
              : `creează grup de ${selected.size + 1}`}
        </button>
      </div>
    </div>
  );
}

export { openOrCreateDM };
