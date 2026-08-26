import { createClient } from "@/lib/supabase/server";
import type { ContentSlot, DeliverableType, Recurrence } from "@/types/database";
import { addMonths, toServiceMonth, monthsBetween } from "@/lib/domain/dates";
import { resolveEffectiveDeliverables } from "@/lib/domain/deliverable-rules";
import { recurrenceApplies } from "@/lib/domain/generation";

export type SlotFill = "empty" | "partial" | "full" | "overbooked";

export interface SlotAssignment {
  assignmentId: string;
  deliverableId: string;
  deliverableType: DeliverableType;
  sponsorId: string;
  sponsorName: string;
}

export interface SlotWithAssignments extends ContentSlot {
  assignments: SlotAssignment[];
  fill: SlotFill;
}

function fillState(count: number, capacity: number): SlotFill {
  if (count === 0) return "empty";
  if (count > capacity) return "overbooked";
  if (count === capacity) return "full";
  return "partial";
}

/** First and last day (inclusive) of a "YYYY-MM" month. */
export function monthRange(month: string): { start: string; end: string } {
  const start = `${month}-01`;
  const nextStart = addMonths(start, 1); // first of next month
  const [y, m] = nextStart.split("-").map(Number);
  const lastDay = new Date(Date.UTC(y, m - 1, 0)).getUTCDate();
  return { start, end: `${month}-${String(lastDay).padStart(2, "0")}` };
}

export interface SlotFilters {
  type?: string;
  group?: "newsletter" | "social";
  fill?: "open" | "filled";
}

const SOCIAL_TYPES = new Set([
  "instagram_post",
  "instagram_story",
  "instagram_reel",
  "facebook_post",
]);

/** Content slots within a date range, with their assigned deliverables. */
export async function getSlotsInRange(
  start: string,
  end: string,
  filters: SlotFilters = {},
): Promise<SlotWithAssignments[]> {
  const supabase = await createClient();

  let q = supabase
    .from("content_slots")
    .select("*")
    .gte("scheduled_date", start)
    .lte("scheduled_date", end)
    .order("scheduled_date", { ascending: true });
  if (filters.type) q = q.eq("deliverable_type", filters.type);

  const { data: slots } = await q;
  const slotRows = (slots ?? []) as ContentSlot[];
  if (slotRows.length === 0) return [];

  const slotIds = slotRows.map((s) => s.id);
  const { data: assignments } = await supabase
    .from("deliverable_slot_assignments")
    .select("id, deliverable_id, content_slot_id")
    .in("content_slot_id", slotIds);

  const deliverableIds = [
    ...new Set((assignments ?? []).map((a) => a.deliverable_id as string)),
  ];
  const [{ data: deliverables }, { data: sponsors }] = await Promise.all([
    deliverableIds.length
      ? supabase
          .from("deliverables")
          .select("id, deliverable_type, sponsor_id")
          .in("id", deliverableIds)
      : Promise.resolve({ data: [] as unknown[] }),
    supabase.from("sponsors").select("id, company_name"),
  ]);

  const delById = new Map(
    (deliverables ?? []).map((d) => [
      (d as { id: string }).id,
      d as { id: string; deliverable_type: DeliverableType; sponsor_id: string },
    ]),
  );
  const sponsorName = new Map(
    (sponsors ?? []).map((s) => [s.id as string, s.company_name as string]),
  );

  const bySlot = new Map<string, SlotAssignment[]>();
  for (const a of assignments ?? []) {
    const del = delById.get(a.deliverable_id as string);
    if (!del) continue;
    const arr = bySlot.get(a.content_slot_id as string) ?? [];
    arr.push({
      assignmentId: a.id as string,
      deliverableId: del.id,
      deliverableType: del.deliverable_type,
      sponsorId: del.sponsor_id,
      sponsorName: sponsorName.get(del.sponsor_id) ?? "Unknown",
    });
    bySlot.set(a.content_slot_id as string, arr);
  }

  let result: SlotWithAssignments[] = slotRows.map((s) => {
    const a = bySlot.get(s.id) ?? [];
    return { ...s, assignments: a, fill: fillState(a.length, s.capacity) };
  });

  if (filters.group === "newsletter") {
    result = result.filter(
      (s) => s.slot_type === "newsletter" || s.slot_type === "dedicated_email",
    );
  } else if (filters.group === "social") {
    result = result.filter((s) => SOCIAL_TYPES.has(s.slot_type));
  }
  if (filters.fill === "open") {
    result = result.filter((s) => s.assignments.length < s.capacity);
  } else if (filters.fill === "filled") {
    result = result.filter((s) => s.assignments.length >= s.capacity);
  }

  return result;
}

export interface InventoryStat {
  key: string;
  label: string;
  filled: number; // spots taken
  open: number; // spots still available
  capacity: number; // total spots
}

/**
 * Month inventory summary by ad type: how many Email Headline / Email Feature /
 * social spots exist, and how many are filled vs still open. Independent of the
 * calendar's filter chips so the top-of-page totals stay stable.
 */
export async function getInventorySummary(
  start: string,
  end: string,
): Promise<InventoryStat[]> {
  const supabase = await createClient();
  const { data: slots } = await supabase
    .from("content_slots")
    .select("id, deliverable_type, capacity")
    .gte("scheduled_date", start)
    .lte("scheduled_date", end);
  const slotRows = (slots ?? []) as {
    id: string;
    deliverable_type: string | null;
    capacity: number;
  }[];

  const slotIds = slotRows.map((s) => s.id);
  const assignCount = new Map<string, number>();
  if (slotIds.length > 0) {
    const { data: assigns } = await supabase
      .from("deliverable_slot_assignments")
      .select("content_slot_id")
      .in("content_slot_id", slotIds);
    for (const a of assigns ?? []) {
      const k = a.content_slot_id as string;
      assignCount.set(k, (assignCount.get(k) ?? 0) + 1);
    }
  }

  const cats: { key: string; label: string; types: Set<string> }[] = [
    { key: "headline", label: "Email — Headline", types: new Set(["newsletter_headline"]) },
    { key: "feature", label: "Email — Feature", types: new Set(["newsletter_feature"]) },
    {
      key: "social",
      label: "Social posts",
      types: new Set(["social_post", "social_story", "social_reel"]),
    },
  ];

  return cats.map((c) => {
    let filled = 0;
    let capacity = 0;
    for (const s of slotRows) {
      if (!s.deliverable_type || !c.types.has(s.deliverable_type)) continue;
      capacity += s.capacity;
      filled += assignCount.get(s.id) ?? 0;
    }
    return {
      key: c.key,
      label: c.label,
      filled,
      open: Math.max(0, capacity - filled),
      capacity,
    };
  });
}

export interface CalendarBlockRow {
  id: string;
  block_date: string;
  name: string;
}

/** Day blocks (holidays / off-days) within a date range. */
export async function getBlocksInRange(
  start: string,
  end: string,
): Promise<CalendarBlockRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("calendar_blocks")
    .select("id, block_date, name")
    .gte("block_date", start)
    .lte("block_date", end)
    .order("block_date", { ascending: true });
  return (data ?? []).map((b) => ({
    id: b.id as string,
    block_date: b.block_date as string,
    name: b.name as string,
  }));
}

export interface UnscheduledDeliverable {
  id: string;
  deliverable_type: DeliverableType;
  sponsorId: string;
  sponsorName: string;
  service_month: string;
  due_date: string | null;
}

const CLOSED = new Set(["published", "skipped", "canceled"]);

/** Deliverables in a month that still need scheduling (no scheduled date). */
export async function getUnscheduledDeliverables(
  month: string,
): Promise<UnscheduledDeliverable[]> {
  const supabase = await createClient();
  const { data: deliverables } = await supabase
    .from("deliverables")
    .select("id, deliverable_type, sponsor_id, service_month, due_date, status")
    .eq("service_month", `${month}-01`)
    .is("scheduled_date", null)
    .order("due_date", { ascending: true, nullsFirst: false });

  const rows = (deliverables ?? []).filter(
    (d) => !CLOSED.has(d.status as string),
  );
  if (rows.length === 0) return [];

  const { data: sponsors } = await supabase
    .from("sponsors")
    .select("id, company_name");
  const sponsorName = new Map(
    (sponsors ?? []).map((s) => [s.id as string, s.company_name as string]),
  );

  return rows.map((d) => ({
    id: d.id as string,
    deliverable_type: d.deliverable_type as DeliverableType,
    sponsorId: d.sponsor_id as string,
    sponsorName: sponsorName.get(d.sponsor_id as string) ?? "Unknown",
    service_month: d.service_month as string,
    due_date: (d.due_date as string | null) ?? null,
  }));
}

/**
 * Deliverables owed in an EARLIER month that are still unscheduled and open —
 * e.g. annual or quarterly items generated in their start month that you want to
 * place on a later month's calendar. Excludes archived sponsors. This keeps
 * annual social posts assignable all year, not just in their service month.
 */
export async function getCarryInUnscheduled(
  month: string,
): Promise<UnscheduledDeliverable[]> {
  const supabase = await createClient();
  const { data: deliverables } = await supabase
    .from("deliverables")
    .select("id, deliverable_type, sponsor_id, service_month, due_date, status")
    .lt("service_month", `${month}-01`)
    .is("scheduled_date", null)
    .order("service_month", { ascending: true });

  const rows = (deliverables ?? []).filter(
    (d) => !CLOSED.has(d.status as string),
  );
  if (rows.length === 0) return [];

  const { data: sponsors } = await supabase
    .from("sponsors")
    .select("id, company_name, status");
  const activeName = new Map(
    (sponsors ?? [])
      .filter((s) => s.status !== "archived")
      .map((s) => [s.id as string, s.company_name as string]),
  );

  return rows
    .filter((d) => activeName.has(d.sponsor_id as string))
    .map((d) => ({
      id: d.id as string,
      deliverable_type: d.deliverable_type as DeliverableType,
      sponsorId: d.sponsor_id as string,
      sponsorName: activeName.get(d.sponsor_id as string) ?? "Unknown",
      service_month: d.service_month as string,
      due_date: (d.due_date as string | null) ?? null,
    }));
}

/**
 * Deliverables owed in a LATER month that are still unscheduled — so you can
 * pull a future ad into an earlier month (e.g. run a September ad in August).
 * Limited to the next several months. Excludes archived sponsors.
 */
export async function getPullForwardUnscheduled(
  month: string,
): Promise<UnscheduledDeliverable[]> {
  const supabase = await createClient();
  const windowEnd = addMonths(`${month}-01`, 6); // up to 6 months ahead
  const { data: deliverables } = await supabase
    .from("deliverables")
    .select("id, deliverable_type, sponsor_id, service_month, due_date, status")
    .gt("service_month", `${month}-01`)
    .lte("service_month", windowEnd)
    .is("scheduled_date", null)
    .order("service_month", { ascending: true });

  const rows = (deliverables ?? []).filter(
    (d) => !CLOSED.has(d.status as string),
  );
  if (rows.length === 0) return [];

  const { data: sponsors } = await supabase
    .from("sponsors")
    .select("id, company_name, status");
  const activeName = new Map(
    (sponsors ?? [])
      .filter((s) => s.status !== "archived")
      .map((s) => [s.id as string, s.company_name as string]),
  );

  return rows
    .filter((d) => activeName.has(d.sponsor_id as string))
    .map((d) => ({
      id: d.id as string,
      deliverable_type: d.deliverable_type as DeliverableType,
      sponsorId: d.sponsor_id as string,
      sponsorName: activeName.get(d.sponsor_id as string) ?? "Unknown",
      service_month: d.service_month as string,
      due_date: (d.due_date as string | null) ?? null,
    }));
}

export interface SponsorScheduling {
  sponsorId: string;
  sponsorName: string;
  required: number; // contracted from the package/subscription
  done: number; // scheduled or published (includes extras)
  over: number; // done beyond required (extra placements)
  remaining: number; // contracted deliverables not yet placed
  byType: { deliverable_type: DeliverableType; required: number; done: number }[];
  unscheduled: UnscheduledDeliverable[];
}

type RuleInput = {
  deliverable_type: DeliverableType;
  quantity: number;
  recurrence: Recurrence;
};

/**
 * Per-sponsor scheduling status for a month: how many deliverables are required
 * (the contracted quantity from the package + overrides, applied for this month)
 * vs done (actual deliverables scheduled or published). Extra / good-will
 * placements beyond the contract push "done" past "required" — e.g. 3/2. Sorted
 * so sponsors that still owe scheduling come first.
 */
export async function getMonthlySchedulingBySponsor(
  month: string,
): Promise<SponsorScheduling[]> {
  const supabase = await createClient();
  const targetMonth = `${month}-01`;

  const { data: deliverables } = await supabase
    .from("deliverables")
    .select(
      "id, deliverable_type, sponsor_id, scheduled_date, status, service_month, due_date",
    )
    .eq("service_month", targetMonth);

  const rows = (deliverables ?? []).filter(
    (d) => !["skipped", "canceled"].includes(d.status as string),
  );

  const { data: sponsors } = await supabase
    .from("sponsors")
    .select("id, company_name");
  const sponsorName = new Map(
    (sponsors ?? []).map((s) => [s.id as string, s.company_name as string]),
  );

  const isScheduled = (d: { scheduled_date: unknown; status: unknown }) =>
    d.scheduled_date != null || d.status === "published";

  const groups = new Map<string, SponsorScheduling>();
  const ensure = (sid: string): SponsorScheduling => {
    let g = groups.get(sid);
    if (!g) {
      g = {
        sponsorId: sid,
        sponsorName: sponsorName.get(sid) ?? "Unknown",
        required: 0,
        done: 0,
        over: 0,
        remaining: 0,
        byType: [],
        unscheduled: [],
      };
      groups.set(sid, g);
    }
    return g;
  };

  // Actual deliverables: count "done" (scheduled/published) and list unscheduled.
  for (const d of rows) {
    const g = ensure(d.sponsor_id as string);
    const sched = isScheduled(d);
    const type = d.deliverable_type as DeliverableType;
    if (!sched) {
      g.unscheduled.push({
        id: d.id as string,
        deliverable_type: type,
        sponsorId: d.sponsor_id as string,
        sponsorName: g.sponsorName,
        service_month: d.service_month as string,
        due_date: (d.due_date as string | null) ?? null,
      });
    }
    const t = g.byType.find((x) => x.deliverable_type === type);
    if (t) {
      if (sched) t.done += 1;
    } else {
      g.byType.push({ deliverable_type: type, required: 0, done: sched ? 1 : 0 });
    }
  }

  // Required: the contracted quantity per type for this month, from each
  // sponsor's active subscription (package rules merged with overrides).
  const sponsorIds = [...groups.keys()];
  if (sponsorIds.length > 0) {
    const { data: subs } = await supabase
      .from("sponsor_subscriptions")
      .select("id, sponsor_id, package_id, start_date, end_date")
      .eq("status", "active")
      .in("sponsor_id", sponsorIds);
    const subList = subs ?? [];
    const pkgIds = [
      ...new Set(subList.map((s) => s.package_id).filter(Boolean) as string[]),
    ];
    const subIds = subList.map((s) => s.id as string);

    const [{ data: rules }, { data: overrides }] = await Promise.all([
      pkgIds.length
        ? supabase
            .from("package_deliverable_rules")
            .select("package_id, deliverable_type, quantity, recurrence")
            .in("package_id", pkgIds)
        : Promise.resolve({ data: [] as unknown[] }),
      subIds.length
        ? supabase
            .from("subscription_deliverable_overrides")
            .select("sponsor_subscription_id, deliverable_type, quantity, recurrence")
            .in("sponsor_subscription_id", subIds)
        : Promise.resolve({ data: [] as unknown[] }),
    ]);

    const rulesByPkg = new Map<string, RuleInput[]>();
    for (const r of (rules ?? []) as Record<string, unknown>[]) {
      const key = r.package_id as string;
      const arr = rulesByPkg.get(key) ?? [];
      arr.push({
        deliverable_type: r.deliverable_type as DeliverableType,
        quantity: r.quantity as number,
        recurrence: r.recurrence as Recurrence,
      });
      rulesByPkg.set(key, arr);
    }
    const ovBySub = new Map<string, RuleInput[]>();
    for (const o of (overrides ?? []) as Record<string, unknown>[]) {
      const key = o.sponsor_subscription_id as string;
      const arr = ovBySub.get(key) ?? [];
      arr.push({
        deliverable_type: o.deliverable_type as DeliverableType,
        quantity: o.quantity as number,
        recurrence: o.recurrence as Recurrence,
      });
      ovBySub.set(key, arr);
    }

    for (const sub of subList) {
      const g = groups.get(sub.sponsor_id as string);
      if (!g || !sub.start_date) continue;
      const startMonth = toServiceMonth(sub.start_date as string);
      const monthsSince = monthsBetween(startMonth, targetMonth);
      if (monthsSince < 0) continue;
      if (
        sub.end_date &&
        monthsBetween(targetMonth, toServiceMonth(sub.end_date as string)) < 0
      ) {
        continue;
      }
      const effective = resolveEffectiveDeliverables(
        rulesByPkg.get(sub.package_id as string) ?? [],
        ovBySub.get(sub.id as string) ?? [],
      );
      for (const e of effective) {
        if (e.quantity <= 0) continue;
        if (!recurrenceApplies(e.recurrence, monthsSince)) continue;
        const t = g.byType.find((x) => x.deliverable_type === e.deliverable_type);
        if (t) t.required += e.quantity;
        else
          g.byType.push({
            deliverable_type: e.deliverable_type,
            required: e.quantity,
            done: 0,
          });
      }
    }
  }

  for (const g of groups.values()) {
    g.required = g.byType.reduce((s, t) => s + t.required, 0);
    g.done = g.byType.reduce((s, t) => s + t.done, 0);
    g.over = g.byType.reduce((s, t) => s + Math.max(0, t.done - t.required), 0);
    g.remaining = g.byType.reduce(
      (s, t) => s + Math.max(0, t.required - t.done),
      0,
    );
  }

  return [...groups.values()].sort((a, b) => {
    const ai = a.remaining > 0 ? 1 : 0;
    const bi = b.remaining > 0 ? 1 : 0;
    if (ai !== bi) return bi - ai;
    return a.sponsorName.localeCompare(b.sponsorName);
  });
}

