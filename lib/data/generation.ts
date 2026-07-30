import { createClient } from "@/lib/supabase/server";
import type { DeliverableType, Recurrence } from "@/types/database";
import { resolveEffectiveDeliverables } from "@/lib/domain/deliverable-rules";
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

/** Used by the run action: returns the concrete plan plus context for inserts. */
export async function computePlan(serviceMonth: string) {
  const ctx = await loadContext(serviceMonth);
  const plan = planGeneration(serviceMonth, ctx.subs, ctx.existing);
  return { plan, ctx };
}
