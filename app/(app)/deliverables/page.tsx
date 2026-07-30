import type { Metadata } from "next";
import { PackageCheck } from "lucide-react";

import { getGenerationPreview } from "@/lib/data/generation";
import {
  getMonthlyFulfillment,
  getMonthlyDeliverables,
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
import { DeliverablesTable } from "@/components/deliverables/deliverables-table";

export const metadata: Metadata = { title: "Deliverables — Wichita Life" };

type SearchParams = Record<string, string | string[] | undefined>;

function str(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

export default async function DeliverablesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const monthParam = str(sp.month);
  const month = monthParam && /^\d{4}-\d{2}$/.test(monthParam)
    ? monthParam
    : currentServiceMonth().slice(0, 7);
  const serviceMonth = `${month}-01`;
  const monthLabel = formatMonth(serviceMonth);

  const [preview, fulfillment, deliverables, sponsors] = await Promise.all([
    getGenerationPreview(serviceMonth),
    getMonthlyFulfillment(serviceMonth),
    getMonthlyDeliverables(serviceMonth),
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

      {deliverables.length === 0 ? (
        <EmptyState
          icon={PackageCheck}
          title={`No deliverables for ${monthLabel}`}
          description="Use “Generate monthly deliverables” to create them from active sponsor packages, or add one manually."
        />
      ) : (
        <DeliverablesTable rows={deliverables} />
      )}
    </div>
  );
}
