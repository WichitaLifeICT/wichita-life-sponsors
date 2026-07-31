"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { getSessionContext } from "@/lib/data/session";
import { computePlan } from "@/lib/data/generation";
import { deliverableTypeLabel } from "@/lib/labels";
import { toServiceMonth, addMonths } from "@/lib/domain/dates";

/**
 * Generate deliverables for a service month. Idempotent: only the rows the plan
 * says are missing are inserted, and a generation_runs record is written.
 */
export async function runGeneration(serviceMonth: string) {
  const session = await getSessionContext();
  if (!session?.organization) redirect("/login");
  const orgId = session.organization.id;

  const { plan } = await computePlan(serviceMonth);
  const supabase = await createClient();

  if (plan.toCreate.length > 0) {
    const rows = plan.toCreate.map((d) => ({
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
    run_by: session.userId,
    created_count: plan.toCreate.length,
    skipped_count: plan.skipped,
  });

  revalidatePath("/deliverables");
  redirect(`/deliverables?month=${serviceMonth.slice(0, 7)}`);
}

// ---------------------------------------------------------------------------
// Manual add
// ---------------------------------------------------------------------------
const manualSchema = z.object({
  sponsor_id: z.string().min(1, "Choose a sponsor."),
  deliverable_type: z.string().min(1),
  service_month: z.string().regex(/^\d{4}-\d{2}$/, "Choose a month."),
  title: z.string().trim().max(200).optional(),
  due_date: z
    .string()
    .optional()
    .transform((v) => (v ? v : null)),
  notes: z.string().trim().max(2000).optional(),
});

export interface ManualDeliverableState {
  error: string | null;
}

export async function addManualDeliverable(
  _prev: ManualDeliverableState,
  formData: FormData,
): Promise<ManualDeliverableState> {
  const parsed = manualSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the form." };
  }
  const session = await getSessionContext();
  if (!session?.organization) return { error: "Your session has expired." };

  const serviceMonth = `${parsed.data.service_month}-01`;
  const supabase = await createClient();
  const { error } = await supabase.from("deliverables").insert({
    organization_id: session.organization.id,
    sponsor_id: parsed.data.sponsor_id,
    sponsor_subscription_id: null,
    deliverable_type: parsed.data.deliverable_type,
    title: parsed.data.title || deliverableTypeLabel(parsed.data.deliverable_type),
    service_month: serviceMonth,
    original_service_month: serviceMonth,
    due_date: parsed.data.due_date,
    notes: parsed.data.notes ?? null,
    status: "not_scheduled",
    asset_status: "missing",
  });

  if (error) {
    console.error("addManualDeliverable failed:", error);
    const hint = /invalid input value for enum/i.test(error.message)
      ? " (Run migration 0003 in Supabase to enable the email ad-slot types.)"
      : "";
    return { error: `Could not add the deliverable: ${error.message}${hint}` };
  }

  const returnTo = String(formData.get("return_to") ?? "");
  revalidatePath("/deliverables");
  if (returnTo) {
    revalidatePath(returnTo);
    redirect(returnTo);
  }
  redirect(`/deliverables?month=${parsed.data.service_month}`);
}

// ---------------------------------------------------------------------------
// Carry forward
// ---------------------------------------------------------------------------
/**
 * Carry an unfinished deliverable into a later month. The service (fulfillment)
 * month moves forward; original_service_month is preserved, and the status is
 * set to carried_forward so it shows in that bucket.
 */
export async function carryForwardDeliverable(
  id: string,
  targetMonth?: string, // "YYYY-MM"; defaults to the month after its current service month
) {
  const supabase = await createClient();

  const { data: current } = await supabase
    .from("deliverables")
    .select("service_month")
    .eq("id", id)
    .maybeSingle();
  if (!current) redirect("/deliverables");

  const target = targetMonth
    ? `${targetMonth}-01`
    : addMonths(toServiceMonth(current.service_month as string), 1);

  await supabase
    .from("deliverables")
    .update({ service_month: target, status: "carried_forward" })
    .eq("id", id);

  revalidatePath("/deliverables");
  redirect(`/deliverables?month=${(current.service_month as string).slice(0, 7)}`);
}
