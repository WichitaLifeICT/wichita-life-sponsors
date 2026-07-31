import { createClient } from "@/lib/supabase/server";
import type { Sponsor, BillingFrequency, PaymentMethod } from "@/types/database";
import { effectiveMonthlyValue } from "@/lib/domain/revenue";
import {
  generatePeriods,
  periodLabel,
  type BillingPeriod,
} from "@/lib/domain/billing-periods";
import { todayISO, addMonths } from "@/lib/domain/dates";

interface StoredMark {
  id: string;
  amount: number;
  paid: boolean;
  paid_date: string | null;
  method: PaymentMethod | null;
  notes: string | null;
}

export interface PeriodRow {
  periodStart: string;
  periodEnd: string;
  label: string;
  amount: number;
  paid: boolean;
  paidDate: string | null;
  method: PaymentMethod | null;
  notes: string | null;
}

function buildRows(
  periods: BillingPeriod[],
  monthlyValue: number,
  marks: Map<string, StoredMark>,
): PeriodRow[] {
  return periods.map((p) => {
    const mark = marks.get(p.periodStart);
    const defaultAmount = Math.round(monthlyValue * p.months * 100) / 100;
    return {
      periodStart: p.periodStart,
      periodEnd: p.periodEnd,
      label: periodLabel(p),
      amount: mark ? mark.amount : defaultAmount,
      paid: mark?.paid ?? false,
      paidDate: mark?.paid_date ?? null,
      method: mark?.method ?? null,
      notes: mark?.notes ?? null,
    };
  });
}

async function monthlyValueMap(
  supabase: Awaited<ReturnType<typeof createClient>>,
  sponsors: Sponsor[],
): Promise<Map<string, number>> {
  const [{ data: subs }, { data: packages }] = await Promise.all([
    supabase
      .from("sponsor_subscriptions")
      .select("sponsor_id, package_id, custom_monthly_price")
      .eq("status", "active"),
    supabase.from("packages").select("id, base_price, billing_frequency"),
  ]);
  const pkg = new Map(
    (packages ?? []).map((p) => [
      p.id as string,
      p as { base_price: number; billing_frequency: BillingFrequency },
    ]),
  );
  const subBySponsor = new Map<string, { package_id: string | null; custom_monthly_price: number | null }>();
  for (const s of subs ?? []) {
    if (!subBySponsor.has(s.sponsor_id as string))
      subBySponsor.set(s.sponsor_id as string, {
        package_id: s.package_id as string | null,
        custom_monthly_price: s.custom_monthly_price as number | null,
      });
  }
  const result = new Map<string, number>();
  for (const sp of sponsors) {
    const sub = subBySponsor.get(sp.id);
    const p = sub?.package_id ? pkg.get(sub.package_id) : undefined;
    result.set(
      sp.id,
      effectiveMonthlyValue({
        sponsorMonthlyPrice: sp.monthly_price,
        sponsorBillingFrequency: sp.billing_frequency,
        subscriptionCustomMonthlyPrice: sub?.custom_monthly_price,
        packageBasePrice: p?.base_price,
        packageBillingFrequency: p?.billing_frequency ?? null,
      }),
    );
  }
  return result;
}

async function marksBySponsor(
  supabase: Awaited<ReturnType<typeof createClient>>,
  sponsorIds: string[],
): Promise<Map<string, Map<string, StoredMark>>> {
  const result = new Map<string, Map<string, StoredMark>>();
  if (sponsorIds.length === 0) return result;
  const { data } = await supabase
    .from("billing_periods")
    .select("id, sponsor_id, period_start, amount, paid, paid_date, method, notes")
    .in("sponsor_id", sponsorIds);
  for (const m of data ?? []) {
    const sid = m.sponsor_id as string;
    const inner = result.get(sid) ?? new Map<string, StoredMark>();
    inner.set(m.period_start as string, {
      id: m.id as string,
      amount: m.amount as number,
      paid: m.paid as boolean,
      paid_date: (m.paid_date as string | null) ?? null,
      method: (m.method as PaymentMethod | null) ?? null,
      notes: (m.notes as string | null) ?? null,
    });
    result.set(sid, inner);
  }
  return result;
}

export interface BillingOverviewRow {
  sponsorId: string;
  sponsorName: string;
  frequency: BillingFrequency;
  monthlyValue: number;
  unpaidCount: number;
  outstanding: number;
  latestPaid: boolean | null;
}

export interface BillingOverview {
  contractedMonthly: number;
  collected: number;
  outstanding: number;
  unpaidSponsors: number;
  rows: BillingOverviewRow[];
}

/** Portfolio billing view: per-sponsor period status + totals. */
export async function getBillingOverview(): Promise<BillingOverview> {
  const supabase = await createClient();
  const today = todayISO();

  const { data: sponsorsData } = await supabase
    .from("sponsors")
    .select("*")
    .neq("status", "archived")
    .not("contract_start_date", "is", null)
    .order("company_name", { ascending: true });
  const sponsors = (sponsorsData ?? []) as Sponsor[];

  const [values, marks] = await Promise.all([
    monthlyValueMap(supabase, sponsors),
    marksBySponsor(
      supabase,
      sponsors.map((s) => s.id),
    ),
  ]);

  let collected = 0;
  const rows: BillingOverviewRow[] = sponsors.map((s) => {
    const mv = values.get(s.id) ?? 0;
    const periods = generatePeriods(
      s.contract_start_date,
      s.billing_frequency,
      today,
      s.contract_end_date,
    );
    const periodRows = buildRows(periods, mv, marks.get(s.id) ?? new Map());
    const unpaid = periodRows.filter((p) => !p.paid);
    collected += periodRows
      .filter((p) => p.paid)
      .reduce((sum, p) => sum + p.amount, 0);
    return {
      sponsorId: s.id,
      sponsorName: s.company_name,
      frequency: s.billing_frequency,
      monthlyValue: mv,
      unpaidCount: unpaid.length,
      outstanding: unpaid.reduce((sum, p) => sum + p.amount, 0),
      latestPaid: periodRows.length ? periodRows[periodRows.length - 1].paid : null,
    };
  });

  const activeIds = new Set(
    sponsors.filter((s) => s.status === "active").map((s) => s.id),
  );

  return {
    contractedMonthly: rows
      .filter((r) => activeIds.has(r.sponsorId))
      .reduce((s, r) => s + r.monthlyValue, 0),
    collected,
    outstanding: rows.reduce((s, r) => s + r.outstanding, 0),
    unpaidSponsors: rows.filter((r) => r.outstanding > 0).length,
    rows,
  };
}

export interface SponsorBilling {
  sponsor: Sponsor;
  monthlyValue: number;
  rows: PeriodRow[];
  totalDue: number;
  totalPaid: number;
  outstanding: number;
}

/** One sponsor's full period ledger. */
export async function getSponsorBilling(
  sponsorId: string,
): Promise<SponsorBilling | null> {
  const supabase = await createClient();
  const { data: sponsor } = await supabase
    .from("sponsors")
    .select("*")
    .eq("id", sponsorId)
    .maybeSingle();
  if (!sponsor) return null;
  const s = sponsor as Sponsor;

  const values = await monthlyValueMap(supabase, [s]);
  const mv = values.get(s.id) ?? 0;
  const marks = (await marksBySponsor(supabase, [s.id])).get(s.id) ?? new Map();

  const periods = generatePeriods(
    s.contract_start_date,
    s.billing_frequency,
    todayISO(),
    s.contract_end_date,
  );
  const rows = buildRows(periods, mv, marks);

  const totalDue = rows.reduce((sum, r) => sum + r.amount, 0);
  const totalPaid = rows.filter((r) => r.paid).reduce((sum, r) => sum + r.amount, 0);

  return {
    sponsor: s,
    monthlyValue: mv,
    rows,
    totalDue,
    totalPaid,
    outstanding: totalDue - totalPaid,
  };
}

export interface MonthlyRevenue {
  month: string; // "YYYY-MM"
  billed: number;
  collected: number;
  outstanding: number;
}

/**
 * Revenue broken down by calendar month, from `fromMonth` through `throughMonth`
 * (inclusive). A billing period's amount is attributed to the month it starts in
 * (so a quarterly charge shows in its first month). "collected" counts periods
 * marked paid. Months with no billing show as zeros.
 */
export async function getMonthlyRevenue(
  fromMonth: string,
  throughMonth: string,
): Promise<MonthlyRevenue[]> {
  const supabase = await createClient();

  const { data: sponsorsData } = await supabase
    .from("sponsors")
    .select("*")
    .neq("status", "archived")
    .not("contract_start_date", "is", null);
  const sponsors = (sponsorsData ?? []) as Sponsor[];

  const [values, marks] = await Promise.all([
    monthlyValueMap(supabase, sponsors),
    marksBySponsor(
      supabase,
      sponsors.map((s) => s.id),
    ),
  ]);

  const bucket = new Map<string, { billed: number; collected: number }>();
  for (const s of sponsors) {
    const mv = values.get(s.id) ?? 0;
    const periods = generatePeriods(
      s.contract_start_date,
      s.billing_frequency,
      `${throughMonth}-28`,
      s.contract_end_date,
    );
    const rows = buildRows(periods, mv, marks.get(s.id) ?? new Map());
    for (const r of rows) {
      const m = r.periodStart.slice(0, 7);
      if (m < fromMonth || m > throughMonth) continue;
      const b = bucket.get(m) ?? { billed: 0, collected: 0 };
      b.billed += r.amount;
      if (r.paid) b.collected += r.amount;
      bucket.set(m, b);
    }
  }

  const series: MonthlyRevenue[] = [];
  let cur = `${fromMonth}-01`;
  // Guard against a bad range.
  for (let i = 0; i < 240 && cur.slice(0, 7) <= throughMonth; i++) {
    const m = cur.slice(0, 7);
    const b = bucket.get(m) ?? { billed: 0, collected: 0 };
    series.push({
      month: m,
      billed: Math.round(b.billed * 100) / 100,
      collected: Math.round(b.collected * 100) / 100,
      outstanding: Math.round((b.billed - b.collected) * 100) / 100,
    });
    cur = addMonths(cur, 1);
  }
  return series;
}
