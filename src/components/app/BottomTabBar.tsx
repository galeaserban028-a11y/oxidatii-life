import { Link, useLocation } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { MapPin, Camera, User, MessageCircle, Newspaper, Trophy, Flame, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

type Tab = { to: string; icon: typeof MapPin; label: string; primary?: boolean; exact?: boolean; badgeKey?: "inbox" };
const tabs: Tab[] = [
  { to: "/app", icon: Newspaper, label: "Live", exact: true },
  { to: "/app/map", icon: MapPin, label: "Hartă" },
  { to: "/app/top", icon: Trophy, label: "Top" },
  { to: "/app/scan", icon: Camera, label: "Postează", primary: true },
  { to: "/app/squad", icon: Flame, label: "Șprițuri" },
  { to: "/app/inbox", icon: MessageCircle, label: "Mesaje", badgeKey: "inbox" },
  { to: "/app/me", icon: User, label: "Eu" },
];

function useUnreadCount() {
  const { user } = useAuth();
  const [unread, setUnread] = useState(0);
  useEffect(() => {
    if (!user) { setUnread(0); return; }
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
      .channel("bottombar-inbox")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, refresh)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "conversation_members" }, refresh)
      .subscribe();
    return () => { cancelled = true; supabase.removeChannel(ch); };
  }, [user]);
  return unread;
}

export function BottomTabBar() {
  const loc = useLocation();
  const unread = useUnreadCount();
  return (
    <nav className="fixed bottom-0 inset-x-0 z-50 pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto max-w-md">
        <div className="m-1 rounded-xl glass border border-foreground/10 grid grid-cols-7 backdrop-blur-xl px-0.5">
          {tabs.map(t => {
            const active = t.exact ? loc.pathname === t.to : (loc.pathname === t.to || loc.pathname.startsWith(t.to + "/"));
            const Icon = t.icon;
            const badge = t.badgeKey === "inbox" ? unread : 0;
            return (
              <Link key={t.to} to={t.to as any}
                className="flex flex-col items-center gap-0 py-1 relative min-w-0">
                <div className={`relative flex items-center justify-center rounded-lg transition ${
                  t.primary
                    ? "h-9 w-9 -mt-4 bg-gradient-to-br from-neon-crimson to-neon-purple text-white shadow-[0_0_18px_var(--neon-crimson)] ring-[3px] ring-background"
                    : `h-5 w-5 ${active ? "text-neon-crimson" : "text-muted-foreground"}`
                }`}>
                  <Icon size={t.primary ? 19 : 14} strokeWidth={2.2} />
                  {badge > 0 && (
                    <span className="absolute -top-0.5 -right-1 min-w-[13px] h-[13px] px-0.5 rounded-full bg-neon-crimson text-white text-[7px] font-mono font-bold flex items-center justify-center border-2 border-background">
                      {badge > 9 ? "9+" : badge}
                    </span>
                  )}
                </div>
                <span className={`text-[7px] font-mono uppercase tracking-wider truncate w-full text-center leading-none mt-0.5 ${
                  active && !t.primary ? "text-neon-crimson" : t.primary ? "text-foreground font-bold" : "text-muted-foreground"
                }`}>{t.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
