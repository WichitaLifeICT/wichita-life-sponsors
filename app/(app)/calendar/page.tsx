import type { Metadata } from "next";

import {
  getSlotsInRange,
  getMonthlySchedulingBySponsor,
  monthRange,
} from "@/lib/data/calendar";
import { getSponsorsForSelect } from "@/lib/data/sponsors";
import { currentServiceMonth } from "@/lib/domain/dates";
import { PageHeader } from "@/components/layout/page-header";
import { MonthPicker } from "@/components/deliverables/month-picker";
import { AddDeliverableDialog } from "@/components/deliverables/add-deliverable-dialog";
import { CalendarFilters } from "@/components/calendar/calendar-filters";
import { CalendarBoard } from "@/components/calendar/calendar-board";

export const metadata: Metadata = { title: "Calendar — Wichita Life" };

type SearchParams = Record<string, string | string[] | undefined>;
const str = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function CalendarPage({
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
  const view = str(sp.view) === "agenda" ? "agenda" : "month";
  const { start, end } = monthRange(month);

  const [slots, scheduling, sponsors] = await Promise.all([
    getSlotsInRange(start, end, {
      type: str(sp.type),
      group: str(sp.group) as "newsletter" | "social" | undefined,
      fill: str(sp.fill) as "open" | "filled" | undefined,
    }),
    getMonthlySchedulingBySponsor(month),
    getSponsorsForSelect(),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Content Calendar"
        description="Newsletter and social inventory — create slots and schedule sponsor placements."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <MonthPicker month={month} />
            <AddDeliverableDialog sponsors={sponsors} defaultMonth={month} />
          </div>
        }
      />

      <CalendarFilters view={view} />

      <CalendarBoard
        key={`${month}-${view}-${str(sp.type) ?? ""}-${str(sp.group) ?? ""}-${str(sp.fill) ?? ""}`}
        month={month}
        view={view}
        slots={slots}
        scheduling={scheduling}
      />
    </div>
  );
}
