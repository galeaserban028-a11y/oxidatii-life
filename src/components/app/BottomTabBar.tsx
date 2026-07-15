import { Link, useLocation } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState, memo } from "react";
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

// Tween-ed transitions: only the cheap, GPU-accelerated props.
const FAST_TR = "transform 0.18s cubic-bezier(0.4,0,0.2,1), color 0.18s, opacity 0.18s";
const SHRINK_TR = "max-height 0.18s ease, margin-top 0.18s ease, opacity 0.14s ease";

function useUnreadCount() {
  const { user } = useAuth();
  const [unread, setUnread] = useState(0);
  useEffect(() => {
    if (!user) {
      setUnread(0);
      return;
    }
    let cancelled = false;
    let scheduled = false;
    let convIds: string[] = [];

    const compute = async () => {
      scheduled = false;
      const { data: mems } = await supabase
        .from("conversation_members")
        .select("conversation_id,last_read_at")
        .eq("user_id", user.id);
      if (cancelled) return;
      if (!mems || mems.length === 0) {
        setUnread(0);
        convIds = [];
        return;
      }
      convIds = mems.map((m) => m.conversation_id);
      // One round-trip instead of N: pull recent unread messages and count client-side.
      const oldest = mems.reduce(
        (min, m) => (m.last_read_at && m.last_read_at < min ? m.last_read_at : min),
        new Date().toISOString(),
      );
      const { data: msgs } = await supabase
        .from("messages")
        .select("conversation_id,sender_id,created_at")
        .in("conversation_id", convIds)
        .gt("created_at", oldest)
        .neq("sender_id", user.id)
        .limit(200);
      if (cancelled) return;
      const lastReadMap = new Map(mems.map((m) => [m.conversation_id, m.last_read_at]));
      const count = (msgs ?? []).reduce((n, msg) => {
        const lr = lastReadMap.get(msg.conversation_id);
        return n + (!lr || msg.created_at > lr ? 1 : 0);
      }, 0);
      setUnread(count);
    };

    // Trailing debounce so a burst of realtime events triggers one query, not N.
    const refresh = () => {
      if (scheduled) return;
      scheduled = true;
      setTimeout(compute, 250);
    };

    compute();

    const channelName = `bottombar-inbox:${user.id}:${Date.now()}:${Math.random().toString(36).slice(2)}`;
    const ch = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload) => {
          const cid = (payload.new as { conversation_id?: string } | null)?.conversation_id;
          // Only react to messages in conversations we are part of.
          if (cid && convIds.includes(cid)) refresh();
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "conversation_members" },
        refresh,
      )
      .subscribe();
    return () => {
      cancelled = true;
      supabase.removeChannel(ch);
    };
  }, [user]);
  return unread;
}

/** Shrinks bar on scroll-down, restores on scroll-up. Window-scroll only (cheap). */
function useScrollShrink() {
  const [shrunk, setShrunk] = useState(false);
  useEffect(() => {
    let lastY = 0;
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const y = window.scrollY || 0;
        const dy = y - lastY;
        if (y < 40) setShrunk(false);
        else if (dy > 8) setShrunk(true);
        else if (dy < -8) setShrunk(false);
        lastY = y;
        ticking = false;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return shrunk;
}

type TabItemProps = {
  tab: Tab;
  active: boolean;
  shrunk: boolean;
  iconSize: number;
  badge?: number;
};

const TabItem = memo(function TabItem({ tab, active, shrunk, iconSize, badge = 0 }: TabItemProps) {
  const Icon = tab.icon;
  const showDot = badge > 0;
  return (
    <Link
      to={tab.to as any}
      className="tab-press flex flex-col items-center justify-center flex-1 min-w-0"
      style={{
        color: active ? "#ff3d8b" : "#8e8c99",
        fontSize: 10,
        fontWeight: 600,
        textTransform: "uppercase",
        letterSpacing: "0.5px",
        transform: active ? "translateY(-2px)" : "translateY(0)",
        textShadow: active ? "0 0 10px rgba(255,107,0,0.6)" : undefined,
        transition: FAST_TR,
        padding: "4px 2px",
        minHeight: 44,
        // No horizontal minWidth — 6 tabs + center button would overflow on phones <420px.
        // Vertical 44px already meets touch-target guidance; horizontal flex distributes evenly.
      }}
    >
      <div className="relative">
        <Icon
          size={iconSize}
          strokeWidth={active ? 2.4 : 2}
          style={{
            filter: active ? "drop-shadow(0 0 8px #ff3d8b)" : undefined,
            transition: "color 0.25s",
          }}
        />
        {tab.liveDot && (
          <>
            <span
              className="absolute -top-0.5 -right-0.5 h-[6px] w-[6px] rounded-full"
              style={{ backgroundColor: "#ff3d8b" }}
            />
            <span
              className="absolute -top-0.5 -right-0.5 h-[6px] w-[6px] rounded-full"
              style={{
                backgroundColor: "#ff3d8b",
                animation: "pulse-waves 1.8s infinite ease-in-out",
              }}
            />
          </>
        )}
        {showDot && (
          <span
            className="absolute -top-1.5 -right-2 flex items-center justify-center rounded-full text-[7px] font-bold text-white"
            style={{
              minWidth: 14,
              height: 14,
              padding: "0 3px",
              backgroundColor: "#ff3d8b",
              boxShadow: "0 0 0 2px rgba(15,13,28,0.75)",
            }}
          >
            {badge > 9 ? "9+" : badge}
          </span>
        )}
      </div>
      <span
        className="leading-none overflow-hidden truncate max-w-full"
        style={{
          maxHeight: shrunk ? 0 : 14,
          marginTop: shrunk ? 0 : 3,
          opacity: shrunk ? 0 : 1,
          transition: SHRINK_TR,
          fontSize: 9,
        }}
      >
        {tab.label}
      </span>
    </Link>
  );
});

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
    try {
      window.sessionStorage.setItem("oxi-alc-warn", "1");
    } catch { /* noop */ }
  };

  const hidden = loc.pathname.startsWith("/app/biz") || loc.pathname.startsWith("/app/admin");

  const activeMap = useMemo(() => {
    const m: Record<string, boolean> = {};
    for (const t of tabs) {
      m[t.to] = t.exact
        ? loc.pathname === t.to
        : loc.pathname === t.to || loc.pathname.startsWith(t.to + "/");
    }
    return m;
  }, [loc.pathname]);

  if (hidden) return null;

  const iconSize = shrunk ? 18 : 22;
  const centerSize = shrunk ? 48 : 58;
  const centerMargin = shrunk ? -14 : -22;

  return (
    <nav
      className="fixed inset-x-0 z-50 flex flex-col items-center pointer-events-none"
      style={{
        bottom: `calc(${shrunk ? 10 : 16}px + env(safe-area-inset-bottom))`,
        transition: "bottom 0.3s cubic-bezier(0.4,0,0.2,1)",
        contain: "layout",
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
          gap: shrunk ? 2 : 4,
          padding: shrunk ? "6px 10px" : "8px 12px",
          width: "min(98%, 600px)",
          background: "rgba(15, 13, 28, 0.96)",
          backdropFilter: "none",
          WebkitBackdropFilter: "none",
          borderRadius: shrunk ? 22 : 28,
          border: "1px solid rgba(255, 255, 255, 0.08)",
          boxShadow: "0 10px 40px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.1)",
          transition: "padding 0.2s, border-radius 0.2s",
          transform: "translateZ(0)",
          overflow: "visible",
        }}
      >
        {tabs.slice(0, 3).map((t) => (
          <TabItem
            key={t.to}
            tab={t}
            active={activeMap[t.to]}
            shrunk={shrunk}
            iconSize={iconSize}
          />
        ))}

        {/* Center POSTEAZĂ Button */}
        <Link
          to="/app/scan"
          className="relative flex flex-col items-center justify-center shrink-0 tab-press-center"
        >
          <div
            className="flex flex-col items-center justify-center"
            style={{
              width: centerSize,
              height: centerSize,
              borderRadius: shrunk ? 16 : 18,
              marginTop: centerMargin,
              background: "linear-gradient(135deg, #ff3d8b, #ff3d8b, #c724ff)",
              backgroundSize: "200% 200%",
              boxShadow: "0 8px 25px rgba(255,82,82,0.4), 0 0 0 4px rgba(15,13,28,0.78)",
              transition: "width 0.2s, height 0.2s, margin-top 0.2s, border-radius 0.2s",
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

        {tabs.slice(3).map((t) => (
          <TabItem
            key={t.to}
            tab={t}
            active={activeMap[t.to]}
            shrunk={shrunk}
            iconSize={iconSize}
            badge={t.badgeKey === "inbox" ? unread : 0}
          />
        ))}
      </div>
    </nav>
  );
}
