import type { Metadata } from "next";
import { PackageCheck } from "lucide-react";

import { getGenerationPreview } from "@/lib/data/generation";
import {
  getMonthlyFulfillment,
  getDeliverables,
} from "@/lib/data/deliverables";
import { getSponsorsForSelect } from "@/lib/data/sponsors";
import { currentServiceMonth } from "@/lib/domain/dates";
import { formatMonth } from "@/lib/format";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { MonthPicker } from "@/components/deliverables/month-picker";
import { GenerateDialog } from "@/components/deliverables/generate-dialog";
import { AddDeliverableDialog } from "@/components/deliverables/add-deliverable-dialog";
import { FulfillmentSummary } from "@/components/deliverables/fulfillment-summary";
import { DeliverableFilters } from "@/components/deliverables/deliverable-filters";
import { WorkspaceTable } from "@/components/deliverables/workspace-table";
import { BoardView } from "@/components/deliverables/board-view";

export const metadata: Metadata = { title: "Deliverables — Wichita Life" };

type SearchParams = Record<string, string | string[] | undefined>;
const str = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function DeliverablesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const monthParam = str(sp.month);
  const month =
    monthParam && /^\d{4}-\d{2}$/.test(monthParam)
      ? monthParam
      : currentServiceMonth().slice(0, 7);
  const serviceMonth = `${month}-01`;
  const monthLabel = formatMonth(serviceMonth);
  const view = str(sp.view) === "board" ? "board" : "table";

  const [preview, fulfillment, deliverables, sponsors] = await Promise.all([
    getGenerationPreview(serviceMonth),
    getMonthlyFulfillment(serviceMonth),
    getDeliverables({
      month,
      sponsorId: str(sp.sponsor),
      type: str(sp.type),
      status: str(sp.status),
      asset: str(sp.asset),
      scheduled: str(sp.scheduled) as "scheduled" | "unscheduled" | undefined,
      overdue: str(sp.overdue) === "1",
      carried: str(sp.carried) === "1",
    }),
    getSponsorsForSelect(),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Deliverables"
        description="Generate, track, and fulfill what you owe each sponsor by month."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <MonthPicker month={month} />
            <AddDeliverableDialog sponsors={sponsors} defaultMonth={month} />
            <GenerateDialog
              serviceMonth={serviceMonth}
              monthLabel={monthLabel}
              preview={preview}
            />
          </div>
        }
      />

      <FulfillmentSummary data={fulfillment} />

      <DeliverableFilters sponsors={sponsors} view={view} />

      {deliverables.length === 0 ? (
        <EmptyState
          icon={PackageCheck}
          title={`No deliverables for ${monthLabel}`}
          description="Use “Generate monthly deliverables” to create them from active sponsor packages, adjust your filters, or add one manually."
        />
      ) : view === "board" ? (
        <BoardView
          key={`${month}-${str(sp.sponsor) ?? ""}-${str(sp.type) ?? ""}-${str(sp.status) ?? ""}-${str(sp.asset) ?? ""}`}
          rows={deliverables}
        />
      ) : (
        <WorkspaceTable rows={deliverables} month={month} />
      )}
    </div>
  );
}
