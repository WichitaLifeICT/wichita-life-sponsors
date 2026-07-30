import { createClient } from "@/lib/supabase/server";
import type { Sponsor } from "@/types/database";
import { getMonthlyFulfillment, type MonthlyFulfillment } from "@/lib/data/deliverables";
import { getBillingOverview } from "@/lib/data/billing";
import { todayISO, daysUntil } from "@/lib/domain/dates";
import { CONTRACT_EXPIRY_WARNING_DAYS } from "@/lib/config";

const CLOSED = new Set(["published", "skipped", "canceled"]);

function addDaysISO(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const t = Date.UTC(y, m - 1, d) + days * 86_400_000;
  const dt = new Date(t);
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, "0")}-${String(dt.getUTCDate()).padStart(2, "0")}`;
}

export interface DashboardData {
  month: string;
  cards: {
    activeSponsors: number;
    contractedMonthly: number;
    outstanding: number;
    dueThisWeek: number;
    unscheduledThisMonth: number;
    missingAssets: number;
    expiring60: number;
    openInventory: number;
  };
  fulfillment: MonthlyFulfillment;
  revenue: { contracted: number; collected: number; outstanding: number };
  needsAttention: {
    pastDue: number;
    unpaidSponsors: number;
    missingAssetsUpcoming: number;
    expiring: { id: string; name: string; days: number }[];
    noPackage: { id: string; name: string }[];
  };
  thisWeek: {
    slots: { id: string; title: string; date: string; sponsors: string[] }[];
    due: { id: string; sponsorId: string; label: string; date: string }[];
  };
}

export async function getDashboardData(month: string): Promise<DashboardData> {
  const supabase = await createClient();
  const today = todayISO();
  const weekEnd = addDaysISO(today, 7);
  const serviceMonth = `${month}-01`;

  const [
    fulfillment,
    billing,
    { data: sponsorsData },
    { data: subs },
    { data: monthDeliverables },
    { data: dueSoon },
    { data: slots },
    { data: assignments },
  ] = await Promise.all([
    getMonthlyFulfillment(serviceMonth),
    getBillingOverview(),
    supabase.from("sponsors").select("*"),
    supabase
      .from("sponsor_subscriptions")
      .select("sponsor_id, status")
      .eq("status", "active"),
    supabase
      .from("deliverables")
      .select("id, sponsor_id, deliverable_type, status, scheduled_date, asset_status")
      .eq("service_month", serviceMonth),
    supabase
      .from("deliverables")
      .select("id, sponsor_id, deliverable_type, status, due_date")
      .not("due_date", "is", null)
      .gte("due_date", today)
      .lte("due_date", weekEnd),
    supabase
      .from("content_slots")
      .select("id, title, slot_type, scheduled_date, capacity")
      .gte("scheduled_date", today)
      .lte("scheduled_date", weekEnd)
      .order("scheduled_date", { ascending: true }),
    supabase.from("deliverable_slot_assignments").select("content_slot_id, deliverable_id"),
  ]);

  const sponsors = (sponsorsData ?? []) as Sponsor[];
  const activeSponsors = sponsors.filter((s) => s.status === "active");
  const activeSubSponsorIds = new Set(
    (subs ?? []).map((s) => s.sponsor_id as string),
  );

  // Month deliverables aggregates
  const md = (monthDeliverables ?? []) as {
    id: string;
    sponsor_id: string;
    status: string;
    scheduled_date: string | null;
    asset_status: string;
  }[];
  const unscheduledThisMonth = md.filter(
    (d) => !d.scheduled_date && !CLOSED.has(d.status),
  ).length;
  const missingAssets = md.filter(
    (d) => d.asset_status === "missing" && !CLOSED.has(d.status),
  ).length;
  const missingAssetsUpcoming = md.filter(
    (d) =>
      d.scheduled_date &&
      d.scheduled_date >= today &&
      d.scheduled_date <= addDaysISO(today, 5) &&
      d.asset_status === "missing",
  ).length;

  // Open content inventory this month (slots in the month with spare capacity)
  const { data: monthSlots } = await supabase
    .from("content_slots")
    .select("id, capacity")
    .gte("scheduled_date", serviceMonth)
    .lte("scheduled_date", `${month}-31`);
  const assignCount = new Map<string, number>();
  for (const a of assignments ?? []) {
    const k = a.content_slot_id as string;
    assignCount.set(k, (assignCount.get(k) ?? 0) + 1);
  }
  const openInventory = (monthSlots ?? []).reduce(
    (sum, s) =>
      sum + Math.max(0, (s.capacity as number) - (assignCount.get(s.id as string) ?? 0)),
    0,
  );

  // Past-due deliverables (due date before today, not closed)
  const { data: pastDueRows } = await supabase
    .from("deliverables")
    .select("id, status, due_date")
    .not("due_date", "is", null)
    .lt("due_date", today);
  const pastDue = (pastDueRows ?? []).filter(
    (d) => !CLOSED.has(d.status as string),
  ).length;

  // Expiring contracts + sponsors with no package
  const expiring = activeSponsors
    .map((s) => ({ s, days: daysUntil(s.contract_end_date) }))
    .filter((x) => x.days !== null && x.days >= 0 && x.days <= CONTRACT_EXPIRY_WARNING_DAYS)
    .sort((a, b) => (a.days ?? 0) - (b.days ?? 0))
    .map((x) => ({ id: x.s.id, name: x.s.company_name, days: x.days as number }));
  const noPackage = activeSponsors
    .filter((s) => !activeSubSponsorIds.has(s.id))
    .map((s) => ({ id: s.id, name: s.company_name }));

  // This week
  const sponsorName = new Map(sponsors.map((s) => [s.id, s.company_name]));
  const assignmentsBySlot = new Map<string, string[]>();
  {
    const delIds = [...new Set((assignments ?? []).map((a) => a.deliverable_id as string))];
    const { data: delRows } = delIds.length
      ? await supabase.from("deliverables").select("id, sponsor_id").in("id", delIds)
      : { data: [] as { id: string; sponsor_id: string }[] };
    const sponsorByDel = new Map(
      (delRows ?? []).map((d) => [d.id as string, d.sponsor_id as string]),
    );
    for (const a of assignments ?? []) {
      const sid = sponsorByDel.get(a.deliverable_id as string);
      if (!sid) continue;
      const arr = assignmentsBySlot.get(a.content_slot_id as string) ?? [];
      arr.push(sponsorName.get(sid) ?? "Unknown");
      assignmentsBySlot.set(a.content_slot_id as string, arr);
    }
  }
  const weekSlots = (slots ?? []).map((s) => ({
    id: s.id as string,
    title: (s.title as string) || (s.slot_type as string),
    date: s.scheduled_date as string,
    sponsors: assignmentsBySlot.get(s.id as string) ?? [],
  }));
  const weekDue = (dueSoon ?? [])
    .filter((d) => !CLOSED.has(d.status as string))
    .map((d) => ({
      id: d.id as string,
      sponsorId: d.sponsor_id as string,
      label: sponsorName.get(d.sponsor_id as string) ?? "Unknown",
      date: d.due_date as string,
    }));

  return {
    month,
    cards: {
      activeSponsors: activeSponsors.length,
      contractedMonthly: billing.contractedMonthly,
      outstanding: billing.outstanding,
      dueThisWeek: weekDue.length,
      unscheduledThisMonth,
      missingAssets,
      expiring60: expiring.length,
      openInventory,
    },
    fulfillment,
    revenue: {
      contracted: billing.contractedMonthly,
      collected: billing.collected,
      outstanding: billing.outstanding,
    },
    needsAttention: {
      pastDue,
      unpaidSponsors: billing.unpaidSponsors,
      missingAssetsUpcoming,
      expiring,
      noPackage,
    },
    thisWeek: { slots: weekSlots, due: weekDue },
  };
}
