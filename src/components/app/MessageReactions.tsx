import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Smile } from "lucide-react";

type ReactionRow = {
  id: string;
  message_id: string;
  user_id: string;
  emoji: string;
};

const QUICK = ["❤️", "😂", "🔥", "🥂", "😮", "👏"];

export function MessageReactions({
  messageId,
  align = "left",
}: {
  messageId: string;
  align?: "left" | "right";
}) {
  const { user } = useAuth();
  const [rows, setRows] = useState<ReactionRow[]>([]);
  const [picker, setPicker] = useState(false);

  // Initial load
  useEffect(() => {
    let active = true;
    supabase
      .from("message_reactions")
      .select("id,message_id,user_id,emoji")
      .eq("message_id", messageId)
      .then(({ data }) => {
        if (active && data) setRows(data as ReactionRow[]);
      });
    return () => {
      active = false;
    };
  }, [messageId]);

  // Realtime
  useEffect(() => {
    const ch = supabase
      .channel(`mr-${messageId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "message_reactions", filter: `message_id=eq.${messageId}` },
        (p) => setRows((r) => [...r, p.new as ReactionRow]),
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "message_reactions", filter: `message_id=eq.${messageId}` },
        (p) => setRows((r) => r.filter((x) => x.id !== (p.old as ReactionRow).id)),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [messageId]);

  const grouped = useMemo(() => {
    const m = new Map<string, { emoji: string; count: number; mine: boolean }>();
    for (const r of rows) {
      const cur = m.get(r.emoji) ?? { emoji: r.emoji, count: 0, mine: false };
      cur.count += 1;
      if (r.user_id === user?.id) cur.mine = true;
      m.set(r.emoji, cur);
    }
    return Array.from(m.values()).sort((a, b) => b.count - a.count);
  }, [rows, user?.id]);

  async function toggle(emoji: string) {
    if (!user) return;
    setPicker(false);
    const mine = rows.find((r) => r.user_id === user.id && r.emoji === emoji);
    if (mine) {
      setRows((r) => r.filter((x) => x.id !== mine.id));
      await supabase.from("message_reactions").delete().eq("id", mine.id);
    } else {
      // optimistic
      const tempId = `tmp-${Math.random()}`;
      setRows((r) => [...r, { id: tempId, message_id: messageId, user_id: user.id, emoji }]);
      const { data, error } = await supabase
        .from("message_reactions")
        .insert({ message_id: messageId, user_id: user.id, emoji })
        .select("id,message_id,user_id,emoji")
        .single();
      if (error) {
        setRows((r) => r.filter((x) => x.id !== tempId));
      } else if (data) {
        setRows((r) => r.map((x) => (x.id === tempId ? (data as ReactionRow) : x)));
      }
    }
  }

  const hasAny = grouped.length > 0;
  if (!hasAny && !picker) {
    return (
      <button
        type="button"
        onClick={() => setPicker(true)}
        aria-label="Adaugă reacție"
        className={`opacity-0 group-hover:opacity-100 transition-opacity text-foreground/40 hover:text-foreground/80 ${align === "right" ? "self-end" : "self-start"}`}
      >
        <Smile className="h-3.5 w-3.5" />
      </button>
    );
  }

  return (
    <div
      className={`flex flex-wrap gap-1 mt-0.5 ${align === "right" ? "justify-end" : "justify-start"}`}
    >
      {grouped.map((g) => (
        <button
          key={g.emoji}
          type="button"
          onClick={() => toggle(g.emoji)}
          className={`h-6 px-1.5 rounded-full text-[11px] flex items-center gap-1 border transition-all ${
            g.mine
              ? "bg-neon-purple/25 border-neon-purple/50 text-white"
              : "bg-foreground/[0.08] border-foreground/10 text-foreground/80 hover:bg-foreground/[0.12]"
          }`}
        >
          <span className="text-sm leading-none">{g.emoji}</span>
          <span className="font-mono">{g.count}</span>
        </button>
      ))}
      <button
        type="button"
        onClick={() => setPicker((v) => !v)}
        aria-label="Adaugă reacție"
        className="h-6 w-6 rounded-full bg-foreground/[0.06] border border-foreground/10 flex items-center justify-center text-foreground/60 hover:bg-foreground/[0.12]"
      >
        <Smile className="h-3 w-3" />
      </button>
      {picker && (
        <div
          className="absolute z-20 mt-7 flex gap-0.5 px-1.5 py-1 rounded-full bg-background/95 backdrop-blur-xl border border-foreground/10 shadow-2xl animate-fade-in"
          onMouseLeave={() => setPicker(false)}
        >
          {QUICK.map((e) => (
            <button
              key={e}
              type="button"
              onClick={() => toggle(e)}
              className="text-xl h-8 w-8 rounded-full flex items-center justify-center hover:bg-foreground/10 active:scale-90 transition"
            >
              {e}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
