import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { openOrCreateDM, createGroupChat } from "@/lib/chat";
import { ArrowLeft, PenSquare, Users, Loader2, Search, X, Check } from "lucide-react";

export const Route = createFileRoute("/app/inbox")({
  head: () => ({ meta: [{ title: "Mesaje · OXIDAȚII" }] }),
  component: InboxPage,
});

type Tab = "toate" | "dm" | "grup";

function InboxPage() {
  const { user } = useAuth();
  const nav = useNavigate();
  const qc = useQueryClient();
  const [showNew, setShowNew] = useState(false);
  const [tab, setTab] = useState<Tab>("toate");

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
        .sort((a: any, b: any) => b.last_message_at.localeCompare(a.last_message_at));

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
  const unreadCount = conversations.filter((c: any) => c.unread).length;

  const filtered = tab === "dm" ? dms : tab === "grup" ? groups : conversations;

  return (
    <div className="px-4 pt-5 pb-4 space-y-4">
      <div className="flex items-center justify-between">
        <Link to="/app" className="inline-flex items-center gap-1 text-xs font-mono uppercase tracking-widest text-muted-foreground">
          <ArrowLeft size={14} /> înapoi
        </Link>
        <button
          onClick={() => setShowNew(true)}
          aria-label="mesaj nou"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-foreground/5 border border-foreground/15 font-mono text-[10px] uppercase tracking-widest"
        >
          <PenSquare size={12} /> scrie
        </button>
      </div>

      <header className="space-y-1">
        <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">mesaje</div>
        <h1 className="font-display font-black text-2xl tracking-tight leading-none">
          {unreadCount > 0 ? `${unreadCount} necitite` : "totul citit"}
        </h1>
      </header>

      {/* segmented */}
      <div className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-foreground/5 border border-foreground/10 text-[10px] font-mono uppercase tracking-widest">
        {([
          ["toate", conversations.length],
          ["dm", dms.length],
          ["grup", groups.length],
        ] as const).map(([k, n]) => (
          <button
            key={k}
            onClick={() => setTab(k as Tab)}
            className={`py-1.5 rounded-lg transition ${tab === k ? "bg-foreground text-background" : "text-muted-foreground"}`}
          >
            {k} · {n}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="py-8 text-center font-mono text-xs text-muted-foreground">o secundă…</div>
      ) : filtered.length === 0 ? (
        <div className="py-14 text-center space-y-2">
          <div className="font-display font-bold text-sm">
            {tab === "dm" ? "nu ai conversații personale" : tab === "grup" ? "nu ai niciun grup" : "nu ai conversații"}
          </div>
          <div className="text-xs text-muted-foreground">apasă „scrie" ca să începi una</div>
          <button onClick={() => setShowNew(true)} className="mt-2 inline-flex items-center gap-1.5 px-3 py-2 rounded-full bg-foreground text-background font-mono text-[10px] uppercase tracking-widest">
            <PenSquare size={12} /> mesaj nou
          </button>
        </div>
      ) : (
        <div className="space-y-1">
          {filtered.map((c: any) => {
            const isDM = c.kind === "dm";
            const title = isDM
              ? (c.others[0]?.handle ? `@${c.others[0].handle}` : c.others[0]?.display_name ?? "necunoscut")
              : c.title ?? `grup · ${c.others.length + 1}`;
            const subtitle = c.last ? c.last.body : (isDM ? "scrie primul mesaj" : "grup nou");
            return (
              <Link key={c.id} to="/app/chat/$id" params={{ id: c.id }}
                className="flex items-center gap-3 p-2.5 rounded-xl bg-foreground/[0.03] border border-foreground/10 active:scale-[0.99] transition">
                <div className="relative h-11 w-11 shrink-0">
                  {isDM && c.others[0]?.avatar_url ? (
                    <img src={c.others[0].avatar_url} alt="" className="h-full w-full rounded-full object-cover" />
                  ) : (
                    <div className="h-full w-full rounded-full bg-gradient-to-br from-neon-crimson to-neon-purple flex items-center justify-center font-display font-black text-white">
                      {isDM ? (title[1] ?? "?").toUpperCase() : <Users size={18} />}
                    </div>
                  )}
                  {c.unread && <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-neon-green border-2 border-background" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <div className={`font-display truncate text-sm ${c.unread ? "font-black" : "font-bold"}`}>{title}</div>
                    <div className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground shrink-0">
                      {timeAgo(c.last?.created_at ?? c.last_message_at)}
                    </div>
                  </div>
                  <div className={`text-xs truncate ${c.unread ? "text-foreground" : "text-muted-foreground"}`}>{subtitle}</div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {showNew && (
        <NewMessageSheet
          onClose={() => setShowNew(false)}
          onOpen={(id) => { setShowNew(false); nav({ to: "/app/chat/$id", params: { id } }); }}
        />
      )}
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
