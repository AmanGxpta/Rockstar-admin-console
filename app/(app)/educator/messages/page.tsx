import { WebShell } from "@/components/shell";
import { listMessageableStudents, listThreads } from "@/lib/messages";
import { requireSession } from "@/lib/session";
import { MessagesView } from "./messages-view";

export default async function EducatorMessages() {
  const session = await requireSession("educator");

  // Both are scoped by RLS rather than by a filter here — 0027's policies for
  // the threads, 0010's and 0022's for the students. A failure in either is
  // allowed to take the page down: a messages screen that silently shows no
  // conversations is worse than one that says it broke.
  const [threads, students] = await Promise.all([
    listThreads(),
    listMessageableStudents(),
  ]);

  const unread = threads.reduce((total, t) => total + t.unread_count, 0);

  return (
    <WebShell
      session={session}
      title="Messages"
      // Was hardcoded to "4 unread", which was true of the seed rows and of
      // nothing else.
      sub={unread === 0 ? "All caught up" : `${unread} unread`}
    >
      <div style={{ height: "100%" }}>
        <MessagesView threads={threads} students={students} />
      </div>
    </WebShell>
  );
}
