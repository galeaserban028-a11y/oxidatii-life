import { useEffect } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Bell, Check, UserPlus, UserCheck, UserX, X, Trash2 } from "lucide-react";
import { useAuth } from "@/lib/auth";
import {
  useNotifications,
  useNotificationActions,
  type NotificationRow,
  type NotificationType,
} from "@/lib/notifications";
import { NotificationSettings } from "@/components/app/NotificationSettings";

export const Route = createFileRoute("/app/notifications")({
  head: () => ({ meta: [{ title: "Notificări · OXIDAȚII" }] }),
  component: NotificationsPage,
});

const labels: Record<NotificationType, { text: string; Icon: typeof Bell; tone: string }> = {
  follow_request: { text: "vrea să te urmărească", Icon: UserPlus, tone: "text-sunset-amber" },
  follow_accepted: { text: "ți-a acceptat cererea", Icon: UserCheck, tone: "text-sunset-amber" },
  follow_accepted_auto: {
    text: "a început să te urmărească",
    Icon: UserCheck,
    tone: "text-sunset-magenta",
  },
  follow_rejected: { text: "ți-a respins cererea", Icon: UserX, tone: "text-muted-foreground" },
};

function timeAgo(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "acum";
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  if (diff < 7 * 86400) return `${Math.floor(diff / 86400)}z`;
  return new Date(iso).toLocaleDateString("ro-RO");
}

function NotificationsPage() {
  const { user } = useAuth();
  const { data: items, isLoading } = useNotifications(user?.id);
  const { markAllRead, remove } = useNotificationActions(user?.id);

  // Mark everything read on view
  useEffect(() => {
    if (!user?.id) return;
    if (items && items.some((n) => !n.read_at)) {
      markAllRead.mutate();
    }
  }, [user?.id, items?.length]);

  if (!user) {
    return (
      <div className="px-4 pt-6 text-center text-sm text-muted-foreground">
        Fă-ți cont ca să vezi notificările.
      </div>
    );
  }

  return (
    <div className="px-5 pt-8 pb-12 max-w-xl mx-auto space-y-7">
      <header className="flex items-end justify-between gap-3">
        <div className="space-y-2">
          <div className="text-[10px] uppercase tracking-[0.3em] text-zinc-500">activitate</div>
          <h1 className="font-display uppercase text-3xl leading-[0.95]">Notificări.</h1>
          <p className="text-xs text-zinc-500">cine te-a căutat în noaptea asta</p>
        </div>
        <div className="h-11 w-11 rounded-2xl bg-zinc-900/30 border border-white/5 flex items-center justify-center shrink-0">
          <Bell size={18} className="text-zinc-400" />
        </div>
      </header>

      <NotificationSettings />

      {isLoading ? (
        <div className="text-sm text-muted-foreground">Se încarcă...</div>
      ) : !items || items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-foreground/15 p-8 text-center space-y-2">
          <Bell className="mx-auto opacity-50" />
          <div className="font-display uppercase">Nimic nou.</div>
          <p className="text-xs text-muted-foreground">
            Când cineva te urmărește sau îți acceptă cererea, apare aici.
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {items.map((n) => (
            <NotificationItem key={n.id} n={n} onDelete={() => remove.mutate(n.id)} />
          ))}
        </ul>
      )}
    </div>
  );
}

function NotificationItem({ n, onDelete }: { n: NotificationRow; onDelete: () => void }) {
  const meta = labels[n.type] ?? labels.follow_accepted_auto;
  const Icon = meta.Icon;
  const handle = n.actor?.handle ?? n.actor?.display_name ?? "anonim";
  const initial = handle[0]?.toUpperCase() ?? "?";

  const isRequest = n.type === "follow_request";

  return (
    <li
      className={`flex items-center gap-3 p-3 rounded-2xl border transition ${
        n.read_at ? "border-white/5 bg-zinc-900/30" : "border-neon-crimson/30 bg-zinc-900/40"
      }`}
    >
      {n.actor?.id ? (
        <Link
          to="/app/user/$id"
          params={{ id: n.actor.id }}
          className="relative h-11 w-11 rounded-full overflow-hidden bg-gradient-to-br from-sunset-orange to-sunset-magenta flex items-center justify-center text-white font-display font-bold shrink-0"
        >
          {n.actor.avatar_url ? (
            <img
              src={n.actor.avatar_url}
              alt=""
              className="h-full w-full object-cover"
              loading="lazy"
              decoding="async"
            />
          ) : (
            initial
          )}
          <span
            className={`absolute -bottom-0.5 -right-0.5 h-5 w-5 rounded-full bg-background flex items-center justify-center ${meta.tone}`}
          >
            <Icon size={11} strokeWidth={2.6} />
          </span>
        </Link>
      ) : (
        <div className="h-11 w-11 rounded-full bg-muted flex items-center justify-center shrink-0">
          <Icon size={18} className={meta.tone} />
        </div>
      )}

      <div className="flex-1 min-w-0">
        <div className="font-display font-semibold truncate text-[14px]">@{handle}</div>
        <div className="text-[11px] text-muted-foreground truncate">
          {meta.text} · {timeAgo(n.created_at)}
        </div>
      </div>

      {isRequest ? (
        <Link
          to="/app/requests"
          className="h-9 px-3 rounded-full bg-sunset-orange text-background text-[11px] font-display font-bold uppercase flex items-center gap-1 active:scale-95 transition"
          aria-label="Vezi cererile"
        >
          <Check size={14} strokeWidth={3} />
          Vezi
        </Link>
      ) : null}

      <button
        onClick={onDelete}
        className="h-9 w-9 rounded-full text-muted-foreground hover:text-foreground hover:bg-foreground/5 flex items-center justify-center active:scale-95 transition shrink-0"
        aria-label="Șterge"
      >
        {isRequest ? <X size={16} /> : <Trash2 size={15} />}
      </button>
    </li>
  );
}
