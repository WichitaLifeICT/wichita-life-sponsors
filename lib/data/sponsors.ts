import { createClient } from "@/lib/supabase/server";
import type {
  Sponsor,
  SponsorStatus,
  Invoice,
  Payment,
} from "@/types/database";
import {
  sponsorPaymentStatus,
  type SponsorPaymentStatus,
} from "@/lib/domain/billing";
import { effectiveMonthlyValue } from "@/lib/domain/revenue";
import { currentServiceMonth, todayISO, daysUntil } from "@/lib/domain/dates";
import { CONTRACT_EXPIRY_WARNING_DAYS } from "@/lib/config";

const INACTIVE_DELIVERABLE_STATUSES = new Set([
  "published",
  "skipped",
  "canceled",
]);

export interface EnrichedSponsor extends Sponsor {
  packageName: string | null;
  monthlyValue: number;
  paymentStatus: SponsorPaymentStatus;
  remainingThisMonth: number;
  nextScheduledDate: string | null;
  daysUntilExpiry: number | null;
}

export interface SponsorsSummary {
  total: number;
  activeCount: number;
  contractedMonthlyRevenue: number;
  unpaidCount: number;
  expiringSoonCount: number;
}

export interface SponsorFilters {
  q?: string;
  status?: SponsorStatus | "all";
  packageId?: string; // package uuid, "none", or "all"
  expiring?: boolean;
  payment?: SponsorPaymentStatus | "unpaid" | "all";
  sort?: string;
  page?: number;
  pageSize?: number;
}

const UNPAID_STATUSES = new Set<SponsorPaymentStatus>([
  "overdue",
  "partially_paid",
  "invoice_sent",
]);

export interface SponsorListResult {
  rows: EnrichedSponsor[];
  summary: SponsorsSummary;
  total: number;
  page: number;
  pageSize: number;
  packages: { id: string; name: string }[];
}

/** Load the sponsor list with all derived columns, filters, and summary cards. */
export async function getSponsorListData(
  filters: SponsorFilters = {},
): Promise<SponsorListResult> {
  const supabase = await createClient();
  const now = new Date();
  const serviceMonth = currentServiceMonth(now);
  const today = todayISO(now);

  // --- Base fetches (RLS scopes every query to the caller's organization) ---
  let sponsorQuery = supabase.from("sponsors").select("*");
  if (filters.q) {
    sponsorQuery = sponsorQuery.ilike("company_name", `%${filters.q}%`);
  }
  if (filters.status && filters.status !== "all") {
    sponsorQuery = sponsorQuery.eq("status", filters.status);
  }

  const [
    { data: sponsors },
    { data: packages },
    { data: subscriptions },
    { data: monthDeliverables },
    { data: upcoming },
    { data: invoices },
    { data: payments },
  ] = await Promise.all([
    sponsorQuery,
    supabase.from("packages").select("id, name, base_price, billing_frequency"),
    supabase
      .from("sponsor_subscriptions")
      .select("sponsor_id, package_id, custom_monthly_price, status")
      .eq("status", "active"),
    supabase
      .from("deliverables")
      .select("sponsor_id, status")
      .eq("service_month", serviceMonth),
    supabase
      .from("deliverables")
      .select("sponsor_id, scheduled_date, status")
      .not("scheduled_date", "is", null)
      .gte("scheduled_date", today),
    supabase
      .from("invoices")
      .select("id, sponsor_id, amount, status, due_date, invoice_date"),
    supabase.from("payments").select("invoice_id, amount"),
  ]);

  const sponsorList = (sponsors ?? []) as Sponsor[];
  const pkgMap = new Map(
    (packages ?? []).map((p) => [
      p.id as string,
      p as { id: string; name: string; base_price: number; billing_frequency: Sponsor["billing_frequency"] },
    ]),
  );
  const subBySponsor = new Map<string, { package_id: string | null; custom_monthly_price: number | null }>();
  for (const s of subscriptions ?? []) {
    if (!subBySponsor.has(s.sponsor_id as string)) {
      subBySponsor.set(s.sponsor_id as string, {
        package_id: s.package_id as string | null,
        custom_monthly_price: s.custom_monthly_price as number | null,
      });
    }
  }

  // Remaining deliverables this month, per sponsor.
  const remainingBySponsor = new Map<string, number>();
  for (const d of monthDeliverables ?? []) {
    if (INACTIVE_DELIVERABLE_STATUSES.has(d.status as string)) continue;
    const key = d.sponsor_id as string;
    remainingBySponsor.set(key, (remainingBySponsor.get(key) ?? 0) + 1);
  }

  // Next upcoming scheduled placement, per sponsor.
  const nextBySponsor = new Map<string, string>();
  for (const d of upcoming ?? []) {
    if (INACTIVE_DELIVERABLE_STATUSES.has(d.status as string)) continue;
    const key = d.sponsor_id as string;
    const date = d.scheduled_date as string;
    const cur = nextBySponsor.get(key);
    if (!cur || date < cur) nextBySponsor.set(key, date);
  }

  // Payments grouped by invoice, then invoices grouped by sponsor.
  const payByInvoice = new Map<string, Pick<Payment, "amount">[]>();
  for (const p of payments ?? []) {
    const key = p.invoice_id as string | null;
    if (!key) continue;
    const arr = payByInvoice.get(key) ?? [];
    arr.push({ amount: p.amount as number });
    payByInvoice.set(key, arr);
  }
  const invoicesBySponsor = new Map<string, Invoice[]>();
  for (const inv of invoices ?? []) {
    const key = inv.sponsor_id as string;
    const arr = invoicesBySponsor.get(key) ?? [];
    arr.push(inv as Invoice);
    invoicesBySponsor.set(key, arr);
  }

  // --- Enrich ---
  let rows: EnrichedSponsor[] = sponsorList.map((sponsor) => {
    const sub = subBySponsor.get(sponsor.id);
    const pkg = sub?.package_id ? pkgMap.get(sub.package_id) : undefined;

    const monthlyValue = effectiveMonthlyValue({
      sponsorMonthlyPrice: sponsor.monthly_price,
      sponsorBillingFrequency: sponsor.billing_frequency,
      subscriptionCustomMonthlyPrice: sub?.custom_monthly_price,
      packageBasePrice: pkg?.base_price,
      packageBillingFrequency: pkg?.billing_frequency ?? null,
    });

    const sponsorInvoices = invoicesBySponsor.get(sponsor.id) ?? [];
    const paymentStatus = sponsorPaymentStatus(
      sponsorInvoices,
      payByInvoice,
      now,
    );

    return {
      ...sponsor,
      packageName: pkg?.name ?? null,
      monthlyValue,
      paymentStatus,
      remainingThisMonth: remainingBySponsor.get(sponsor.id) ?? 0,
      nextScheduledDate: nextBySponsor.get(sponsor.id) ?? null,
      daysUntilExpiry: daysUntil(sponsor.contract_end_date, now),
    };
  });

  // --- Summary (computed over the org, before pagination) ---
  const summary: SponsorsSummary = {
    total: rows.length,
    activeCount: rows.filter((r) => r.status === "active").length,
    contractedMonthlyRevenue: rows
      .filter((r) => r.status === "active")
      .reduce((sum, r) => sum + r.monthlyValue, 0),
    unpaidCount: rows.filter((r) => UNPAID_STATUSES.has(r.paymentStatus)).length,
    expiringSoonCount: rows.filter(
      (r) =>
        r.status === "active" &&
        r.daysUntilExpiry !== null &&
        r.daysUntilExpiry >= 0 &&
        r.daysUntilExpiry <= CONTRACT_EXPIRY_WARNING_DAYS,
    ).length,
  };

  // --- JS-side filters (derived fields) ---
  if (filters.packageId && filters.packageId !== "all") {
    if (filters.packageId === "none") {
      rows = rows.filter((r) => !r.packageName);
    } else {
      const name = pkgMap.get(filters.packageId)?.name;
      rows = rows.filter((r) => r.packageName === name);
    }
  }
  if (filters.expiring) {
    rows = rows.filter(
      (r) =>
        r.daysUntilExpiry !== null &&
        r.daysUntilExpiry >= 0 &&
        r.daysUntilExpiry <= CONTRACT_EXPIRY_WARNING_DAYS,
    );
  }
  if (filters.payment && filters.payment !== "all") {
    if (filters.payment === "unpaid") {
      rows = rows.filter((r) => UNPAID_STATUSES.has(r.paymentStatus));
    } else {
      rows = rows.filter((r) => r.paymentStatus === filters.payment);
    }
  }

  // --- Sort ---
  rows = sortSponsors(rows, filters.sort ?? "company_asc");

  // --- Paginate ---
  const total = rows.length;
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = filters.pageSize ?? 25;
  const start = (page - 1) * pageSize;
  const paged = rows.slice(start, start + pageSize);

  return {
    rows: paged,
    summary,
    total,
    page,
    pageSize,
    packages: (packages ?? []).map((p) => ({
      id: p.id as string,
      name: p.name as string,
    })),
  };
}

// ---------------------------------------------------------------------------
// Sponsor detail
// ---------------------------------------------------------------------------
import type {
  Deliverable,
  Package,
  PackageDeliverableRule,
  SponsorSubscription,
  SubscriptionDeliverableOverride,
  SponsorAsset,
} from "@/types/database";
import { computeInvoiceStatus, invoiceBalance } from "@/lib/domain/billing";
import type { InvoiceStatus } from "@/types/database";

export interface InvoiceWithComputed extends Invoice {
  computedStatus: InvoiceStatus;
  paid: number;
  balance: number;
}

export interface SponsorDetail {
  sponsor: Sponsor;
  subscription: SponsorSubscription | null;
  pkg: Package | null;
  packageRules: PackageDeliverableRule[];
  overrides: SubscriptionDeliverableOverride[];
  monthlyValue: number;
  serviceMonth: string;
  owedThisMonth: number;
  completedThisMonth: number;
  upcoming: Deliverable[];
  invoices: InvoiceWithComputed[];
  payments: Payment[];
  paymentStatus: SponsorPaymentStatus;
  assets: SponsorAsset[];
  isCustomized: boolean;
}

/** Load one sponsor with everything the detail page needs. Returns null if not found. */
export async function getSponsorDetail(
  id: string,
): Promise<SponsorDetail | null> {
  const supabase = await createClient();
  const now = new Date();
  const serviceMonth = currentServiceMonth(now);
  const today = todayISO(now);

  const { data: sponsor } = await supabase
    .from("sponsors")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!sponsor) return null;

  const [
    { data: subs },
    { data: monthDeliverables },
    { data: upcoming },
    { data: invoices },
    { data: payments },
    { data: assets },
  ] = await Promise.all([
    supabase
      .from("sponsor_subscriptions")
      .select("*")
      .eq("sponsor_id", id)
      .order("start_date", { ascending: false }),
    supabase
      .from("deliverables")
      .select("*")
      .eq("sponsor_id", id)
      .eq("service_month", serviceMonth),
    supabase
      .from("deliverables")
      .select("*")
      .eq("sponsor_id", id)
      .not("scheduled_date", "is", null)
      .gte("scheduled_date", today)
      .order("scheduled_date", { ascending: true }),
    supabase
      .from("invoices")
      .select("*")
      .eq("sponsor_id", id)
      .order("invoice_date", { ascending: false }),
    supabase
      .from("payments")
      .select("*")
      .eq("sponsor_id", id)
      .order("payment_date", { ascending: false }),
    supabase
      .from("sponsor_assets")
      .select("*")
      .eq("sponsor_id", id)
      .order("created_at", { ascending: false }),
  ]);

  const subscription =
    ((subs ?? []).find((s) => s.status === "active") as SponsorSubscription) ??
    ((subs?.[0] as SponsorSubscription) ?? null);

  let pkg: Package | null = null;
  let packageRules: PackageDeliverableRule[] = [];
  let overrides: SubscriptionDeliverableOverride[] = [];

  if (subscription?.package_id) {
    const [{ data: pkgRow }, { data: rules }] = await Promise.all([
      supabase.from("packages").select("*").eq("id", subscription.package_id).maybeSingle(),
      supabase
        .from("package_deliverable_rules")
        .select("*")
        .eq("package_id", subscription.package_id),
    ]);
    pkg = (pkgRow as Package) ?? null;
    packageRules = (rules ?? []) as PackageDeliverableRule[];
  }
  if (subscription?.id) {
    const { data: ov } = await supabase
      .from("subscription_deliverable_overrides")
      .select("*")
      .eq("sponsor_subscription_id", subscription.id);
    overrides = (ov ?? []) as SubscriptionDeliverableOverride[];
  }

  const payByInvoice = new Map<string, Pick<Payment, "amount">[]>();
  for (const p of (payments ?? []) as Payment[]) {
    if (!p.invoice_id) continue;
    const arr = payByInvoice.get(p.invoice_id) ?? [];
    arr.push({ amount: p.amount });
    payByInvoice.set(p.invoice_id, arr);
  }

  const invoicesWithComputed: InvoiceWithComputed[] = (
    (invoices ?? []) as Invoice[]
  ).map((inv) => {
    const pays = payByInvoice.get(inv.id) ?? [];
    return {
      ...inv,
      computedStatus: computeInvoiceStatus(inv, pays, now),
      paid: pays.reduce((s, p) => s + (p.amount ?? 0), 0),
      balance: invoiceBalance(inv, pays),
    };
  });

  const month = (monthDeliverables ?? []) as Deliverable[];
  const completedThisMonth = month.filter(
    (d) => d.status === "published",
  ).length;
  const owedThisMonth = month.filter(
    (d) => !["skipped", "canceled"].includes(d.status),
  ).length;

  const monthlyValue = effectiveMonthlyValue({
    sponsorMonthlyPrice: (sponsor as Sponsor).monthly_price,
    sponsorBillingFrequency: (sponsor as Sponsor).billing_frequency,
    subscriptionCustomMonthlyPrice: subscription?.custom_monthly_price,
    packageBasePrice: pkg?.base_price,
    packageBillingFrequency: pkg?.billing_frequency ?? null,
  });

  return {
    sponsor: sponsor as Sponsor,
    subscription,
    pkg,
    packageRules,
    overrides,
    monthlyValue,
    serviceMonth,
    owedThisMonth,
    completedThisMonth,
    upcoming: (upcoming ?? []) as Deliverable[],
    invoices: invoicesWithComputed,
    payments: (payments ?? []) as Payment[],
    paymentStatus: sponsorPaymentStatus(
      (invoices ?? []) as Invoice[],
      payByInvoice,
      now,
    ),
    assets: (assets ?? []) as SponsorAsset[],
    isCustomized:
      overrides.length > 0 ||
      (subscription?.custom_monthly_price != null &&
        subscription.custom_monthly_price > 0),
  };
}

function sortSponsors(rows: EnrichedSponsor[], sort: string): EnrichedSponsor[] {
  const [field, dir] = sort.split("_");
  const sign = dir === "desc" ? -1 : 1;
  const cmp = (a: EnrichedSponsor, b: EnrichedSponsor) => {
    switch (field) {
      case "value":
        return (a.monthlyValue - b.monthlyValue) * sign;
      case "status":
        return a.status.localeCompare(b.status) * sign;
      case "end":
        return (
          (a.contract_end_date ?? "9999").localeCompare(
            b.contract_end_date ?? "9999",
          ) * sign
        );
      case "company":
      default:
        return a.company_name.localeCompare(b.company_name) * sign;
    }
  };
  return [...rows].sort(cmp);
}
