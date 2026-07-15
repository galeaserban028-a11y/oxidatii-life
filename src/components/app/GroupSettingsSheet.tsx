import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { X, Check, LogOut, Loader2, Pencil, UserPlus, Search } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "@tanstack/react-router";

type Profile = {
  id: string;
  handle?: string | null;
  display_name?: string | null;
  avatar_url?: string | null;
};

export function GroupSettingsSheet({
  open,
  onClose,
  conversationId,
  title,
  createdBy,
  members,
  profMap,
}: {
  open: boolean;
  onClose: () => void;
  conversationId: string;
  title: string | null;
  createdBy: string | null;
  members: { user_id: string }[];
  profMap: Map<string, Profile>;
}) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const nav = useNavigate();
  const isOwner = !!user && user.id === createdBy;
  const [renameValue, setRenameValue] = useState(title ?? "");
  const [renaming, setRenaming] = useState(false);
  const [adding, setAdding] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [q, setQ] = useState("");
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    if (open) {
      setRenameValue(title ?? "");
      setShowAdd(false);
      setPicked(new Set());
      setQ("");
    }
  }, [open, title]);

  const memberIds = useMemo(() => new Set(members.map((m) => m.user_id)), [members]);

  const { data: friends = [] } = useQuery({
    queryKey: ["friends-for-group-add", user?.id],
    enabled: !!user && open && isOwner,
    queryFn: async () => {
      const { data: friendRows } = await supabase
        .from("friendships")
        .select("requester_id,addressee_id")
        .eq("status", "accepted")
        .or(`requester_id.eq.${user!.id},addressee_id.eq.${user!.id}`);
      const ids = ((friendRows ?? []) as Array<{ requester_id: string; addressee_id: string }>).map(
        (r) => (r.requester_id === user!.id ? r.addressee_id : r.requester_id),
      );
      if (!ids.length) return [];
      const { data: profs } = await supabase
        .from("profiles")
        .select("id,handle,display_name,avatar_url")
        .in("id", ids);
      return profs ?? [];
    },
  });

  const candidates = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return (friends as Profile[])
      .filter((p) => !memberIds.has(p.id))
      .filter(
        (p) =>
          !needle ||
          (p.handle ?? "").toLowerCase().includes(needle) ||
          (p.display_name ?? "").toLowerCase().includes(needle),
      );
  }, [friends, memberIds, q]);

  const rename = async () => {
    if (!isOwner) return;
    const v = renameValue.trim();
    if (!v || v === (title ?? "")) return;
    setRenaming(true);
    const { error } = await supabase
      .from("conversations")
      .update({ title: v })
      .eq("id", conversationId);
    setRenaming(false);
    if (error) {
      toast.error("Nu am putut redenumi");
      return;
    }
    toast.success("Grup redenumit");
    qc.invalidateQueries({ queryKey: ["chat", conversationId] });
    qc.invalidateQueries({ queryKey: ["inbox"] });
  };

  const togglePick = (id: string) =>
    setPicked((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });

  const addMembers = async () => {
    if (!user || picked.size === 0) return;
    setAdding(true);
    const rows = Array.from(picked).map((uid) => ({
      conversation_id: conversationId,
      user_id: uid,
    }));
    const { error } = await supabase.from("conversation_members").insert(rows);
    setAdding(false);
    if (error) {
      toast.error("Nu am putut adăuga");
      return;
    }
    toast.success(`${picked.size} membri adăugați`);
    setPicked(new Set());
    setShowAdd(false);
    qc.invalidateQueries({ queryKey: ["chat", conversationId] });
  };

  const leave = async () => {
    if (!user) return;
    if (!confirm("Sigur vrei să părăsești grupul?")) return;
    setLeaving(true);
    const { error } = await supabase
      .from("conversation_members")
      .delete()
      .eq("conversation_id", conversationId)
      .eq("user_id", user.id);
    setLeaving(false);
    if (error) {
      toast.error("Nu am putut părăsi");
      return;
    }
    toast.success("Ai părăsit grupul");
    qc.invalidateQueries({ queryKey: ["inbox"] });
    onClose();
    nav({ to: "/app/inbox" });
  };

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center bg-black/60">
      <div className="w-full sm:max-w-md bg-background border-t sm:border border-foreground/10 sm:rounded-3xl rounded-t-3xl max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-foreground/10">
          <div className="font-display font-black text-lg">Grup</div>
          <button
            onClick={onClose}
            className="h-9 w-9 rounded-full bg-foreground/10 flex items-center justify-center"
            aria-label="închide"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          <div>
            <label className="text-[10px] uppercase tracking-widest text-muted-foreground font-mono">
              Nume grup
            </label>
            <div className="mt-1.5 flex gap-2">
              <input
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                disabled={!isOwner}
                placeholder="numele grupului"
                className="flex-1 px-3 py-2.5 rounded-xl bg-foreground/5 border border-foreground/15 text-sm disabled:opacity-60"
              />
              {isOwner && (
                <button
                  onClick={rename}
                  disabled={renaming || !renameValue.trim() || renameValue === title}
                  className="px-3 rounded-xl bg-foreground text-background text-xs font-bold uppercase tracking-widest disabled:opacity-40 flex items-center gap-1"
                >
                  {renaming ? <Loader2 size={14} className="animate-spin" /> : <Pencil size={14} />}
                  Salvează
                </button>
              )}
            </div>
            {!isOwner && (
              <div className="mt-1 text-[11px] text-muted-foreground">
                Doar creatorul grupului poate redenumi.
              </div>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between">
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-mono">
                {members.length} membri
              </div>
              {isOwner && !showAdd && (
                <button
                  onClick={() => setShowAdd(true)}
                  className="text-xs font-bold uppercase tracking-widest text-neon-purple flex items-center gap-1"
                >
                  <UserPlus size={14} /> Adaugă
                </button>
              )}
            </div>
            <div className="mt-2 space-y-1.5">
              {members.map((m) => {
                const p = profMap.get(m.user_id);
                const isMe = m.user_id === user?.id;
                const isCreator = m.user_id === createdBy;
                return (
                  <div
                    key={m.user_id}
                    className="flex items-center gap-3 p-2 rounded-2xl bg-foreground/[0.04]"
                  >
                    {p?.avatar_url ? (
                      <img
                        src={p.avatar_url}
                        className="h-10 w-10 rounded-full object-cover"
                        alt=""
                      />
                    ) : (
                      <div className="h-10 w-10 rounded-full bg-gradient-to-br from-neon-purple to-neon-crimson flex items-center justify-center text-white font-display font-black">
                        {(p?.handle ?? p?.display_name ?? "?")[0]?.toUpperCase()}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-sm truncate">
                        {p?.display_name ?? p?.handle ?? "anonim"}{" "}
                        {isMe && <span className="text-muted-foreground">(tu)</span>}
                      </div>
                      <div className="text-[11px] text-muted-foreground truncate">
                        @{p?.handle ?? "anonim"}
                      </div>
                    </div>
                    {isCreator && (
                      <span className="text-[10px] font-mono uppercase tracking-widest text-neon-purple">
                        creator
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {showAdd && isOwner && (
            <div className="space-y-2">
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-mono">
                Adaugă prieteni
              </div>
              <div className="relative">
                <Search
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="caută prieten…"
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-foreground/5 border border-foreground/15 text-sm"
                />
              </div>
              <div className="max-h-60 overflow-y-auto space-y-1">
                {candidates.length === 0 && (
                  <div className="text-xs text-muted-foreground text-center py-4">
                    Niciun prieten disponibil
                  </div>
                )}
                {candidates.map((p) => {
                  const sel = picked.has(p.id);
                  return (
                    <button
                      key={p.id}
                      onClick={() => togglePick(p.id)}
                      className={`w-full flex items-center gap-3 p-2 rounded-2xl border transition ${
                        sel
                          ? "bg-neon-purple/15 border-neon-purple/40"
                          : "bg-foreground/[0.04] border-transparent"
                      }`}
                    >
                      {p.avatar_url ? (
                        <img
                          src={p.avatar_url}
                          className="h-10 w-10 rounded-full object-cover"
                          alt=""
                        />
                      ) : (
                        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-neon-purple to-neon-crimson flex items-center justify-center text-white font-display font-black">
                          {(p.handle ?? "?")[0]?.toUpperCase()}
                        </div>
                      )}
                      <div className="flex-1 min-w-0 text-left">
                        <div className="font-bold text-sm truncate">
                          {p.display_name ?? p.handle}
                        </div>
                        <div className="text-[11px] text-muted-foreground truncate">
                          @{p.handle}
                        </div>
                      </div>
                      {sel && <Check size={16} className="text-neon-purple" />}
                    </button>
                  );
                })}
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => {
                    setShowAdd(false);
                    setPicked(new Set());
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-foreground/10 text-sm font-bold"
                >
                  Anulează
                </button>
                <button
                  onClick={addMembers}
                  disabled={adding || picked.size === 0}
                  className="flex-1 py-2.5 rounded-xl bg-foreground text-background text-sm font-bold disabled:opacity-40 flex items-center justify-center gap-2"
                >
                  {adding && <Loader2 size={14} className="animate-spin" />}
                  Adaugă ({picked.size})
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-foreground/10">
          <button
            onClick={leave}
            disabled={leaving}
            className="w-full py-3 rounded-xl bg-destructive/15 text-destructive text-sm font-bold flex items-center justify-center gap-2"
          >
            {leaving ? <Loader2 size={14} className="animate-spin" /> : <LogOut size={14} />}
            Părăsește grupul
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
