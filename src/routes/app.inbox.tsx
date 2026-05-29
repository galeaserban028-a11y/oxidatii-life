import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { openOrCreateDM } from "@/lib/chat";
import { ArrowLeft, Plus, Users, Loader2 } from "lucide-react";

export const Route = createFileRoute("/app/inbox")({
  head: () => ({ meta: [{ title: "Mesaje · OXIDAȚII" }] }),
  component: InboxPage,
});

type ConvRow = {
  id: string; kind: string; title: string | null; last_message_at: string;
};

function InboxPage() {
  const { user } = useAuth();
  const nav = useNavigate();
  const qc = useQueryClient();
  const [showNew, setShowNew] = useState(false);

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

      // attach last message + other members
      const ids = convs.map((c: any) => c.id);
      if (!ids.length) return [];
      const [{ data: lastMsgs }, { data: allMems }, { data: profiles }] = await Promise.all([
        supabase.from("messages").select("conversation_id,body,sender_id,created_at").in("conversation_id", ids).order("created_at", { ascending: false }),
        supabase.from("conversation_members").select("conversation_id,user_id").in("conversation_id", ids),
        Promise.resolve({ data: [] as any[] }),
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

  return (
    <div className="px-4 pt-6 pb-4 space-y-4">
      <div className="flex items-center justify-between">
        <Link to="/app" className="inline-flex items-center gap-1 text-xs font-mono uppercase tracking-widest text-muted-foreground">
          <ArrowLeft size={14} /> înapoi
        </Link>
        <button onClick={() => setShowNew(true)} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-neon-green/15 border border-neon-green/40 text-neon-green font-mono text-[10px] uppercase tracking-widest">
          <Plus size={12} /> grup
        </button>
      </div>
      <header>
        <h1 className="font-display font-black text-3xl tracking-tight">mesaje.</h1>
        <p className="text-xs text-muted-foreground font-mono uppercase tracking-widest mt-0.5">vorbește cu haita</p>
      </header>

      {isLoading ? (
        <div className="py-8 text-center font-mono text-xs text-muted-foreground">se încarcă...</div>
      ) : conversations.length === 0 ? (
        <div className="py-12 text-center space-y-2">
          <div className="font-display text-2xl">📭</div>
          <div className="font-mono text-xs uppercase tracking-widest text-muted-foreground">zero conversații</div>
          <div className="text-xs text-foreground/70">deschide profilul unui prieten și apasă „mesaj"</div>
        </div>
      ) : (
        <div className="space-y-1.5">
          {conversations.map((c: any) => {
            const title = c.kind === "dm"
              ? (c.others[0]?.handle ? `@${c.others[0].handle}` : c.others[0]?.display_name ?? "Necunoscut")
              : c.title ?? `Grup (${c.others.length + 1})`;
            const subtitle = c.last ? c.last.body : (c.kind === "dm" ? "trimite primul mesaj" : "grup nou");
            return (
              <Link key={c.id} to="/app/chat/$id" params={{ id: c.id }}
                className="flex items-center gap-3 p-3 rounded-xl bg-foreground/5 border border-foreground/10 active:scale-[0.99] transition">
                <div className="relative h-12 w-12 shrink-0">
                  {c.kind === "dm" && c.others[0]?.avatar_url ? (
                    <img src={c.others[0].avatar_url} alt="" className="h-full w-full rounded-full object-cover" />
                  ) : (
                    <div className="h-full w-full rounded-full bg-gradient-to-br from-neon-crimson to-neon-purple flex items-center justify-center font-display font-black text-white">
                      {c.kind === "dm" ? (title[1] ?? "?").toUpperCase() : <Users size={20} />}
                    </div>
                  )}
                  {c.unread && <span className="absolute -top-0.5 -right-0.5 h-3 w-3 rounded-full bg-neon-green border-2 border-background" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <div className={`font-display truncate ${c.unread ? "font-black" : "font-bold"}`}>{title}</div>
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

      {showNew && <NewGroupSheet onClose={() => setShowNew(false)} onCreated={(id) => { setShowNew(false); nav({ to: "/app/chat/$id", params: { id } }); }} />}
    </div>
  );
}

function timeAgo(iso?: string) {
  if (!iso) return "";
  const d = new Date(iso); const s = Math.floor((Date.now() - d.getTime()) / 1000);
  if (s < 60) return "acum"; if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`; return `${Math.floor(s / 86400)}z`;
}

function NewGroupSheet({ onClose, onCreated }: { onClose: () => void; onCreated: (id: string) => void }) {
  const { user } = useAuth();
  const [title, setTitle] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  const { data: friends = [] } = useQuery({
    queryKey: ["friends-for-group", user?.id],
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

  const toggle = (id: string) => setSelected(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const create = async () => {
    if (!user || selected.size < 1) return;
    setSaving(true);
    const { createGroupChat } = await import("@/lib/chat");
    const finalTitle = title.trim() || `Haita · ${new Date().toLocaleDateString("ro-RO")}`;
    try {
      const id = await createGroupChat(user.id, finalTitle, Array.from(selected));
      onCreated(id);
    } catch (e: any) {
      alert(e.message ?? "Eroare"); setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-background/95 backdrop-blur-md flex flex-col">
      <div className="flex items-center justify-between p-4 border-b border-foreground/10">
        <div>
          <div className="font-display font-black text-xl">grup nou</div>
          <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">cheamă haita în chat</div>
        </div>
        <button onClick={onClose} className="h-10 w-10 rounded-full bg-foreground/10 flex items-center justify-center">✕</button>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        <input value={title} onChange={e => setTitle(e.target.value)} placeholder="nume grup (opțional)"
          className="w-full px-3 py-3 rounded-xl bg-foreground/5 border border-foreground/15 font-display" />
        <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">// alege oxidați ({selected.size})</div>
        {friends.length === 0 ? (
          <div className="text-xs text-muted-foreground">zero prieteni. adaugă haita mai întâi.</div>
        ) : friends.map((f: any) => (
          <button key={f.id} onClick={() => toggle(f.id)}
            className={`w-full flex items-center gap-3 p-3 rounded-xl border transition ${
              selected.has(f.id) ? "bg-neon-green/10 border-neon-green/50" : "bg-foreground/5 border-foreground/10"
            }`}>
            <div className="h-10 w-10 rounded-full overflow-hidden bg-gradient-to-br from-neon-crimson to-neon-purple flex items-center justify-center font-display text-sm text-white shrink-0">
              {f.avatar_url ? <img src={f.avatar_url} alt="" className="h-full w-full object-cover" /> : (f.handle ?? "?")[0]?.toUpperCase()}
            </div>
            <div className="flex-1 text-left">
              <div className="font-display font-bold text-sm">@{f.handle ?? f.display_name}</div>
            </div>
            <div className={`h-5 w-5 rounded-full border-2 ${selected.has(f.id) ? "bg-neon-green border-neon-green" : "border-foreground/30"}`} />
          </button>
        ))}
      </div>
      <div className="p-4 border-t border-foreground/10">
        <button onClick={create} disabled={saving || selected.size < 1}
          className="w-full py-3 rounded-xl bg-neon-green text-background font-display font-black uppercase disabled:opacity-40 flex items-center justify-center gap-2">
          {saving && <Loader2 className="animate-spin" size={16} />}
          creează grup
        </button>
      </div>
    </div>
  );
}

// Re-export DM helper
export { openOrCreateDM };
