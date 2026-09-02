import Link from "next/link";
import { WebShell } from "@/components/shell";
import { Avatar, Badge, Card, Empty, Table, type Col } from "@/components/ui/primitives";
import { requireSession } from "@/lib/session";
import { listEducators } from "@/lib/reporting";

const COLS: Col[] = [
  ["Educator", 1.8],
  ["Verified", 0.8],
  ["Published", 0.8, "right"],
  ["Courses", 0.7, "right"],
  ["Students", 0.8, "right"],
];

export default async function AdminEducators() {
  const session = await requireSession("admin");
  const educators = await listEducators();
  const unverified = educators.filter((e) => !e.is_verified).length;

  return (
    <WebShell
      session={session}
      title="Educators"
      sub={
        educators.length === 0
          ? "None yet"
          : `${educators.length} ${educators.length === 1 ? "educator" : "educators"}` +
            (unverified ? ` · ${unverified} unverified` : "")
      }
    >
      <Card pad={0}>
        {educators.length === 0 ? (
          <Empty
            title="No educators yet"
            hint="A profile is created automatically when an account's Clerk role is set to educator."
          />
        ) : (
          <div style={{ padding: "0 4px" }}>
            <Table
              cols={COLS}
              rows={educators.map((e) => [
                <Link
                  key="e"
                  href={`/admin/educators/${e.id}`}
                  style={{ display: "flex", alignItems: "center", gap: 9, color: "var(--text-primary)", textDecoration: "none" }}
                >
                  <Avatar name={e.full_name ?? e.email ?? "?"} size={26} />
                  <span>
                    <span style={{ display: "block" }}>{e.full_name ?? "Unnamed"}</span>
                    <span style={{ display: "block", fontSize: 11.5, color: "var(--text-muted)" }}>
                      {e.headline ?? e.email ?? "—"}
                    </span>
                  </span>
                </Link>,
                <Badge key="v" tone={e.is_verified ? "complete" : "warn"}>
                  {e.is_verified ? "Verified" : "Unverified"}
                </Badge>,
                e.published,
                e.courses,
                e.students.toLocaleString(),
              ])}
            />
          </div>
        )}
      </Card>
    </WebShell>
  );
}
