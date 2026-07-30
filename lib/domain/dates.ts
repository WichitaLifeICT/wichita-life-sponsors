import { formatInTimeZone } from "date-fns-tz";

import { APP_TIMEZONE } from "@/lib/config";

/**
 * Service months are represented as the first day of the month, "YYYY-MM-01".
 * All "today" logic is anchored to the app timezone (America/Chicago) so the
 * calendar day never drifts by a UTC offset.
 */

/** Today's date in the app timezone as "YYYY-MM-DD". */
export function todayISO(now: Date = new Date()): string {
  return formatInTimeZone(now, APP_TIMEZONE, "yyyy-MM-dd");
}

/** The current service month as "YYYY-MM-01". */
export function currentServiceMonth(now: Date = new Date()): string {
  return formatInTimeZone(now, APP_TIMEZONE, "yyyy-MM-01");
}

/** Normalize any date string to the first of its month, "YYYY-MM-01". */
export function toServiceMonth(date: string): string {
  return `${date.slice(0, 7)}-01`;
}

/** Add N months to a "YYYY-MM-01" service month (N may be negative). */
export function addMonths(serviceMonth: string, n: number): string {
  const [y, m] = serviceMonth.split("-").map(Number);
  const zero = (y * 12 + (m - 1)) + n;
  const ny = Math.floor(zero / 12);
  const nm = (zero % 12) + 1;
  return `${String(ny).padStart(4, "0")}-${String(nm).padStart(2, "0")}-01`;
}

/**
 * Whole days from today (app timezone) until the given date.
 * Negative if the date is in the past. Returns null for empty input.
 */
export function daysUntil(date: string | null | undefined, now: Date = new Date()): number | null {
  if (!date) return null;
  const [ty, tm, td] = todayISO(now).split("-").map(Number);
  const a = Date.UTC(ty, tm - 1, td);
  const [y, m, d] = date.slice(0, 10).split("-").map(Number);
  const b = Date.UTC(y, m - 1, d);
  return Math.round((b - a) / 86_400_000);
}

/** True if `date` is strictly before today (app timezone). */
export function isPast(date: string | null | undefined, now: Date = new Date()): boolean {
  const days = daysUntil(date, now);
  return days !== null && days < 0;
}
