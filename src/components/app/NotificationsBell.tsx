import { Link } from "@tanstack/react-router";
import { Bell } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useUnreadNotificationsCount } from "@/lib/notifications";

export function NotificationsBell() {
  const { user } = useAuth();
  const { data: count = 0 } = useUnreadNotificationsCount(user?.id);

  if (!user) return null;

  return (
    <Link
      to="/app/notifications"
      aria-label={count > 0 ? `${count} notificări noi` : "Notificări"}
      className="relative h-9 w-9 flex items-center justify-center rounded-full hover:bg-foreground/5 active:scale-95 transition shrink-0"
    >
      <Bell size={20} className="text-foreground" />
      {count > 0 && (
        <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-sunset-orange text-background text-[10px] font-display font-bold flex items-center justify-center leading-none shadow-[0_0_12px_rgba(255,140,80,0.6)]">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Link>
  );
}
