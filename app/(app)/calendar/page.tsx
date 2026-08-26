import type { Metadata } from "next";

import {
  getSlotsInRange,
  getMonthlySchedulingBySponsor,
  getCarryInUnscheduled,
  getPullForwardUnscheduled,
  getBlocksInRange,
  getInventorySummary,
  monthRange,
} from "@/lib/data/calendar";
import { autoFulfillPastScheduled } from "@/lib/data/deliverables";
import { getSponsorsForSelect } from "@/lib/data/sponsors";
import { currentServiceMonth } from "@/lib/domain/dates";
import { PageHeader } from "@/components/layout/page-header";
import { MonthPicker } from "@/components/deliverables/month-picker";
import { AddDeliverableDialog } from "@/components/deliverables/add-deliverable-dialog";
import { GenerateEmailsDialog } from "@/components/calendar/generate-emails-dialog";
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

  await autoFulfillPastScheduled();

  const [slots, scheduling, carryIn, pullForward, blocks, inventory, sponsors] =
    await Promise.all([
      getSlotsInRange(start, end, {
        type: str(sp.type),
        group: str(sp.group) as "newsletter" | "social" | undefined,
        fill: str(sp.fill) as "open" | "filled" | undefined,
      }),
      getMonthlySchedulingBySponsor(month),
      getCarryInUnscheduled(month),
      getPullForwardUnscheduled(month),
      getBlocksInRange(start, end),
      getInventorySummary(start, end),
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
            <GenerateEmailsDialog month={month} />
            <AddDeliverableDialog sponsors={sponsors} defaultMonth={month} />
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {inventory.map((stat) => (
          <div key={stat.key} className="rounded-lg border bg-card p-3">
            <p className="text-xs text-muted-foreground">{stat.label}</p>
            <p className="mt-0.5 text-sm">
              <span className="text-lg font-semibold tabular-nums">
                {stat.filled}
              </span>{" "}
              filled ·{" "}
              <span className="font-medium tabular-nums text-success">
                {stat.open}
              </span>{" "}
              available
            </p>
            <p className="text-[11px] text-muted-foreground">
              {stat.capacity} total spot{stat.capacity === 1 ? "" : "s"} this month
            </p>
          </div>
        ))}
      </div>

      <CalendarFilters view={view} />

      <CalendarBoard
        key={`${month}-${view}-${str(sp.type) ?? ""}-${str(sp.group) ?? ""}-${str(sp.fill) ?? ""}`}
        month={month}
        view={view}
        slots={slots}
        scheduling={scheduling}
        carryIn={carryIn}
        pullForward={pullForward}
        blocks={blocks}
        sponsors={sponsors}
      />
    </div>
  );
}
