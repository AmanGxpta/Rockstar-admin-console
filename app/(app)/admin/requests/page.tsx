import { WebShell } from "@/components/shell";
import { Card, Empty } from "@/components/ui/primitives";
import { listAccessRequests } from "@/lib/access-requests";
import { requireSession } from "@/lib/session";

import { RequestQueue } from "./request-queue";

/**
 * The queue the app's "Request access" button fills.
 *
 * Students no longer enroll themselves. `enroll_in_course()` is still there and
 * still works — a free course grants its own entitlement — but nothing in the
 * app calls it any more: the course screen opens a row in
 * `course_access_requests` and waits for somebody here. This is the somebody.
 */
export default async function AccessRequests() {
  const session = await requireSession("admin");
  const requests = await listAccessRequests();
  const pending = requests.filter((r) => r.state === "pending").length;

  return (
    <WebShell
      session={session}
      title="Access requests"
      sub={
        pending === 0
          ? "Nobody is waiting"
          : `${pending} ${pending === 1 ? "person is" : "people are"} waiting`
      }
    >
      {requests.length === 0 ? (
        <Card>
          <Empty
            title="No requests yet"
            hint="When a student taps Request access on a published course, they appear here. Approving one grants their access and enrolls them in the same move."
          />
        </Card>
      ) : (
        <RequestQueue requests={requests} />
      )}
    </WebShell>
  );
}
