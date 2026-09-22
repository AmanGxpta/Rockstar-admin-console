import "server-only";

import { createSupabaseServerClient } from "./supabase";

export type ThreadParticipant = {
  id: string;
  name: string;
  /** Null unless 0022 lets this account read the student's `users` row. */
  email: string | null;
};

export type ThreadSummary = {
  id: string;
  with: ThreadParticipant;
  course_id: string | null;
  course_title: string | null;
  last_message_at: string;
  last_message_preview: string;
  unread_count: number;
};

export type ThreadMessageMedia = {
  id: string;
  kind: "image" | "video";
  /** Signed for an hour; null when Storage would not sign the object. */
  url: string | null;
};

export type ThreadMessage = {
  id: string;
  body: string;
  created_at: string;
  /** Which side of the thread the bubble is drawn on. */
  is_mine: boolean;
  media: ThreadMessageMedia[];
};

/** A student this account may open a thread with. */
export type MessageableStudent = {
  id: string;
  name: string;
  email: string | null;
  course_id: string;
  course_title: string;
};

/**
 * No educator filter anywhere in this module.
 *
 * 0027's read policies are `is_conversation_participant(...)`, so every query
 * below already returns exactly the threads this account is in and widens for
 * an admin. A second filter here would be a divergent copy of that rule — the
 * same reasoning `lib/submissions.ts` carries about 0016.
 */
const THREAD_SELECT = `
  id, kind, created_by, course_id, last_message_at, last_message_preview,
  course:courses ( id, title ),
  participants:conversation_participants ( user_id, unread_count )
`;

type ThreadRow = {
  id: string;
  kind: "educator" | "direct" | "support";
  created_by: string;
  course_id: string | null;
  last_message_at: string;
  last_message_preview: string;
  course: { id: string; title: string } | null;
  participants: { user_id: string; unread_count: number }[] | null;
};

type MessageRow = {
  id: string;
  sender_id: string;
  body: string;
  created_at: string;
  media: { id: string; path: string; kind: string; position: number }[] | null;
};

/** The caller's `users.id`, which this app otherwise only holds a Clerk id for. */
async function currentUserId(): Promise<string | null> {
  const supabase = createSupabaseServerClient();
  const { data } = await supabase.rpc("current_user_id");
  return (data as string | null) ?? null;
}

/**
 * Names the other people in a set of threads.
 *
 * Two reads, because neither alone is enough. `public_profiles` (0023) always
 * answers and carries the name and face any signed-in person may see;
 * `users` carries the email the console's header shows, and 0022 opens it only
 * for students enrolled on this account's own courses. So the profile is the
 * source of truth for the name and the email is an enrichment that is allowed
 * to come back empty — which it will for an admin looking at a thread between
 * two other people, and that is the correct amount of information to show.
 */
async function nameParticipants(
  userIds: string[],
): Promise<Map<string, ThreadParticipant>> {
  const unique = [...new Set(userIds.filter(Boolean))];
  const out = new Map<string, ThreadParticipant>();
  if (!unique.length) return out;

  const supabase = createSupabaseServerClient();

  const [{ data: profiles }, { data: rows }] = await Promise.all([
    supabase
      .from("public_profiles")
      .select("user_id, display_name")
      .in("user_id", unique),
    supabase.from("users").select("id, full_name, email").in("id", unique),
  ]);

  const emails = new Map(
    (rows ?? []).map((row) => [row.id, { email: row.email, name: row.full_name }]),
  );

  unique.forEach((id) => {
    const profile = (profiles ?? []).find((p) => p.user_id === id);
    const extra = emails.get(id);
    out.set(id, {
      id,
      name:
        profile?.display_name?.trim() ||
        extra?.name?.trim() ||
        "Rockstar member",
      email: extra?.email ?? null,
    });
  });

  return out;
}

/**
 * Puts this admin on every support thread they are not already on.
 *
 * A support thread's participants are a snapshot of the team taken when the
 * student first wrote in (0035), so an admin added to the platform afterwards
 * would have an inbox that started at their own join date. Reconciling it here
 * rather than by trigger means it also repairs itself after a role change, and
 * the call is one idempotent statement that returns 0 on every load but the
 * first.
 */
export async function joinSupportDesk(): Promise<void> {
  const supabase = createSupabaseServerClient();
  const { error } = await supabase.rpc("join_support_conversations");
  // Not fatal. An educator calling it is refused by design, and an inbox that
  // renders one thread short is better than one that does not render.
  if (error && !/only the team/.test(error.message)) {
    console.error("[messages] could not join the support desk:", error.message);
  }
}

/** Every thread this account is in, most recently spoken in first. */
export async function listThreads(): Promise<ThreadSummary[]> {
  const supabase = createSupabaseServerClient();

  const [{ data, error }, meId] = await Promise.all([
    supabase
      .from("conversations")
      .select(THREAD_SELECT)
      .order("last_message_at", { ascending: false })
      .limit(200),
    currentUserId(),
  ]);

  if (error) throw new Error(error.message);

  const rows = (data ?? []) as unknown as ThreadRow[];
  if (!rows.length) return [];

  /*
    0027's policy returns *both* participants of a thread you are in, which is
    what puts the other person's id and your own unread counter in the same
    read. Picking them apart is this function's job; PostgREST cannot express
    "the embedded row that is not me".

    A support thread is not two people, though — it is one student and the
    whole team — so "not me" would name whichever colleague happened to sort
    first. `created_by` is the student on those, by construction: 0035's
    start_support_conversation() refuses an admin, so nobody else can have
    opened one.
  */
  const others = rows.map((row) =>
    row.kind === "support"
      ? row.created_by
      : ((row.participants ?? []).find((p) => p.user_id !== meId)?.user_id ?? ""),
  );
  const people = await nameParticipants(others);

  return rows.map((row, i) => ({
    id: row.id,
    with: people.get(others[i]) ?? {
      id: others[i],
      name: "Rockstar member",
      email: null,
    },
    course_id: row.course_id,
    course_title: row.course?.title ?? null,
    last_message_at: row.last_message_at,
    last_message_preview: row.last_message_preview,
    unread_count:
      (row.participants ?? []).find((p) => p.user_id === meId)?.unread_count ?? 0,
  }));
}

/**
 * Unread messages across the support desk, for the sidebar badge.
 *
 * Filtered to this account's own participant rows: 0027's read policy returns
 * every participant of every thread you are in, so summing the lot would add
 * the students' unread counts to the team's.
 */
export async function countSupportUnread(): Promise<number> {
  const supabase = createSupabaseServerClient();
  const meId = await currentUserId();
  if (!meId) return 0;

  const { data, error } = await supabase
    .from("conversation_participants")
    .select("unread_count")
    .eq("user_id", meId)
    .gt("unread_count", 0);

  if (error) {
    console.error("[messages] unread count failed:", error.message);
    return 0;
  }
  return (data ?? []).reduce((total, row) => total + row.unread_count, 0);
}

/**
 * One thread, oldest message first — the order it is read in.
 *
 * Capped rather than paged. The console is a desk tool on a wide screen and
 * these threads are questions about coursework, not group chat; two hundred
 * messages is well past where an educator would scroll, and a cursor here
 * would be machinery for a case that does not exist yet. The mobile thread
 * pages properly because a phone genuinely cannot hold the lot.
 */
export async function getThreadMessages(
  conversationId: string,
): Promise<ThreadMessage[]> {
  const supabase = createSupabaseServerClient();

  const [{ data, error }, meId] = await Promise.all([
    supabase
      .from("messages")
      .select(
        `id, sender_id, body, created_at,
         media:message_media ( id, path, kind, position )`,
      )
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true })
      .limit(200),
    currentUserId(),
  ]);

  if (error) throw new Error(error.message);

  const rows = (data ?? []) as unknown as MessageRow[];
  if (!rows.length) return [];

  const paths = rows.flatMap((row) => (row.media ?? []).map((m) => m.path));
  const signed = await signChatMedia(paths);

  return rows.map((row) => ({
    id: row.id,
    body: row.body,
    created_at: row.created_at,
    is_mine: meId !== null && row.sender_id === meId,
    media: [...(row.media ?? [])]
      .sort((a, b) => a.position - b.position)
      .map((m) => ({
        id: m.id,
        kind: m.kind === "video" ? ("video" as const) : ("image" as const),
        url: signed.get(m.path) ?? null,
      })),
  }));
}

/**
 * Signs a whole thread's attachments in one round trip.
 *
 * `chat-media` is private (0027), so a path is not a URL. A thread that cannot
 * be signed should still show what people said, so a failure here costs the
 * pictures and not the screen — the same bargain `lib/submissions.ts` makes.
 */
async function signChatMedia(paths: string[]): Promise<Map<string, string>> {
  const unique = [...new Set(paths)];
  if (!unique.length) return new Map();

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase.storage
    .from("chat-media")
    .createSignedUrls(unique, 60 * 60);

  if (error || !data) return new Map();

  const out = new Map<string, string>();
  data.forEach((signed, i) => {
    if (signed.signedUrl) out.set(unique[i], signed.signedUrl);
  });
  return out;
}

/**
 * Students this account could start a thread with.
 *
 * Read from `enrollments`, because that is what an educator may actually see:
 * 0010 opens enrolments on courses they author, and 0022 opens the `users`
 * rows behind them. `entitlements` — which is the table `start_conversation()`
 * really checks — is readable only by its owner and by an admin, so this list
 * cannot be derived from the rule it is a list for.
 *
 * The gap that leaves is real and is handled rather than hidden: a student
 * whose access has lapsed is still enrolled, so they appear here, and
 * `start_conversation()` refuses them. The compose form surfaces that refusal
 * instead of pretending it cannot happen.
 */
export async function listMessageableStudents(): Promise<MessageableStudent[]> {
  const supabase = createSupabaseServerClient();

  const { data, error } = await supabase
    .from("enrollments")
    .select(
      `user_id, course_id,
       course:courses ( id, title ),
       user:users ( id, full_name, email )`,
    )
    .limit(500);

  if (error) throw new Error(error.message);

  type Row = {
    user_id: string;
    course_id: string;
    course: { id: string; title: string } | null;
    user: { id: string; full_name: string | null; email: string | null } | null;
  };

  const rows = (data ?? []) as unknown as Row[];

  // One entry per student per course: the same person taking two of this
  // educator's courses is two things they might be messaged about, and
  // `start_conversation()` keys its thread on the course as well as the pair.
  const seen = new Set<string>();
  const out: MessageableStudent[] = [];

  for (const row of rows) {
    if (!row.course || !row.user) continue;
    const key = `${row.user_id}:${row.course_id}`;
    if (seen.has(key)) continue;
    seen.add(key);

    out.push({
      id: row.user_id,
      name: row.user.full_name?.trim() || "Rockstar member",
      email: row.user.email,
      course_id: row.course_id,
      course_title: row.course.title,
    });
  }

  return out.sort((a, b) => a.name.localeCompare(b.name));
}
