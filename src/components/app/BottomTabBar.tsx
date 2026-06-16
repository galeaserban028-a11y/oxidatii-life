import { Link, useLocation } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { MapPin, Camera, User, MessageCircle, Radio, Trophy, Flame, AlertTriangle, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

type Tab = { to: string; icon: typeof MapPin; labelKey: string; primary?: boolean; exact?: boolean; badgeKey?: "inbox" };
const tabs: Tab[] = [
  { to: "/app", icon: Radio, labelKey: "live", exact: true },
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
  const [warnDismissed, setWarnDismissed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.sessionStorage.getItem("oxi-alc-warn") === "1";
  });
  const dismissWarn = () => {
    setWarnDismissed(true);
    try { window.sessionStorage.setItem("oxi-alc-warn", "1"); } catch {}
  };

  if (loc.pathname.startsWith("/app/biz") || loc.pathname.startsWith("/app/admin")) {
    return null;
  }

  const leftTabs = tabs.slice(0, 3);
  const primaryTab = tabs[3];
  const rightTabs = tabs.slice(4);

  return (
    <nav className="fixed bottom-0 inset-x-0 z-50 pb-[env(safe-area-inset-bottom)] pointer-events-none">
      <div className="mx-auto max-w-md px-3 pb-3 space-y-2 pointer-events-auto">
        {/* Alcohol Warning Pill — minimal, slim, sunset accent dot */}
        {!warnDismissed && (
          <div className="flex items-center justify-between rounded-full bg-white/[0.05] border border-white/10 px-3 py-1.5">
            <div className="flex items-center gap-2">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#ff6b35] animate-pulse" />
              <span className="text-[9px] font-semibold tracking-[0.2em] text-white/60 uppercase leading-none">
                {tc("alcoholWarning")}
              </span>
            </div>
            <button
              onClick={dismissWarn}
              aria-label="închide"
              className="text-white/40 hover:text-white transition-colors"
            >
              <X size={12} />
            </button>
          </div>
        )}

        {/* Main Navigation Bar — sunset glass floating */}
        <div className="relative bg-[#0d0d0d]/40 backdrop-blur-xl border border-white/10 rounded-[32px] p-2 flex items-center justify-between shadow-2xl shadow-orange-500/10">
          {/* Left Group — 3 tabs */}
          <div className="flex flex-1 justify-around items-center">
            {leftTabs.map(t => {
              const active = t.exact ? loc.pathname === t.to : (loc.pathname === t.to || loc.pathname.startsWith(t.to + "/"));
              const Icon = t.icon;
              return (
                <Link
                  key={t.to}
                  to={t.to as any}
                  className="flex flex-col items-center gap-1 min-w-0"
                  aria-label={tt(t.labelKey)}
                >
                  <div className="relative">
                    <Icon size={18} strokeWidth={2} className={active ? "text-[#ff6b35]" : "text-white/40"} />
                    {t.labelKey === "live" && (
                      <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-[#ff6b35] ring-2 ring-[#0d0d0d] animate-pulse" />
                    )}
                  </div>
                  <span className={`text-[8px] font-semibold tracking-tighter uppercase leading-none ${active ? "text-[#ff6b35] font-bold" : "text-white/40 font-medium"}`}>
                    {tt(t.labelKey)}
                  </span>
                </Link>
              );
            })}
          </div>

          {/* Center Primary: Postează */}
          <div className="relative px-1">
            <div
              className="absolute inset-0 bg-gradient-to-tr from-[#ff6b35] via-[#f7931e] to-[#e84393] rounded-2xl blur-lg opacity-40"
            />
            <Link
              to={primaryTab.to as any}
              className="relative -top-6 flex flex-col items-center"
              aria-label={tt(primaryTab.labelKey)}
            >
              <div className="w-14 h-14 bg-gradient-to-tr from-[#ff6b35] via-[#f7931e] to-[#e84393] rounded-2xl flex items-center justify-center shadow-xl shadow-orange-600/20 active:scale-95 transition-transform">
                <Camera size={22} strokeWidth={2.2} className="text-white drop-shadow" />
              </div>
              <span className="mt-2 text-[9px] font-black tracking-tight uppercase bg-clip-text text-transparent bg-gradient-to-r from-[#ff6b35] to-[#f7931e]">
                {tt(primaryTab.labelKey)}
              </span>
            </Link>
          </div>

          {/* Right Group — 3 tabs */}
          <div className="flex flex-1 justify-around items-center">
            {rightTabs.map(t => {
              const active = t.exact ? loc.pathname === t.to : (loc.pathname === t.to || loc.pathname.startsWith(t.to + "/"));
              const Icon = t.icon;
              const badge = t.badgeKey === "inbox" ? unread : 0;
              const showDot = badge > 0;
              return (
                <Link
                  key={t.to}
                  to={t.to as any}
                  className="flex flex-col items-center gap-1 min-w-0"
                  aria-label={tt(t.labelKey)}
                >
                  <div className="relative">
                    <Icon size={18} strokeWidth={2} className={active ? "text-[#ff6b35]" : "text-white/40"} />
                    {showDot && (
                      <span className="absolute -top-1 -right-1 min-w-[12px] h-3 px-0.5 rounded-full bg-[#e84393] ring-2 ring-[#0d0d0d] text-[7px] font-bold text-white flex items-center justify-center">
                        {badge > 9 ? "9+" : badge}
                      </span>
                    )}
                  </div>
                  <span className={`text-[8px] font-semibold tracking-tighter uppercase leading-none ${active ? "text-[#ff6b35] font-bold" : "text-white/40 font-medium"}`}>
                    {tt(t.labelKey)}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
}