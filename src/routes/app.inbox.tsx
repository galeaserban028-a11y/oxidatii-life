import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { openOrCreateDM, createGroupChat } from "@/lib/chat";
import { ArrowLeft, PenSquare, Users, Loader2, Search, X, Check, Trash2 } from "lucide-react";
import { toast } from "sonner";

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

  const { data: conversations = [], isLoading } = useQuery({
    queryKey: ["inbox", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data: members } = await supabase
        .from("conversation_members")
        .select("conversation_id, last_read_at, conversations:conversation_id(id,kind,title,last_message_at)")
        .eq("user_id", user!.id);
      if (!members) return [];
      const convs = members
        .map((m: any) => ({ ...m.conversations, last_read_at: m.last_read_at }))
        .filter(Boolean)
        .sort((a: any, b: any) => (b.last_message_at ?? "").localeCompare(a.last_message_at ?? ""));

      const ids = convs.map((c: any) => c.id);
      if (!ids.length) return [];
      const [{ data: lastMsgs }, { data: allMems }] = await Promise.all([
        supabase.from("messages").select("conversation_id,body,sender_id,created_at").in("conversation_id", ids).order("created_at", { ascending: false }),
        supabase.from("conversation_members").select("conversation_id,user_id").in("conversation_id", ids),
      ]);
      const lastByConv = new Map<string, any>();
      for (const m of lastMsgs ?? []) if (!lastByConv.has(m.conversation_id)) lastByConv.set(m.conversation_id, m);

      const otherIds = new Set<string>();
      for (const m of allMems ?? []) if (m.user_id !== user!.id) otherIds.add(m.user_id);
      const { data: profs } = otherIds.size
        ? await supabase.from("profiles").select("id,handle,display_name,avatar_url").in("id", Array.from(otherIds))
        : { data: [] as any[] };
      const profMap = new Map((profs ?? []).map((p: any) => [p.id, p]));

      return convs.map((c: any) => {
        const others = (allMems ?? []).filter(m => m.conversation_id === c.id && m.user_id !== user!.id).map(m => profMap.get(m.user_id)).filter(Boolean);
        const last = lastByConv.get(c.id);
        const unread = last && last.sender_id !== user!.id && last.created_at > c.last_read_at;
        return { ...c, others, last, unread };
      });
    },
  });

  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel("inbox-stream")
      .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, () => {
        qc.invalidateQueries({ queryKey: ["inbox", user.id] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "conversation_members", filter: `user_id=eq.${user.id}` }, () => {
        qc.invalidateQueries({ queryKey: ["inbox", user.id] });
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user, qc]);

  const dms = useMemo(() => conversations.filter((c: any) => c.kind === "dm"), [conversations]);
  const groups = useMemo(() => conversations.filter((c: any) => c.kind !== "dm"), [conversations]);

  const filtered = tab === "prieteni" ? [] : tab === "grupuri" ? groups : dms;

  return (
    <div className="px-5 pt-6 pb-8 space-y-7 max-w-2xl mx-auto">
      {/* Top bar */}
      <div className="flex items-center justify-between">
        <Link to="/app" aria-label="înapoi" className="h-11 w-11 -ml-2 rounded-2xl flex items-center justify-center bg-zinc-900/30 border border-white/5 active:scale-95 transition">
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
          Conversațiile<br />
          <span className="text-fuchsia-500">tale.</span>
        </h1>
        <p className="text-[10px] text-zinc-500 uppercase tracking-widest">DM-uri și grupuri cu trupa.</p>
      </header>

      {/* Friends row (story-style) — only on Mesaje */}
      {tab === "mesaje" && conversations.length > 0 && (
        <FriendsRow onPick={async (peerId) => {
          if (!user) return;
          const cid = await openOrCreateDM(user.id, peerId);
          nav({ to: "/app/chat/$id", params: { id: cid } });
        }} />
      )}

      {/* Tab bar — text style with underline indicator */}
      <div className="flex gap-6 text-[13px] font-black uppercase tracking-wide border-b border-zinc-800/50">
        {([
          ["mesaje", "Mesaje"],
          ["grupuri", "Grupuri"],
          ["prieteni", "Prieteni"],
        ] as const).map(([k, label]) => (
          <button
            key={k}
            onClick={() => setTab(k as Tab)}
            className={`relative py-3 transition ${
              tab === k
                ? "text-white"
                : "text-zinc-500 hover:text-zinc-300"
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
          <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">se încarcă</div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-14 text-center space-y-3">
          <div className="mx-auto h-16 w-16 rounded-full bg-gradient-to-br from-neon-crimson via-neon-purple to-neon-green opacity-90 flex items-center justify-center text-2xl">💬</div>
          <div className="font-display font-black text-base">
            {tab === "prieteni" ? "Niciun prieten încă" : tab === "grupuri" ? "Niciun grup încă" : "Liniște deplină"}
          </div>
          <div className="text-xs text-muted-foreground">
            {tab === "grupuri" ? "Fă un grup cu trupa ca să țineți noaptea împreună." : "Începe o conversație nouă cu cineva din gașcă."}
          </div>

          <button onClick={() => setShowNew(true)} className="mt-2 inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-gradient-to-br from-neon-crimson via-neon-purple to-neon-purple text-white font-display font-black text-xs shadow-[0_8px_22px_-8px_theme(colors.neon-purple/0.7)] active:scale-[0.97] transition">
            <PenSquare size={14} /> Mesaj nou
          </button>
        </div>
      ) : tab === "prieteni" ? (
        <FriendsList onMessage={async (peerId) => {
          if (!user) return;
          const cid = await openOrCreateDM(user.id, peerId);
          nav({ to: "/app/chat/$id", params: { id: cid } });
        }} />
      ) : (
        <div className="space-y-1 -mx-5">
          {filtered.map((c: any) => {
            const isDM = c.kind === "dm";
            const title = isDM
              ? (c.others[0]?.handle ? `@${c.others[0].handle}` : c.others[0]?.display_name ?? "necunoscut")
              : c.title ?? `grup · ${c.others.length + 1}`;
            const initial = (isDM ? (c.others[0]?.handle ?? c.others[0]?.display_name ?? "?")[0] : "G").toUpperCase();
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
          onOpen={(id) => { setShowNew(false); nav({ to: "/app/chat/$id", params: { id } }); }}
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
      const ids = (rows ?? []).map((r: any) => r.requester_id === user!.id ? r.addressee_id : r.requester_id);
      if (!ids.length) return [];
      const { data: profs } = await supabase.from("profiles").select("id,handle,display_name,avatar_url").in("id", ids);
      return profs ?? [];
    },
  });
  if (!friends.length) return null;
  return (
    <div className="-mx-5 px-5 overflow-x-auto scrollbar-none">
      <div className="flex gap-4 pb-1">
        {friends.slice(0, 20).map((f: any) => (
          <button
            key={f.id}
            onClick={() => onPick(f.id)}
            className="flex flex-col items-center gap-2 w-[72px] shrink-0 active:scale-95 transition"
          >
            <div className="h-16 w-16 rounded-full p-[2px] bg-gradient-to-tr from-lime-400 to-fuchsia-600">
              <div className="h-full w-full rounded-full border-2 border-black overflow-hidden bg-zinc-800">
                {f.avatar_url
                  ? <img src={f.avatar_url} alt="" className="h-full w-full object-cover" />
                  : <div className="h-full w-full bg-gradient-to-br from-fuchsia-600 to-rose-600 flex items-center justify-center font-display font-black text-white">{(f.handle ?? "?")[0]?.toUpperCase()}</div>}
              </div>
            </div>
            <div className="text-[9px] font-bold uppercase tracking-tighter truncate w-full text-center text-zinc-400">@{f.handle ?? f.display_name ?? "?"}</div>
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
      const ids = (rows ?? []).map((r: any) => r.requester_id === user!.id ? r.addressee_id : r.requester_id);
      if (!ids.length) return [];
      const { data: profs } = await supabase.from("profiles").select("id,handle,display_name,avatar_url").in("id", ids);
      return profs ?? [];
    },
  });

  if (isLoading) {
    return (
      <div className="py-10 flex flex-col items-center gap-2">
        <div className="h-7 w-7 rounded-full border-2 border-foreground/15 border-t-foreground animate-spin" />
        <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">se încarcă</div>
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
        <div className="text-xs text-muted-foreground">Adaugă oameni din gașcă pentru a începe.</div>
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
              {f.avatar_url
                ? <img src={f.avatar_url} alt="" className="h-full w-full object-cover" />
                : <div className="h-full w-full bg-gradient-to-br from-fuchsia-600 to-rose-600 flex items-center justify-center font-display font-black text-white">{(f.handle ?? "?")[0]?.toUpperCase()}</div>}
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-display font-black uppercase tracking-tight text-sm text-white truncate">@{f.handle ?? f.display_name ?? "?"}</div>
            {f.display_name && f.handle && (
              <div className="text-[11px] text-zinc-500 truncate">{f.display_name}</div>
            )}
          </div>
          <div className="text-[10px] font-black uppercase tracking-widest text-lime-400 shrink-0">mesaj</div>
        </button>
      ))}
    </div>
  );
}


function timeAgo(iso?: string) {
  if (!iso) return "";
  const d = new Date(iso); const s = Math.floor((Date.now() - d.getTime()) / 1000);
  if (s < 60) return "acum"; if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`; return `${Math.floor(s / 86400)}z`;
}

function NewMessageSheet({ onClose, onOpen }: { onClose: () => void; onOpen: (id: string) => void }) {
  const { user } = useAuth();
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [title, setTitle] = useState("");
  const [saving, setSaving] = useState(false);

  const { data: friends = [] } = useQuery({
    queryKey: ["friends-for-message", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data: rows } = await supabase
        .from("friendships")
        .select("requester_id,addressee_id,status")
        .eq("status", "accepted")
        .or(`requester_id.eq.${user!.id},addressee_id.eq.${user!.id}`);
      const ids = (rows ?? []).map((r: any) => r.requester_id === user!.id ? r.addressee_id : r.requester_id);
      if (!ids.length) return [];
      const { data: profs } = await supabase.from("profiles").select("id,handle,display_name,avatar_url").in("id", ids);
      return profs ?? [];
    },
  });

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return friends;
    return friends.filter((f: any) =>
      (f.handle ?? "").toLowerCase().includes(needle) ||
      (f.display_name ?? "").toLowerCase().includes(needle)
    );
  }, [friends, q]);

  const toggle = (id: string) => setSelected(s => {
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
    } catch (e: any) {
      alert(e.message ?? "ceva nu a mers"); setSaving(false);
    }
  };

  const mode = selected.size <= 1 ? "dm" : "grup";

  return (
    <div className="fixed inset-0 z-[100] bg-background/95 backdrop-blur-md flex flex-col">
      <div className="flex items-center justify-between p-4 border-b border-foreground/10">
        <div>
          <div className="font-display font-black text-xl">mesaj nou</div>
          <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            {selected.size === 0 ? "alege o persoană" : selected.size === 1 ? "conversație 1 la 1" : `grup · ${selected.size} persoane`}
          </div>
        </div>
        <button onClick={onClose} aria-label="închide" className="h-10 w-10 rounded-full bg-foreground/10 flex items-center justify-center">
          <X size={16} />
        </button>
      </div>

      <div className="p-4 space-y-3 border-b border-foreground/5">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="caută prieten…"
            className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-foreground/5 border border-foreground/15 text-sm"
          />
        </div>
        {mode === "grup" && (
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="nume grup (opțional)"
            className="w-full px-3 py-2.5 rounded-xl bg-foreground/5 border border-foreground/15 font-display text-sm"
          />
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
        {friends.length === 0 ? (
          <div className="text-center py-10 text-xs text-muted-foreground">nu ai încă prieteni adăugați</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-10 text-xs text-muted-foreground">nimeni nu se potrivește</div>
        ) : filtered.map((f: any) => {
          const isSel = selected.has(f.id);
          return (
            <button key={f.id} onClick={() => toggle(f.id)}
              className={`w-full flex items-center gap-3 p-2.5 rounded-xl border transition ${
                isSel ? "bg-foreground/10 border-foreground/40" : "bg-foreground/[0.03] border-foreground/10"
              }`}>
              <div className="h-10 w-10 rounded-full overflow-hidden bg-gradient-to-br from-neon-crimson to-neon-purple flex items-center justify-center font-display text-sm text-white shrink-0">
                {f.avatar_url ? <img src={f.avatar_url} alt="" className="h-full w-full object-cover" /> : (f.handle ?? "?")[0]?.toUpperCase()}
              </div>
              <div className="flex-1 text-left min-w-0">
                <div className="font-display font-bold text-sm truncate">@{f.handle ?? f.display_name}</div>
                {f.display_name && f.handle && (
                  <div className="text-[11px] text-muted-foreground truncate">{f.display_name}</div>
                )}
              </div>
              <div className={`h-5 w-5 rounded-full border flex items-center justify-center ${isSel ? "bg-foreground border-foreground" : "border-foreground/25"}`}>
                {isSel && <Check size={12} className="text-background" />}
              </div>
            </button>
          );
        })}
      </div>

      <div className="p-4 border-t border-foreground/10">
        <button onClick={go} disabled={saving || selected.size < 1}
          className="w-full py-3 rounded-xl bg-foreground text-background font-display font-black text-sm uppercase tracking-wide disabled:opacity-40 flex items-center justify-center gap-2">
          {saving && <Loader2 className="animate-spin" size={16} />}
          {selected.size === 0 ? "alege pe cineva" : mode === "dm" ? "deschide conversația" : `creează grup de ${selected.size + 1}`}
        </button>
      </div>
    </div>
  );
}

export { openOrCreateDM };
