import { WebShell } from "@/components/shell";
import { Badge, Card, Empty, KPI, SectionH, Table, type BadgeTone, type Col } from "@/components/ui/primitives";
import { requireSession } from "@/lib/session";
import { formatDay, formatMinor, listPurchases } from "@/lib/reporting";
import type { Database } from "@/types/database";

type PurchaseStatus = Database["public"]["Enums"]["purchase_status"];

const STATUS: Record<PurchaseStatus, { label: string; tone: BadgeTone }> = {
  paid: { label: "Paid", tone: "complete" },
  pending: { label: "Pending", tone: "warn" },
  failed: { label: "Failed", tone: "locked" },
  refunded: { label: "Refunded", tone: "locked" },
  cancelled: { label: "Cancelled", tone: "locked" },
};

const COLS: Col[] = [
  ["Date", 0.8],
  ["Student", 1.2],
  ["Course", 1.4],
  ["Provider", 0.8],
  ["Amount", 0.8, "right"],
  ["Status", 0.8, "right"],
];

export default async function AdminRevenue() {
  const session = await requireSession("admin");
  const purchases = await listPurchases();

  // Collected, not billed: only a purchase a provider confirmed counts, so a
  // pending or failed attempt never inflates the figure.
  const paid = purchases.filter((p) => p.status === "paid");
  const refunded = purchases.filter((p) => p.status === "refunded");
  const collected = paid.reduce((a, p) => a + p.amount_cents, 0);
  const refundedTotal = refunded.reduce((a, p) => a + p.amount_cents, 0);

  return (
    <WebShell session={session} title="Revenue" sub="Collected across every course">
      <div style={{ display: "flex", gap: 16, marginBottom: 20 }}>
        <KPI icon="card" label="Collected" value={formatMinor(collected)} />
        <KPI icon="chart" label="Paid purchases" value={String(paid.length)} />
        <KPI icon="x" label="Refunded" value={formatMinor(refundedTotal)} up={false} />
        <KPI
          icon="user"
          label="Average sale"
          value={paid.length ? formatMinor(Math.round(collected / paid.length)) : "—"}
        />
      </div>

      <Card pad={0}>
        <div style={{ padding: "18px 20px 4px" }}>
          <SectionH>Transactions</SectionH>
        </div>
        {purchases.length === 0 ? (
          <Empty
            title="No transactions yet"
            hint="Checkout is not built, so nothing writes to the purchases table. These figures are read from it live and will fill in as soon as a payment provider is wired up."
          />
        ) : (
          <div style={{ padding: "0 4px 8px" }}>
            <Table
              cols={COLS}
              rows={purchases.map((p) => [
                formatDay(p.purchased_at ?? p.created_at),
                p.user?.full_name ?? p.user?.email ?? "—",
                p.course?.title ?? "—",
                p.provider,
                formatMinor(p.amount_cents, p.currency),
                <Badge key="s" tone={STATUS[p.status].tone} dot={false}>
                  {STATUS[p.status].label}
                </Badge>,
              ])}
            />
          </div>
        )}
      </Card>
    </WebShell>
  );
}
