import { Component, type ErrorInfo, type ReactNode, useState } from "react";
import { Bell, CheckCheck, Loader2 } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import {
  formatNotificationTime,
  markAllNotificationsRead,
  markNotificationRead,
  notificationBody,
  notificationIcon,
  notificationTitle,
  type NotificationRow,
} from "@/lib/notifications";
import { useNotifications } from "@/hooks/use-notifications";

const headerPillBase =
  "inline-flex items-center justify-center rounded-lg border border-border/80 bg-card text-foreground shadow-[var(--shadow-soft)] transition-all hover:border-primary/45 hover:text-primary hover:shadow-[var(--shadow-elegant)]";

function NotificationItem({
  item,
  onRead,
}: {
  item: NotificationRow;
  onRead: (id: string) => void;
}) {
  const { bi, lang } = useI18n();
  const unread = !item.read_at;
  const title = bi(notificationTitle(item));
  const body = bi(notificationBody(item));
  const time = formatNotificationTime(item.created_at, lang === "ar" ? "ar" : "en");

  const inner = (
    <div
      className={cn(
        "flex gap-3 rounded-xl border px-3 py-2.5 text-start transition-colors",
        unread ? "border-primary/25 bg-primary/5" : "border-border bg-background",
      )}
    >
      <span className="text-lg shrink-0 leading-none mt-0.5" aria-hidden>
        {notificationIcon(item.type)}
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold text-foreground leading-snug">{title}</div>
        {body ? (
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{body}</p>
        ) : null}
        <p className="text-[10px] text-muted-foreground mt-1">{time}</p>
      </div>
      {unread ? (
        <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" aria-hidden />
      ) : null}
    </div>
  );

  const handleClick = () => {
    if (unread) onRead(item.id);
  };

  if (item.href) {
    return (
      <a
        href={item.href}
        onClick={handleClick}
        className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-xl"
      >
        {inner}
      </a>
    );
  }

  return (
    <button type="button" onClick={handleClick} className="w-full">
      {inner}
    </button>
  );
}

export function NotificationBell({ className }: { className?: string }) {
  const { tr } = useI18n();
  const [open, setOpen] = useState(false);
  const { items, unreadCount, loading, reload } = useNotifications(true);

  async function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next) {
      await reload();
    }
  }

  async function handleRead(id: string) {
    try {
      await markNotificationRead(id);
      await reload();
    } catch (error) {
      console.warn("[notifications read]", error);
    }
  }

  async function handleMarkAll() {
    try {
      await markAllNotificationsRead();
      await reload();
    } catch (error) {
      console.warn("[notifications mark all]", error);
    }
  }

  const badgeLabel =
    unreadCount > 99 ? "99+" : unreadCount > 0 ? String(unreadCount) : null;

  return (
    <Popover open={open} onOpenChange={(v) => void handleOpenChange(v)}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={tr("nav_notifications")}
          title={tr("nav_notifications")}
          className={cn(headerPillBase, "relative h-8 w-8 shrink-0", className)}
        >
          <Bell className="h-3.5 w-3.5" />
          {badgeLabel ? (
            <span className="absolute -top-1 -end-1 min-w-[1.1rem] rounded-full bg-primary px-1 py-0.5 text-[9px] font-bold leading-none text-primary-foreground">
              {badgeLabel}
            </span>
          ) : null}
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-[min(96vw,22rem)] p-0 overflow-hidden"
      >
        <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
          <h2 className="font-display text-sm font-semibold text-foreground">
            {tr("notifications_title")}
          </h2>
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={() => void handleMarkAll()}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline"
            >
              <CheckCheck className="h-3.5 w-3.5" />
              {tr("notifications_mark_all_read")}
            </button>
          )}
        </div>

        <div className="max-h-[min(70vh,24rem)] overflow-y-auto p-2 space-y-2">
          {loading && items.length === 0 ? (
            <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              {tr("loading")}
            </div>
          ) : items.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground px-3">
              {tr("notifications_empty")}
            </p>
          ) : (
            items.map((item) => (
              <NotificationItem key={item.id} item={item} onRead={(id) => void handleRead(id)} />
            ))
          )}
        </div>

        {unreadCount > 0 && (
          <div className="border-t border-border px-4 py-2 text-[11px] text-muted-foreground text-center">
            {unreadCount} {tr("notifications_unread")}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

type NotificationBellBoundaryProps = {
  className?: string;
};

type NotificationBellBoundaryState = {
  failed: boolean;
};

/** Isolates notification UI failures so pages (e.g. admin assignments) still load. */
class NotificationBellBoundary extends Component<
  NotificationBellBoundaryProps,
  NotificationBellBoundaryState
> {
  state: NotificationBellBoundaryState = { failed: false };

  static getDerivedStateFromError(): NotificationBellBoundaryState {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.warn("[NotificationBell]", error, info.componentStack);
  }

  render(): ReactNode {
    if (this.state.failed) return null;
    return <NotificationBell className={this.props.className} />;
  }
}

export function SafeNotificationBell(props: NotificationBellBoundaryProps) {
  return <NotificationBellBoundary {...props} />;
}
