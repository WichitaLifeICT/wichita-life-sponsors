import type { BillingFrequency } from "@/types/database";
import { toServiceMonth, addMonths, monthsBetween } from "@/lib/domain/dates";

export interface BillingPeriod {
  periodStart: string; // "YYYY-MM-01"
  periodEnd: string; // last day of the period
  months: number; // length of the period in months
}

/** Months covered by one period at a given frequency. */
export function periodMonths(frequency: BillingFrequency): number {
  switch (frequency) {
    case "quarterly":
      return 3;
    case "annually":
      return 12;
    case "one_time":
      return 1;
    case "monthly":
    case "custom":
    default:
      return 1;
  }
}

function daysInMonth(monthStart: string): number {
  const [y, m] = monthStart.split("-").map(Number);
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

/**
 * Generate the billing periods for a sponsor, from their contract start date at
 * their billing cadence, through `through` (usually today) — capped at the
 * contract end date if it is earlier. One-time deals produce a single period.
 */
export function generatePeriods(
  contractStart: string | null,
  frequency: BillingFrequency,
  through: string,
  contractEnd: string | null = null,
): BillingPeriod[] {
  if (!contractStart) return [];

  const step = periodMonths(frequency);
  const startMonth = toServiceMonth(contractStart);
  const throughMonth = toServiceMonth(through);

  let limitMonth = throughMonth;
  if (contractEnd) {
    const endMonth = toServiceMonth(contractEnd);
    if (monthsBetween(endMonth, limitMonth) > 0) limitMonth = endMonth;
  }
  if (monthsBetween(startMonth, limitMonth) < 0) return [];

  const periods: BillingPeriod[] = [];
  let cursor = startMonth;
  // Guard against runaway loops (e.g. 200 years) — 1200 periods is plenty.
  for (let i = 0; i < 1200; i++) {
    if (monthsBetween(cursor, limitMonth) < 0) break;
    const endMonthStart = addMonths(cursor, step - 1);
    const periodEnd = `${endMonthStart.slice(0, 7)}-${String(
      daysInMonth(endMonthStart),
    ).padStart(2, "0")}`;
    periods.push({ periodStart: cursor, periodEnd, months: step });
    if (frequency === "one_time") break;
    cursor = addMonths(cursor, step);
  }
  return periods;
}

/** Human label for a period, given its frequency length. */
export function periodLabel(period: BillingPeriod): string {
  const [y, m] = period.periodStart.split("-").map(Number);
  const startName = new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
  if (period.months === 1) return startName;
  const [ey, em] = period.periodEnd.split("-").map(Number);
  const endName = new Date(Date.UTC(ey, em - 1, 1)).toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
  return `${startName} – ${endName}`;
}
