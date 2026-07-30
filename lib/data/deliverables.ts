import { createClient } from "@/lib/supabase/server";
import type {
  Deliverable,
  DeliverableStatusHistory,
} from "@/types/database";
import { todayISO } from "@/lib/domain/dates";

export interface MonthlyFulfillment {
  total: number;
  published: number;
  scheduled: number;
  waitingOnAssets: number;
  notScheduled: number;
  carriedForward: number;
  inProgress: number; // drafting / ready_for_review / approved
  completionPct: number;
}

const IN_PROGRESS = new Set(["drafting", "ready_for_review", "approved"]);

/** Fulfillment summary for a service month. */
export async function getMonthlyFulfillment(
  serviceMonth: string,
): Promise<MonthlyFulfillment> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("deliverables")
    .select("status")
    .eq("service_month", serviceMonth);

  const rows = (data ?? []) as { status: string }[];
  const active = rows.filter((r) => r.status !== "canceled");
  const count = (s: string) => active.filter((r) => r.status === s).length;

  const total = active.length;
  const published = count("published");

  return {
    total,
    published,
    scheduled: count("scheduled"),
    waitingOnAssets: count("waiting_on_assets"),
    notScheduled: count("not_scheduled"),
    carriedForward: count("carried_forward"),
    inProgress: active.filter((r) => IN_PROGRESS.has(r.status)).length,
    completionPct: total > 0 ? Math.round((published / total) * 100) : 0,
  };
}

export interface MonthlyDeliverableRow extends Deliverable {
  sponsorName: string;
  assignedSlotLabel: string | null;
}

export interface DeliverableFilters {
  month?: string; // "YYYY-MM" or "all"
  sponsorId?: string;
  type?: string;
  status?: string;
  asset?: string;
  scheduled?: "scheduled" | "unscheduled";
  overdue?: boolean;
  carried?: boolean;
}

const CLOSED_STATUSES = new Set(["published", "skipped", "canceled"]);

/** Map deliverable_id -> "Slot type · date" for assigned content slots. */
async function loadAssignedSlots(
  supabase: Awaited<ReturnType<typeof createClient>>,
  deliverableIds: string[],
): Promise<Map<string, string>> {
  const result = new Map<string, string>();
  if (deliverableIds.length === 0) return result;

  const { data: assignments } = await supabase
    .from("deliverable_slot_assignments")
    .select("deliverable_id, content_slot_id")
    .in("deliverable_id", deliverableIds);
  if (!assignments || assignments.length === 0) return result;

  const slotIds = [...new Set(assignments.map((a) => a.content_slot_id as string))];
  const { data: slots } = await supabase
    .from("content_slots")
    .select("id, slot_type, title, scheduled_date")
    .in("id", slotIds);
  const slotById = new Map(
    (slots ?? []).map((s) => [
      s.id as string,
      `${(s.title as string) || (s.slot_type as string)} · ${s.scheduled_date as string}`,
    ]),
  );
  for (const a of assignments) {
    const label = slotById.get(a.content_slot_id as string);
    if (label) result.set(a.deliverable_id as string, label);
  }
  return result;
}

async function enrich(
  supabase: Awaited<ReturnType<typeof createClient>>,
  deliverables: Deliverable[],
): Promise<MonthlyDeliverableRow[]> {
  const { data: sponsors } = await supabase
    .from("sponsors")
    .select("id, company_name");
  const nameById = new Map(
    (sponsors ?? []).map((s) => [s.id as string, s.company_name as string]),
  );
  const slotByDeliverable = await loadAssignedSlots(
    supabase,
    deliverables.map((d) => d.id),
  );
  return deliverables.map((d) => ({
    ...d,
    sponsorName: nameById.get(d.sponsor_id) ?? "Unknown",
    assignedSlotLabel: slotByDeliverable.get(d.id) ?? null,
  }));
}

/** All deliverables for a service month (used by the fulfillment summary view). */
export async function getMonthlyDeliverables(
  serviceMonth: string,
): Promise<MonthlyDeliverableRow[]> {
  return getDeliverables({ month: serviceMonth.slice(0, 7) });
}

/** Flexible deliverable query for the workspace (filters + enrichment). */
export async function getDeliverables(
  filters: DeliverableFilters,
): Promise<MonthlyDeliverableRow[]> {
  const supabase = await createClient();

  let q = supabase.from("deliverables").select("*");
  if (filters.month && filters.month !== "all") {
    q = q.eq("service_month", `${filters.month}-01`);
  }
  if (filters.sponsorId) q = q.eq("sponsor_id", filters.sponsorId);
  if (filters.type) q = q.eq("deliverable_type", filters.type);
  if (filters.status) q = q.eq("status", filters.status);
  if (filters.asset) q = q.eq("asset_status", filters.asset);
  if (filters.scheduled === "scheduled") q = q.not("scheduled_date", "is", null);
  if (filters.scheduled === "unscheduled") q = q.is("scheduled_date", null);

  q = q.order("due_date", { ascending: true, nullsFirst: false });

  const { data } = await q;
  let rows = (data ?? []) as Deliverable[];

  if (filters.overdue) {
    const today = todayISO();
    rows = rows.filter(
      (d) => d.due_date && d.due_date < today && !CLOSED_STATUSES.has(d.status),
    );
  }
  if (filters.carried) {
    rows = rows.filter((d) => d.original_service_month !== d.service_month);
  }

  return enrich(supabase, rows);
}

export interface DeliverableDetail {
  deliverable: Deliverable;
  sponsorName: string;
  packageName: string | null;
  assignedSlotLabel: string | null;
  history: (DeliverableStatusHistory & { changedByName: string | null })[];
}

/** One deliverable with sponsor, package, assigned slot, and status history. */
export async function getDeliverableDetail(
  id: string,
): Promise<DeliverableDetail | null> {
  const supabase = await createClient();

  const { data: deliverable } = await supabase
    .from("deliverables")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!deliverable) return null;
  const d = deliverable as Deliverable;

  const [{ data: sponsor }, { data: history }, slotMap] = await Promise.all([
    supabase.from("sponsors").select("company_name").eq("id", d.sponsor_id).maybeSingle(),
    supabase
      .from("deliverable_status_history")
      .select("*")
      .eq("deliverable_id", id)
      .order("changed_at", { ascending: false }),
    loadAssignedSlots(supabase, [id]),
  ]);

  let packageName: string | null = null;
  if (d.sponsor_subscription_id) {
    const { data: sub } = await supabase
      .from("sponsor_subscriptions")
      .select("package_id")
      .eq("id", d.sponsor_subscription_id)
      .maybeSingle();
    if (sub?.package_id) {
      const { data: pkg } = await supabase
        .from("packages")
        .select("name")
        .eq("id", sub.package_id)
        .maybeSingle();
      packageName = (pkg?.name as string) ?? null;
    }
  }

  // Resolve changed_by names.
  const changerIds = [
    ...new Set(
      ((history ?? []) as DeliverableStatusHistory[])
        .map((h) => h.changed_by)
        .filter((x): x is string => !!x),
    ),
  ];
  const nameById = new Map<string, string>();
  if (changerIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", changerIds);
    for (const p of profiles ?? [])
      nameById.set(p.id as string, (p.full_name as string) ?? "");
  }

  return {
    deliverable: d,
    sponsorName: (sponsor?.company_name as string) ?? "Unknown",
    packageName,
    assignedSlotLabel: slotMap.get(id) ?? null,
    history: ((history ?? []) as DeliverableStatusHistory[]).map((h) => ({
      ...h,
      changedByName: h.changed_by ? nameById.get(h.changed_by) ?? null : null,
    })),
  };
}

