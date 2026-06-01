import { Link, useLocation } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { MapPin, Camera, User, MessageCircle, Newspaper, Trophy, Flame, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

type Tab = { to: string; icon: typeof MapPin; labelKey: string; primary?: boolean; exact?: boolean; badgeKey?: "inbox" };
const tabs: Tab[] = [
  { to: "/app", icon: Newspaper, labelKey: "live", exact: true },
  { to: "/app/map", icon: MapPin, labelKey: "map" },
  { to: "/app/top", icon: Trophy, labelKey: "top" },
  { to: "/app/scan", icon: Camera, labelKey: "post", primary: true },
  { to: "/app/squad", icon: Flame, labelKey: "sprits" },
  { to: "/app/inbox", icon: MessageCircle, labelKey: "messages", badgeKey: "inbox" },
  { to: "/app/me", icon: User, labelKey: "me" },
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
  const { t: tt } = useTranslation("tabs");
  const { t: tc } = useTranslation("common");
  return (
    <nav className="fixed bottom-0 inset-x-0 z-50 pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto max-w-md px-2 pb-2">
        <div className="rounded-2xl glass border border-foreground/10 backdrop-blur-xl overflow-visible shadow-lg shadow-black/40">
          <div className="grid grid-cols-7 gap-0.5 px-1 pt-2 pb-1.5">
            {tabs.map(t => {
              const active = t.exact ? loc.pathname === t.to : (loc.pathname === t.to || loc.pathname.startsWith(t.to + "/"));
              const Icon = t.icon;
              const badge = t.badgeKey === "inbox" ? unread : 0;
              return (
                <Link key={t.to} to={t.to as any}
                  className="flex flex-col items-center justify-end gap-1 py-1 relative min-w-0">
                  <div className={`relative flex items-center justify-center rounded-xl transition ${
                    t.primary
                      ? "h-11 w-11 -mt-6 bg-gradient-to-br from-neon-crimson to-neon-purple text-white shadow-[0_0_22px_var(--neon-crimson)] ring-4 ring-background"
                      : `h-7 w-7 ${active ? "text-neon-crimson" : "text-muted-foreground"}`
                  }`}>
                    <Icon size={t.primary ? 22 : 18} strokeWidth={2.2} />
                    {badge > 0 && (
                      <span className="absolute -top-1 -right-1.5 min-w-[15px] h-[15px] px-1 rounded-full bg-neon-crimson text-white text-[9px] font-mono font-bold flex items-center justify-center border-2 border-background">
                        {badge > 9 ? "9+" : badge}
                      </span>
                    )}
                  </div>
                  <span className={`text-[9px] font-mono uppercase tracking-wider truncate w-full text-center leading-none ${
                    active && !t.primary ? "text-neon-crimson" : t.primary ? "text-foreground font-bold" : "text-muted-foreground"
                  }`}>{tt(t.labelKey)}</span>
                </Link>
              );
            })}
          </div>
          <div className="border-t border-neon-crimson/20 px-2 py-1.5 flex items-center justify-center gap-1.5">
            <AlertTriangle size={10} className="shrink-0 text-neon-crimson" />
            <span className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
              {tc("alcoholWarning")}
            </span>
          </div>
        </div>
      </div>
    </nav>
  );
}

