import { Link, useLocation } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { MapPin, Camera, User, MessageCircle, Radio, Trophy, Flame, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

type Tab = {
  to: string;
  icon: typeof MapPin;
  label: string;
  exact?: boolean;
  liveDot?: boolean;
  badgeKey?: "inbox";
};

const tabs: Tab[] = [
  { to: "/app", icon: Radio, label: "Live", exact: true, liveDot: true },
  { to: "/app/map", icon: MapPin, label: "Hartă" },
  { to: "/app/top", icon: Trophy, label: "Top" },
  { to: "/app/squad", icon: Flame, label: "Șpriț" },
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

/** Shrinks bar on scroll-down, restores on scroll-up. */
function useScrollShrink() {
  const [shrunk, setShrunk] = useState(false);
  const lastY = useRef(0);
  const ticking = useRef(false);
  useEffect(() => {
    const onScroll = () => {
      if (ticking.current) return;
      ticking.current = true;
      requestAnimationFrame(() => {
        const y = window.scrollY || document.documentElement.scrollTop || 0;
        const dy = y - lastY.current;
        if (y < 40) setShrunk(false);
        else if (dy > 6) setShrunk(true);
        else if (dy < -6) setShrunk(false);
        lastY.current = y;
        ticking.current = false;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    // also watch inner scroll containers (the app uses overflow containers)
    const containers = Array.from(document.querySelectorAll<HTMLElement>("[data-scroll-root], main, .overflow-y-auto, .overflow-auto"));
    containers.forEach((el) => el.addEventListener("scroll", onScroll, { passive: true } as any));
    return () => {
      window.removeEventListener("scroll", onScroll);
      containers.forEach((el) => el.removeEventListener("scroll", onScroll as any));
    };
  }, []);
  return shrunk;
}

export function BottomTabBar() {
  const loc = useLocation();
  const unread = useUnreadCount();
  const { t: tc } = useTranslation("common");
  const shrunk = useScrollShrink();
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

  const isActive = (t: Tab) =>
    t.exact ? loc.pathname === t.to : loc.pathname === t.to || loc.pathname.startsWith(t.to + "/");

  const iconSize = shrunk ? 18 : 22;
  const centerSize = shrunk ? 48 : 58;
  const centerMargin = shrunk ? -14 : -22;

  return (
    <nav
      className="fixed inset-x-0 z-50 flex flex-col items-center pointer-events-none"
      style={{
        bottom: `calc(${shrunk ? 10 : 16}px + env(safe-area-inset-bottom))`,
        transition: "bottom 0.35s cubic-bezier(0.4,0,0.2,1)",
      }}
    >
      {/* Alcohol Warning Pill */}
      {!warnDismissed && !shrunk && (
        <div className="mb-2 flex items-center justify-between rounded-full bg-white/[0.05] border border-white/10 px-3 py-1.5 pointer-events-auto animate-fade-in">
          <div className="flex items-center gap-2">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#ff3d8b] animate-pulse" />
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

      {/* Main Floating Nav */}
      <div
        className="pointer-events-auto flex items-center justify-between"
        style={{
          gap: shrunk ? 6 : 10,
          padding: shrunk ? "6px 14px" : "10px 18px",
          width: "min(96%, 600px)",
          background: "rgba(15, 13, 28, 0.78)",
          backdropFilter: "blur(20px) saturate(140%)",
          WebkitBackdropFilter: "blur(20px) saturate(140%)",
          borderRadius: shrunk ? 22 : 28,
          border: "1px solid rgba(255, 255, 255, 0.08)",
          boxShadow: "0 10px 40px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.1)",
          transition: "all 0.35s cubic-bezier(0.4,0,0.2,1)",
        }}
      >
        {/* Left tabs */}
        {tabs.slice(0, 3).map((t) => {
          const active = isActive(t);
          const Icon = t.icon;
          return (
            <Link
              key={t.to}
              to={t.to as any}
              className="tab-press flex flex-col items-center flex-1 min-w-0"
              style={{
                color: active ? "#ff6b00" : "#8e8c99",
                fontSize: 10,
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.5px",
                transform: active ? "translateY(-2px)" : undefined,
                textShadow: active ? "0 0 10px rgba(255,107,0,0.6)" : undefined,
                transition: "all 0.3s cubic-bezier(0.4,0,0.2,1)",
                padding: "4px 0",
              }}
            >
              <div className="relative">
                <Icon
                  size={iconSize}
                  strokeWidth={active ? 2.4 : 2}
                  style={{
                    filter: active ? "drop-shadow(0 0 8px #ff6b00)" : undefined,
                    transition: "all 0.3s cubic-bezier(0.4,0,0.2,1)",
                  }}
                />
                {t.liveDot && (
                  <>
                    <span
                      className="absolute -top-0.5 -right-0.5 h-[6px] w-[6px] rounded-full"
                      style={{ backgroundColor: "#ff0055" }}
                    />
                    <span
                      className="absolute -top-0.5 -right-0.5 h-[6px] w-[6px] rounded-full"
                      style={{
                        backgroundColor: "#ff0055",
                        animation: "pulse-waves 1.8s infinite ease-in-out",
                      }}
                    />
                  </>
                )}
              </div>
              <span
                className="leading-none overflow-hidden"
                style={{
                  maxHeight: shrunk ? 0 : 14,
                  marginTop: shrunk ? 0 : 3,
                  opacity: shrunk ? 0 : 1,
                  transition: "all 0.3s cubic-bezier(0.4,0,0.2,1)",
                  fontSize: 9,
                }}
              >
                {t.label}
              </span>
            </Link>
          );
        })}

        {/* Center POSTEAZĂ Button */}
        <Link to="/app/scan" className="relative flex flex-col items-center justify-center shrink-0 tab-press-center">
          <div
            className="flex flex-col items-center justify-center"
            style={{
              width: centerSize,
              height: centerSize,
              borderRadius: shrunk ? 16 : 18,
              marginTop: centerMargin,
              background: "linear-gradient(135deg, #ff9f43, #ff5252, #9b51e0)",
              backgroundSize: "200% 200%",
              animation: "gradient-shift 5s ease infinite",
              boxShadow:
                "0 8px 25px rgba(255,82,82,0.4), 0 0 0 4px rgba(15,13,28,0.78)",
              transition: "all 0.35s cubic-bezier(0.175,0.885,0.32,1.275)",
              cursor: "pointer",
            }}
          >
            <Camera size={shrunk ? 18 : 22} strokeWidth={2} className="text-white" />
            {!shrunk && (
              <span
                className="font-bold text-white uppercase"
                style={{ fontSize: 8, marginTop: 1, letterSpacing: "0.04em" }}
              >
                POSTEAZĂ
              </span>
            )}
          </div>
        </Link>

        {/* Right tabs */}
        {tabs.slice(3).map((t) => {
          const active = isActive(t);
          const Icon = t.icon;
          const badge = t.badgeKey === "inbox" ? unread : 0;
          const showDot = badge > 0;
          return (
            <Link
              key={t.to}
              to={t.to as any}
              className="tab-press flex flex-col items-center flex-1 min-w-0"
              style={{
                color: active ? "#ff6b00" : "#8e8c99",
                fontSize: 10,
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.5px",
                transform: active ? "translateY(-2px)" : undefined,
                textShadow: active ? "0 0 10px rgba(255,107,0,0.6)" : undefined,
                transition: "all 0.3s cubic-bezier(0.4,0,0.2,1)",
                padding: "4px 0",
              }}
            >
              <div className="relative">
                <Icon
                  size={iconSize}
                  strokeWidth={active ? 2.4 : 2}
                  style={{
                    filter: active ? "drop-shadow(0 0 8px #ff6b00)" : undefined,
                    transition: "all 0.3s cubic-bezier(0.4,0,0.2,1)",
                  }}
                />
                {showDot && (
                  <span
                    className="absolute -top-1.5 -right-2 flex items-center justify-center rounded-full text-[7px] font-bold text-white"
                    style={{
                      minWidth: 14,
                      height: 14,
                      padding: "0 3px",
                      backgroundColor: "#ff0055",
                      boxShadow: "0 0 0 2px rgba(15,13,28,0.75)",
                    }}
                  >
                    {badge > 9 ? "9+" : badge}
                  </span>
                )}
              </div>
              <span
                className="leading-none overflow-hidden"
                style={{
                  maxHeight: shrunk ? 0 : 14,
                  marginTop: shrunk ? 0 : 3,
                  opacity: shrunk ? 0 : 1,
                  transition: "all 0.3s cubic-bezier(0.4,0,0.2,1)",
                  fontSize: 9,
                }}
              >
                {t.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
