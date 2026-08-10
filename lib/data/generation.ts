import { createClient } from "@/lib/supabase/server";
import type { DeliverableType, Recurrence } from "@/types/database";
import { deliverableTypeLabel } from "@/lib/labels";
import { resolveEffectiveDeliverables } from "@/lib/domain/deliverable-rules";
import {
  currentServiceMonth,
  toServiceMonth,
  addMonths,
  monthsBetween,
} from "@/lib/domain/dates";
import {
  planGeneration,
  existingKeyFor,
  type GenerationSubscriptionInput,
  type GenerationPlan,
} from "@/lib/domain/generation";

interface GenerationContext {
  subs: GenerationSubscriptionInput[];
  existing: Set<string>;
  sponsorName: Map<string, string>;
  lastRunAt: string | null;
}

/** Assemble everything planGeneration needs for a service month. */
async function loadContext(serviceMonth: string): Promise<GenerationContext> {
  const supabase = await createClient();

  const [
    { data: subscriptions },
    { data: rules },
    { data: overrides },
    { data: existingRows },
    { data: sponsors },
    { data: runs },
  ] = await Promise.all([
    supabase
      .from("sponsor_subscriptions")
      .select(
        "id, sponsor_id, package_id, start_date, end_date, status, auto_generate_deliverables",
      )
      .eq("status", "active"),
    supabase
      .from("package_deliverable_rules")
      .select("package_id, deliverable_type, quantity, recurrence"),
    supabase
      .from("subscription_deliverable_overrides")
      .select("sponsor_subscription_id, deliverable_type, quantity, recurrence"),
    supabase
      .from("deliverables")
      .select("sponsor_subscription_id, deliverable_type, sequence")
      .eq("original_service_month", serviceMonth)
      .not("sponsor_subscription_id", "is", null)
      .not("sequence", "is", null),
    supabase.from("sponsors").select("id, company_name"),
    supabase
      .from("generation_runs")
      .select("created_at")
      .eq("service_month", serviceMonth)
      .order("created_at", { ascending: false })
      .limit(1),
  ]);

  const rulesByPackage = new Map<
    string,
    { deliverable_type: DeliverableType; quantity: number; recurrence: Recurrence }[]
  >();
  for (const r of rules ?? []) {
    const arr = rulesByPackage.get(r.package_id as string) ?? [];
    arr.push({
      deliverable_type: r.deliverable_type as DeliverableType,
      quantity: r.quantity as number,
      recurrence: r.recurrence as Recurrence,
    });
    rulesByPackage.set(r.package_id as string, arr);
  }

  const overridesBySub = new Map<
    string,
    { deliverable_type: DeliverableType; quantity: number; recurrence: Recurrence }[]
  >();
  for (const o of overrides ?? []) {
    const key = o.sponsor_subscription_id as string;
    const arr = overridesBySub.get(key) ?? [];
    arr.push({
      deliverable_type: o.deliverable_type as DeliverableType,
      quantity: o.quantity as number,
      recurrence: o.recurrence as Recurrence,
    });
    overridesBySub.set(key, arr);
  }

  const subs: GenerationSubscriptionInput[] = (subscriptions ?? []).map((s) => ({
    subscriptionId: s.id as string,
    sponsorId: s.sponsor_id as string,
    startDate: s.start_date as string,
    endDate: (s.end_date as string | null) ?? null,
    status: s.status as string,
    autoGenerate: s.auto_generate_deliverables as boolean,
    effective: resolveEffectiveDeliverables(
      rulesByPackage.get(s.package_id as string) ?? [],
      overridesBySub.get(s.id as string) ?? [],
    ).map((e) => ({
      deliverable_type: e.deliverable_type,
      quantity: e.quantity,
      recurrence: e.recurrence,
    })),
  }));

  const existing = new Set<string>();
  for (const row of existingRows ?? []) {
    existing.add(
      existingKeyFor(
        row.sponsor_subscription_id as string,
        row.deliverable_type as string,
        serviceMonth,
        row.sequence as number,
      ),
    );
  }

  const sponsorName = new Map<string, string>(
    (sponsors ?? []).map((s) => [s.id as string, s.company_name as string]),
  );

  return {
    subs,
    existing,
    sponsorName,
    lastRunAt: (runs?.[0]?.created_at as string | undefined) ?? null,
  };
}

export interface GenerationPreviewRow {
  sponsorId: string;
  sponsorName: string;
  byType: { deliverable_type: DeliverableType; count: number }[];
  total: number;
}

export interface GenerationPreview {
  rows: GenerationPreviewRow[];
  totalNew: number;
  skipped: number;
  lastRunAt: string | null;
}

/** Compute (without writing) what a generation run would create for a month. */
export async function getGenerationPreview(
  serviceMonth: string,
): Promise<GenerationPreview> {
  const ctx = await loadContext(serviceMonth);
  const plan = planGeneration(serviceMonth, ctx.subs, ctx.existing);
  return buildPreview(plan, ctx);
}

function buildPreview(
  plan: GenerationPlan,
  ctx: GenerationContext,
): GenerationPreview {
  const bySponsor = new Map<string, Map<DeliverableType, number>>();
  for (const item of plan.toCreate) {
    const m = bySponsor.get(item.sponsorId) ?? new Map();
    m.set(item.deliverable_type, (m.get(item.deliverable_type) ?? 0) + 1);
    bySponsor.set(item.sponsorId, m);
  }

  const rows: GenerationPreviewRow[] = [...bySponsor.entries()]
    .map(([sponsorId, typeMap]) => {
      const byType = [...typeMap.entries()].map(([deliverable_type, count]) => ({
        deliverable_type,
        count,
      }));
      return {
        sponsorId,
        sponsorName: ctx.sponsorName.get(sponsorId) ?? "Unknown sponsor",
        byType,
        total: byType.reduce((s, t) => s + t.count, 0),
      };
    })
    .sort((a, b) => a.sponsorName.localeCompare(b.sponsorName));

  return {
    rows,
    totalNew: plan.toCreate.length,
    skipped: plan.skipped,
    lastRunAt: ctx.lastRunAt,
  };
}

/**
 * Seed a sponsor's ANNUAL / ONE-TIME deliverables as a flexible pool — e.g.
 * "6 social posts over the year". Unlike monthly generation, these are owed for
 * the whole period and can be scheduled onto the calendar any time within it, so
 * they're created once per period (not per month) with flexible_schedule=true so
 * they never count as "behind". Idempotent: only missing sequences are added.
 * Returns the number created.
 */
export async function seedFlexibleDeliverables(
  orgId: string,
  userId: string | null,
  sponsorId: string,
): Promise<number> {
  const supabase = await createClient();

  const { data: sub } = await supabase
    .from("sponsor_subscriptions")
    .select("id, package_id, start_date, end_date, auto_generate_deliverables")
    .eq("sponsor_id", sponsorId)
    .eq("status", "active")
    .maybeSingle();
  if (!sub || !sub.auto_generate_deliverables || !sub.start_date) return 0;

  const [{ data: rules }, { data: overrides }] = await Promise.all([
    sub.package_id
      ? supabase
          .from("package_deliverable_rules")
          .select("deliverable_type, quantity, recurrence")
          .eq("package_id", sub.package_id)
      : Promise.resolve({ data: [] as unknown[] }),
    supabase
      .from("subscription_deliverable_overrides")
      .select("deliverable_type, quantity, recurrence")
      .eq("sponsor_subscription_id", sub.id),
  ]);

  const effective = resolveEffectiveDeliverables(
    (rules ?? []) as {
      deliverable_type: DeliverableType;
      quantity: number;
      recurrence: Recurrence;
    }[],
    (overrides ?? []) as {
      deliverable_type: DeliverableType;
      quantity: number;
      recurrence: Recurrence;
    }[],
  ).filter((e) => e.recurrence === "annually" || e.recurrence === "one_time");
  if (effective.length === 0) return 0;

  const current = currentServiceMonth();
  const startMonth = toServiceMonth(sub.start_date as string);
  const endMonth = sub.end_date ? toServiceMonth(sub.end_date as string) : null;

  const rows: Record<string, unknown>[] = [];
  for (const eff of effective) {
    if (eff.quantity <= 0) continue;

    // The month this period is "owed for": one-time -> the start month;
    // annual -> this contract year's anniversary (start + 12*year), not past
    // years. Future starts use the start month.
    let owedMonth = startMonth;
    if (eff.recurrence === "annually") {
      const since = monthsBetween(startMonth, current);
      if (since >= 12) {
        owedMonth = addMonths(startMonth, Math.floor(since / 12) * 12);
      }
    }
    if (endMonth && monthsBetween(owedMonth, endMonth) < 0) continue;

    const { data: existing } = await supabase
      .from("deliverables")
      .select("sequence")
      .eq("sponsor_subscription_id", sub.id)
      .eq("deliverable_type", eff.deliverable_type)
      .eq("original_service_month", owedMonth);
    const have = new Set(
      (existing ?? []).map((r) => r.sequence as number).filter((n) => n != null),
    );

    for (let seq = 1; seq <= eff.quantity; seq++) {
      if (have.has(seq)) continue;
      rows.push({
        organization_id: orgId,
        sponsor_id: sponsorId,
        sponsor_subscription_id: sub.id,
        deliverable_type: eff.deliverable_type,
        title: `${deliverableTypeLabel(eff.deliverable_type)} ${seq} of ${eff.quantity}`,
        service_month: owedMonth,
        original_service_month: owedMonth,
        sequence: seq,
        quantity_total: eff.quantity,
        status: "not_scheduled" as const,
        asset_status: "not_needed" as const,
        flexible_schedule: true,
      });
    }
  }

  if (rows.length > 0) {
    await supabase.from("deliverables").insert(rows);
    await supabase.from("generation_runs").insert({
      organization_id: orgId,
      service_month: current,
      run_by: userId,
      created_count: rows.length,
      skipped_count: 0,
    });
  }
  return rows.length;
}

/** Seed the flexible (annual / one-time) pool for every active sponsor. */
export async function seedFlexibleForAllSponsors(
  orgId: string,
  userId: string | null,
): Promise<number> {
  const supabase = await createClient();
  const { data: subs } = await supabase
    .from("sponsor_subscriptions")
    .select("sponsor_id")
    .eq("status", "active");
  const sponsorIds = [...new Set((subs ?? []).map((s) => s.sponsor_id as string))];
  let total = 0;
  for (const id of sponsorIds) {
    total += await seedFlexibleDeliverables(orgId, userId, id);
  }
  return total;
}

/** Used by the run action: returns the concrete plan plus context for inserts. */
export async function computePlan(serviceMonth: string) {
  const ctx = await loadContext(serviceMonth);
  const plan = planGeneration(serviceMonth, ctx.subs, ctx.existing);
  return { plan, ctx };
}

/**
 * Insert the missing deliverables for a service month and record a run.
 * Idempotent (only creates what the plan says is missing). Pass `sponsorId` to
 * restrict inserts to a single sponsor (used when a sponsor is saved, so its
 * deliverables appear automatically). Returns the number created.
 *
 * NOTE: no revalidate/redirect — callers own cache invalidation.
 */
export async function runGenerationForMonth(
  serviceMonth: string,
  orgId: string,
  userId: string | null,
  sponsorId?: string,
): Promise<number> {
  const { plan } = await computePlan(serviceMonth);
  const toCreate = sponsorId
    ? plan.toCreate.filter((d) => d.sponsorId === sponsorId)
    : plan.toCreate;

  const supabase = await createClient();
  if (toCreate.length > 0) {
    const rows = toCreate.map((d) => ({
      organization_id: orgId,
      sponsor_id: d.sponsorId,
      sponsor_subscription_id: d.subscriptionId,
      deliverable_type: d.deliverable_type,
      title: `${deliverableTypeLabel(d.deliverable_type)} ${d.sequence} of ${d.quantity_total}`,
      service_month: d.service_month,
      original_service_month: d.original_service_month,
      sequence: d.sequence,
      quantity_total: d.quantity_total,
      status: "not_scheduled" as const,
      asset_status: "missing" as const,
    }));
    await supabase.from("deliverables").insert(rows);
  }

  await supabase.from("generation_runs").insert({
    organization_id: orgId,
    service_month: serviceMonth,
    run_by: userId,
    created_count: toCreate.length,
    skipped_count: plan.skipped,
  });

  return toCreate.length;
}
