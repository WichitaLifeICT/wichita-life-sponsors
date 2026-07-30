import { formatInTimeZone } from "date-fns-tz";

import { APP_TIMEZONE, DEFAULT_CURRENCY, DEFAULT_LOCALE } from "@/lib/config";

/** Format a number as currency, e.g. 1200 -> "$1,200.00". */
export function formatCurrency(
  amount: number | null | undefined,
  currency: string = DEFAULT_CURRENCY,
): string {
  const value = typeof amount === "number" ? amount : 0;
  return new Intl.NumberFormat(DEFAULT_LOCALE, {
    style: "currency",
    currency,
  }).format(value);
}

/** Compact currency for summary cards, e.g. 1200 -> "$1,200". */
export function formatCurrencyShort(
  amount: number | null | undefined,
  currency: string = DEFAULT_CURRENCY,
): string {
  const value = typeof amount === "number" ? amount : 0;
  return new Intl.NumberFormat(DEFAULT_LOCALE, {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

/**
 * Format an ISO date string ("2026-08-05") as "Aug 5, 2026" in the app timezone.
 * Date-only values are anchored to noon UTC so timezone conversion never shifts
 * the calendar day.
 */
export function formatDate(
  date: string | null | undefined,
  fmt = "MMM d, yyyy",
): string {
  if (!date) return "—";
  const iso = date.length <= 10 ? `${date}T12:00:00Z` : date;
  try {
    return formatInTimeZone(new Date(iso), APP_TIMEZONE, fmt);
  } catch {
    return "—";
  }
}

/** Format a service-month date as "August 2026". */
export function formatMonth(date: string | null | undefined): string {
  return formatDate(date, "MMMM yyyy");
}

/** Short month label, e.g. "Aug 2026". */
export function formatMonthShort(date: string | null | undefined): string {
  return formatDate(date, "MMM yyyy");
}

/** Turn an enum value like "newsletter_placement" into "Newsletter placement". */
export function humanize(value: string | null | undefined): string {
  if (!value) return "—";
  const s = value.replace(/_/g, " ");
  return s.charAt(0).toUpperCase() + s.slice(1);
}
