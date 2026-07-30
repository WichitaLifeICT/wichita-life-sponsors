import { createClient } from "@/lib/supabase/server";
import type { ContentSlot, DeliverableType } from "@/types/database";
import { addMonths } from "@/lib/domain/dates";

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
  if (filters.type) q = q.eq("slot_type", filters.type);

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

export interface SponsorScheduling {
  sponsorId: string;
  sponsorName: string;
  owed: number;
  scheduled: number;
  remaining: number;
  byType: { deliverable_type: DeliverableType; owed: number; scheduled: number }[];
  unscheduled: UnscheduledDeliverable[];
}

/**
 * Per-sponsor scheduling status for a month: how many deliverables are owed vs
 * already scheduled (or published), plus the specific rows still needing a slot.
 * Sorted so sponsors that still need scheduling come first.
 */
export async function getMonthlySchedulingBySponsor(
  month: string,
): Promise<SponsorScheduling[]> {
  const supabase = await createClient();
  const { data: deliverables } = await supabase
    .from("deliverables")
    .select(
      "id, deliverable_type, sponsor_id, scheduled_date, status, service_month, due_date",
    )
    .eq("service_month", `${month}-01`);

  const rows = (deliverables ?? []).filter(
    (d) => !["skipped", "canceled"].includes(d.status as string),
  );
  if (rows.length === 0) return [];

  const { data: sponsors } = await supabase
    .from("sponsors")
    .select("id, company_name");
  const sponsorName = new Map(
    (sponsors ?? []).map((s) => [s.id as string, s.company_name as string]),
  );

  const isScheduled = (d: { scheduled_date: unknown; status: unknown }) =>
    d.scheduled_date != null || d.status === "published";

  const groups = new Map<string, SponsorScheduling>();
  for (const d of rows) {
    const sid = d.sponsor_id as string;
    let g = groups.get(sid);
    if (!g) {
      g = {
        sponsorId: sid,
        sponsorName: sponsorName.get(sid) ?? "Unknown",
        owed: 0,
        scheduled: 0,
        remaining: 0,
        byType: [],
        unscheduled: [],
      };
      groups.set(sid, g);
    }
    g.owed += 1;
    const sched = isScheduled(d);
    if (sched) g.scheduled += 1;
    else {
      g.remaining += 1;
      g.unscheduled.push({
        id: d.id as string,
        deliverable_type: d.deliverable_type as DeliverableType,
        sponsorId: sid,
        sponsorName: g.sponsorName,
        service_month: d.service_month as string,
        due_date: (d.due_date as string | null) ?? null,
      });
    }
    const t = g.byType.find((x) => x.deliverable_type === d.deliverable_type);
    if (t) {
      t.owed += 1;
      if (sched) t.scheduled += 1;
    } else {
      g.byType.push({
        deliverable_type: d.deliverable_type as DeliverableType,
        owed: 1,
        scheduled: sched ? 1 : 0,
      });
    }
  }

  return [...groups.values()].sort((a, b) => {
    const ai = a.remaining > 0 ? 1 : 0;
    const bi = b.remaining > 0 ? 1 : 0;
    if (ai !== bi) return bi - ai;
    return a.sponsorName.localeCompare(b.sponsorName);
  });
}

