import { WebShell } from "@/components/shell";
import {
  joinSupportDesk,
  listMessageableStudents,
  listThreads,
} from "@/lib/messages";
import { requireSession } from "@/lib/session";
import { MessagesView } from "./messages-view";

export default async function SupportDesk() {
  const session = await requireSession("admin");

  // Before the read, not alongside it. 0035 writes the team into a support
  // thread when the student opens it, so an admin added afterwards is missing
  // from every thread that already existed — and a list built before the join
  // would be that admin's inbox minus its history.
  await joinSupportDesk();

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
      title="Rockstar Support"
      sub={
        unread === 0
          ? "Every student writes to this one handle · all caught up"
          : `Every student writes to this one handle · ${unread} unread`
      }
    >
      <div style={{ height: "100%" }}>
        <MessagesView threads={threads} students={students} />
      </div>
    </WebShell>
  );
}
