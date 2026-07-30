"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { getSessionContext } from "@/lib/data/session";
import { deliverableRuleSchema } from "@/lib/validations/package";

export interface SubscriptionActionState {
  error: string | null;
}

const payloadSchema = z.object({
  custom_monthly_price: z
    .union([z.string(), z.number()])
    .optional()
    .transform((v) => {
      if (v === undefined || v === "") return null;
      const n = typeof v === "number" ? v : Number(v);
      return Number.isFinite(n) && n >= 0 ? n : null;
    }),
  auto_generate_deliverables: z.coerce.boolean().default(true),
  rules: z.array(deliverableRuleSchema).default([]),
});

/**
 * Save a sponsor's customized package: the editor provides the DESIRED effective
 * deliverables; we diff against the package rules and store only the true
 * overrides (so "customized" stays meaningful). Also updates price + auto-generate.
 */
export async function updateSubscriptionOverrides(
  sponsorId: string,
  subscriptionId: string,
  _prev: SubscriptionActionState,
  formData: FormData,
): Promise<SubscriptionActionState> {
  let rules: unknown = [];
  try {
    rules = JSON.parse(String(formData.get("rules") ?? "[]"));
  } catch {
    rules = [];
  }

  const parsed = payloadSchema.safeParse({
    custom_monthly_price: formData.get("custom_monthly_price"),
    auto_generate_deliverables:
      formData.get("auto_generate_deliverables") === "on" ||
      formData.get("auto_generate_deliverables") === "true",
    rules,
  });
  if (!parsed.success) return { error: "Please check the deliverable rows." };

  const session = await getSessionContext();
  if (!session?.organization) return { error: "Your session has expired. Please sign in again." };
  const orgId = session.organization.id;

  const supabase = await createClient();

  const { data: sub } = await supabase
    .from("sponsor_subscriptions")
    .select("id, package_id")
    .eq("id", subscriptionId)
    .maybeSingle();
  if (!sub) return { error: "Subscription not found." };

  // Package base rules for diffing.
  const base = new Map<string, { quantity: number; recurrence: string }>();
  if (sub.package_id) {
    const { data: pkgRules } = await supabase
      .from("package_deliverable_rules")
      .select("deliverable_type, quantity, recurrence")
      .eq("package_id", sub.package_id);
    for (const r of pkgRules ?? []) {
      base.set(r.deliverable_type as string, {
        quantity: r.quantity as number,
        recurrence: r.recurrence as string,
      });
    }
  }

  const desired = new Map<string, { quantity: number; recurrence: string }>();
  for (const r of parsed.data.rules) {
    desired.set(r.deliverable_type, {
      quantity: r.quantity,
      recurrence: r.recurrence,
    });
  }

  const overrides: {
    organization_id: string;
    sponsor_subscription_id: string;
    deliverable_type: string;
    quantity: number;
    recurrence: string;
  }[] = [];

  const types = new Set([...base.keys(), ...desired.keys()]);
  for (const type of types) {
    const b = base.get(type);
    const d = desired.get(type);
    if (!d && b) {
      // Removed relative to package.
      overrides.push({
        organization_id: orgId,
        sponsor_subscription_id: subscriptionId,
        deliverable_type: type,
        quantity: 0,
        recurrence: b.recurrence,
      });
    } else if (d && !b) {
      // Added.
      overrides.push({
        organization_id: orgId,
        sponsor_subscription_id: subscriptionId,
        deliverable_type: type,
        quantity: d.quantity,
        recurrence: d.recurrence,
      });
    } else if (d && b && (d.quantity !== b.quantity || d.recurrence !== b.recurrence)) {
      // Changed quantity or recurrence.
      overrides.push({
        organization_id: orgId,
        sponsor_subscription_id: subscriptionId,
        deliverable_type: type,
        quantity: d.quantity,
        recurrence: d.recurrence,
      });
    }
  }

  // Replace overrides atomically-ish (delete then insert).
  await supabase
    .from("subscription_deliverable_overrides")
    .delete()
    .eq("sponsor_subscription_id", subscriptionId);
  if (overrides.length > 0) {
    await supabase.from("subscription_deliverable_overrides").insert(overrides);
  }

  await supabase
    .from("sponsor_subscriptions")
    .update({
      custom_monthly_price: parsed.data.custom_monthly_price,
      auto_generate_deliverables: parsed.data.auto_generate_deliverables,
    })
    .eq("id", subscriptionId);

  revalidatePath(`/sponsors/${sponsorId}`);
  redirect(`/sponsors/${sponsorId}`);
}
