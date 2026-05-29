import { Link, useLocation } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { MapPin, Camera, User, MessageCircle, Newspaper } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

type Tab = { to: string; icon: typeof MapPin; label: string; primary?: boolean; exact?: boolean; badgeKey?: "inbox" };
const tabs: Tab[] = [
  { to: "/app", icon: Newspaper, label: "Live", exact: true },
  { to: "/app/map", icon: MapPin, label: "Hartă" },
  { to: "/app/scan", icon: Camera, label: "Șpriț", primary: true },
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
        <div className="m-2 rounded-2xl glass border border-foreground/10 grid grid-cols-5 backdrop-blur-xl">
          {tabs.map(t => {
            const active = t.exact ? loc.pathname === t.to : (loc.pathname === t.to || loc.pathname.startsWith(t.to + "/"));
            const Icon = t.icon;
            const badge = t.badgeKey === "inbox" ? unread : 0;
            return (
              <Link key={t.to} to={t.to as any}
                className="flex flex-col items-center gap-0.5 py-2.5 relative">
                <div className={`relative flex items-center justify-center rounded-xl transition ${
                  t.primary
                    ? "h-12 w-12 -mt-6 bg-gradient-to-br from-neon-crimson to-neon-purple text-white shadow-[0_0_22px_var(--neon-crimson)] ring-4 ring-background"
                    : `h-7 w-7 ${active ? "text-neon-crimson" : "text-muted-foreground"}`
                }`}>
                  <Icon size={t.primary ? 24 : 18} strokeWidth={2.2} />
                  {badge > 0 && (
                    <span className="absolute -top-1 -right-1.5 min-w-[16px] h-[16px] px-1 rounded-full bg-neon-crimson text-white text-[9px] font-mono font-bold flex items-center justify-center border-2 border-background">
                      {badge > 9 ? "9+" : badge}
                    </span>
                  )}
                </div>
                <span className={`text-[9px] font-mono uppercase tracking-wider ${
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
