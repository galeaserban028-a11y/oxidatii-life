import { Link, useLocation } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { MapPin, Camera, User, MessageCircle, Radio, Trophy, Flame, AlertTriangle, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

type Tab = { to: string; icon: typeof MapPin; labelKey: string; primary?: boolean; exact?: boolean; badgeKey?: "inbox" };
const tabs: Tab[] = [
  { to: "/app/map", icon: MapPin, labelKey: "map" },
  { to: "/app/top", icon: Trophy, labelKey: "top" },
  { to: "/app/scan", icon: Camera, labelKey: "post", primary: true },
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

  return (
    <nav className="fixed bottom-0 inset-x-0 z-50 pb-[env(safe-area-inset-bottom)] pointer-events-none">
      <div className="mx-auto max-w-md px-3 pb-3 space-y-2 pointer-events-auto">
        {/* Main pill — glass bar with circular wells */}
        <div className="relative rounded-[28px] border border-foreground/10 bg-background/40 backdrop-blur-2xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.7),inset_0_1px_0_rgba(255,255,255,0.05)] pt-5 pb-2 px-2">
          {/* subtle inner radial glow under POSTEAZĂ */}
          <div className="pointer-events-none absolute inset-0 rounded-[28px] overflow-hidden">
            <div className="absolute left-1/2 -translate-x-1/2 -top-6 h-24 w-24 rounded-full bg-neon-crimson/20 blur-2xl" />
          </div>

          <div className="relative grid grid-cols-7 gap-0.5">
            {tabs.map(t => {
              const active = t.exact ? loc.pathname === t.to : (loc.pathname === t.to || loc.pathname.startsWith(t.to + "/"));
              const Icon = t.icon;
              const badge = t.badgeKey === "inbox" ? unread : 0;
              const showDot = badge > 0;

              if (t.primary) {
                return (
                  <Link
                    key={t.to}
                    to={t.to as any}
                    className="flex flex-col items-center justify-end gap-1.5 min-w-0"
                    aria-label={tt(t.labelKey)}
                  >
                    <div className="relative -mt-8 h-[58px] w-[58px] rounded-full grid place-items-center
                                    bg-gradient-to-br from-[#ff8a3d] via-neon-crimson to-[#b8124a]
                                    ring-[3px] ring-background/80
                                    shadow-[0_0_30px_var(--neon-crimson),0_8px_24px_rgba(255,49,88,0.55)]
                                    active:scale-95 transition">
                      <span className="absolute inset-0 rounded-full ring-1 ring-white/30" />
                      <Camera size={26} strokeWidth={2.2} className="text-white drop-shadow" />
                    </div>
                    <span className="font-display font-black text-[10px] uppercase tracking-[0.14em] text-white leading-none">
                      {tt(t.labelKey)}
                    </span>
                  </Link>
                );
              }

              const tint = active ? "text-neon-crimson" : "text-muted-foreground";
              return (
                <Link
                  key={t.to}
                  to={t.to as any}
                  className="flex flex-col items-center justify-end gap-1.5 min-w-0"
                  aria-label={tt(t.labelKey)}
                >
                  <div className={`relative h-10 w-10 rounded-full grid place-items-center
                                   border border-foreground/10 bg-foreground/[0.04]
                                   ${active ? "shadow-[0_0_14px_-2px_var(--neon-crimson),inset_0_0_0_1px_rgba(255,49,88,0.35)]" : ""}
                                   transition active:scale-95`}>
                    <Icon size={17} strokeWidth={2} className={tint} />
                    {showDot && (
                      <span className="absolute -top-0.5 -right-0.5 min-w-[14px] h-[14px] px-1 rounded-full bg-neon-crimson text-white text-[8px] font-mono font-bold flex items-center justify-center border-2 border-background">
                        {badge > 9 ? "9+" : badge}
                      </span>
                    )}
                    {/* tiny live dot for /app (LIVE tab) */}
                    {t.labelKey === "live" && !showDot && (
                      <span className="absolute top-0.5 right-0.5 h-1.5 w-1.5 rounded-full bg-[#ff8a3d] shadow-[0_0_6px_#ff8a3d]" />
                    )}
                  </div>
                  <span className={`font-mono text-[9px] uppercase tracking-[0.08em] truncate w-full text-center leading-none ${tint}`}>
                    {tt(t.labelKey)}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Alcohol warning — slim glass pill, dismissible */}
        {!warnDismissed && (
          <div className="flex items-center gap-2 rounded-full border border-[#ff8a3d]/30 bg-background/40 backdrop-blur-xl px-3 py-1.5 shadow-[0_6px_20px_-8px_rgba(255,138,61,0.4)]">
            <AlertTriangle size={11} className="shrink-0 text-[#ff8a3d]" />
            <span className="flex-1 font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground truncate">
              {tc("alcoholWarning")}
            </span>
            <button
              onClick={dismissWarn}
              aria-label="închide"
              className="shrink-0 h-5 w-5 grid place-items-center rounded-full text-muted-foreground hover:text-foreground transition"
            >
              <X size={12} />
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}
