import { WebShell } from "@/components/shell";
import { requireSession } from "@/lib/session";
import { MessagesView } from "./messages-view";

export default async function EducatorMessages() {
  const session = await requireSession("educator");

  return (
    <WebShell session={session} title="Messages" sub="4 unread">
      <div style={{ height: "100%" }}>
        <MessagesView />
      </div>
    </WebShell>
  );
}
