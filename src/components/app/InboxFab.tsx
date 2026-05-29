import { Link, useLocation } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { MessageCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export function InboxFab() {
  const { user } = useAuth();
  const loc = useLocation();
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    const refresh = async () => {
      const { data: mems } = await supabase
        .from("conversation_members")
        .select("conversation_id,last_read_at")
        .eq("user_id", user.id);
      if (!mems || mems.length === 0) { if (!cancelled) setUnread(0); return; }
      let count = 0;
      for (const m of mems) {
        const { count: n } = await supabase
          .from("messages")
          .select("id", { head: true, count: "exact" })
          .eq("conversation_id", m.conversation_id)
          .gt("created_at", m.last_read_at)
          .neq("sender_id", user.id);
        count += n ?? 0;
      }
      if (!cancelled) setUnread(count);
    };
    refresh();

    const ch = supabase
      .channel("inbox-badge")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, refresh)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "conversation_members" }, refresh)
      .subscribe();
    return () => { cancelled = true; supabase.removeChannel(ch); };
  }, [user]);

  if (!user || loc.pathname.startsWith("/app/chat") || loc.pathname.startsWith("/app/inbox")) return null;

  return (
    <Link
      to="/app/inbox"
      className="fixed z-40 right-3 top-3 h-11 w-11 rounded-full bg-background/85 backdrop-blur border border-neon-green/40 flex items-center justify-center shadow-[0_0_20px_-4px_var(--neon-green)] active:scale-95 transition"
    >
      <MessageCircle className="text-neon-green" size={20} strokeWidth={2.4} />
      {unread > 0 && (
        <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-neon-crimson text-white text-[10px] font-mono font-bold flex items-center justify-center border-2 border-background">
          {unread > 9 ? "9+" : unread}
        </span>
      )}
    </Link>
  );
}
