import { createSupabaseServerClient } from "./supabase";

export type ConsoleNotification = {
  id: string;
  kind: "feedback" | "announcement" | "review";
  subject: string;
  preview: string;
  body: string | null;
  sentAt: string;
  timeLabel: string;
  isRead: boolean;
  senderName: string;
};

export type NotificationInbox = {
  items: ConsoleNotification[];
  unread: number;
};

function timeLabel(iso: string, now = Date.now()): string {
  const sent = new Date(iso);
  const elapsed = Math.max(0, now - sent.getTime());
  const minutes = Math.floor(elapsed / 60_000);

  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  if (hours < 48) return "Yesterday";

  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    ...(sent.getFullYear() === new Date(now).getFullYear()
      ? {}
      : { year: "numeric" as const }),
  }).format(sent);
}

/**
 * The console inbox shared by educators and admins.
 *
 * There is no recipient id in this query on purpose. `inbox_messages` is an
 * own-rows table: its select policy resolves the current Clerk user through
 * current_user_id(), so the same read works for either console role and a
 * caller cannot ask for somebody else's messages by changing an argument.
 */
export async function getNotificationInbox(): Promise<NotificationInbox> {
  const supabase = createSupabaseServerClient();
  const [list, count] = await Promise.all([
    supabase
      .from("inbox_messages")
      .select(
        "id, kind, subject, preview, body, sent_at, is_read, sender:educator_profiles(display_name)",
      )
      .order("sent_at", { ascending: false })
      .limit(20),
    supabase
      .from("inbox_messages")
      .select("id", { count: "exact", head: true })
      .eq("is_read", false),
  ]);

  if (list.error) {
    console.error("[notifications] inbox lookup failed:", list.error.message);
    return { items: [], unread: 0 };
  }

  const now = Date.now();
  const items = list.data.map((row) => ({
    id: row.id,
    kind: row.kind,
    subject: row.subject,
    preview: row.preview,
    body: row.body,
    sentAt: row.sent_at,
    timeLabel: timeLabel(row.sent_at, now),
    isRead: row.is_read,
    senderName: row.sender?.display_name ?? "Rockstar Institute",
  }));

  if (count.error) {
    console.error("[notifications] unread count failed:", count.error.message);
  }

  return {
    items,
    unread: count.error
      ? items.filter((message) => !message.isRead).length
      : (count.count ?? 0),
  };
}
