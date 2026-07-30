"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { getSessionContext } from "@/lib/data/session";
import { sponsorSchema, type SponsorParsed } from "@/lib/validations/sponsor";
import { todayISO } from "@/lib/domain/dates";

export interface SponsorActionState {
  error: string | null;
  fieldErrors?: Record<string, string[]>;
}

function parseForm(formData: FormData) {
  const raw: Record<string, unknown> = Object.fromEntries(formData.entries());
  // Checkboxes: present only when checked.
  raw.auto_generate_deliverables =
    formData.get("auto_generate_deliverables") === "on" ||
    formData.get("auto_generate_deliverables") === "true";
  raw.stripe_subscription =
    formData.get("stripe_subscription") === "on" ||
    formData.get("stripe_subscription") === "true";
  raw.save_as_package =
    formData.get("save_as_package") === "on" ||
    formData.get("save_as_package") === "true";
  // Inline deliverable rows arrive as a JSON string.
  try {
    raw.rules = JSON.parse(String(formData.get("rules") ?? "[]"));
  } catch {
    raw.rules = [];
  }
  return sponsorSchema.safeParse(raw);
}

function sponsorRow(orgId: string, v: SponsorParsed) {
  return {
    organization_id: orgId,
    company_name: v.company_name,
    status: v.status,
    website: v.website ?? null,
    industry: v.industry ?? null,
    primary_contact_name: v.primary_contact_name ?? null,
    primary_contact_email: v.primary_contact_email ?? null,
    primary_contact_phone: v.primary_contact_phone ?? null,
    billing_contact_name: v.billing_contact_name ?? null,
    billing_contact_email: v.billing_contact_email ?? null,
    notes: v.notes ?? null,
    contract_start_date: v.contract_start_date ?? null,
    contract_end_date: v.contract_end_date ?? null,
    monthly_price: v.monthly_price ?? null,
    billing_frequency: v.billing_frequency,
    payment_method: v.payment_method ?? null,
    stripe_subscription: v.stripe_subscription,
  };
}

/**
 * Ensure the sponsor's single active subscription reflects the chosen package.
 *  - a real package id  -> subscription on that package
 *  - "custom"           -> build deliverables inline (à la carte). Optionally
 *                          save those as a new reusable package (save_as_package).
 *  - undefined ("none") -> end the active subscription
 */
async function syncSubscription(
  supabase: Awaited<ReturnType<typeof createClient>>,
  orgId: string,
  sponsorId: string,
  v: SponsorParsed,
) {
  const { data: existing } = await supabase
    .from("sponsor_subscriptions")
    .select("id, status")
    .eq("sponsor_id", sponsorId)
    .eq("status", "active")
    .maybeSingle();

  if (!v.package_id) {
    if (existing) {
      await supabase
        .from("sponsor_subscriptions")
        .update({ status: "ended", end_date: todayISO() })
        .eq("id", existing.id);
    }
    return;
  }

  const isCustom = v.package_id === "custom";
  const savingPackage = isCustom && v.save_as_package && !!v.new_package_name;
  let packageId: string | null = isCustom ? null : v.package_id;

  // Optionally turn the inline deliverables into a reusable package.
  if (savingPackage) {
    const { data: pkg } = await supabase
      .from("packages")
      .insert({
        organization_id: orgId,
        name: v.new_package_name!,
        base_price: v.custom_monthly_price ?? 0,
        billing_frequency: v.billing_frequency,
        active: true,
      })
      .select("id")
      .single();
    packageId = pkg?.id ?? null;
    if (packageId && v.rules.length > 0) {
      await supabase.from("package_deliverable_rules").insert(
        v.rules.map((r) => ({
          organization_id: orgId,
          package_id: packageId,
          deliverable_type: r.deliverable_type,
          quantity: r.quantity,
          recurrence: r.recurrence,
          notes: r.notes ?? null,
        })),
      );
    }
  }

  const payload = {
    organization_id: orgId,
    sponsor_id: sponsorId,
    package_id: packageId,
    custom_monthly_price: v.custom_monthly_price ?? null,
    auto_generate_deliverables: v.auto_generate_deliverables,
    start_date: v.contract_start_date ?? todayISO(),
    end_date: v.contract_end_date ?? null,
    status: "active" as const,
  };

  let subscriptionId = existing?.id ?? null;
  if (existing) {
    await supabase.from("sponsor_subscriptions").update(payload).eq("id", existing.id);
  } else {
    const { data: sub } = await supabase
      .from("sponsor_subscriptions")
      .insert(payload)
      .select("id")
      .single();
    subscriptionId = sub?.id ?? null;
  }

  // À la carte (not saved as a package): store the inline rows as overrides so
  // generation picks them up. Replace any previous overrides.
  if (isCustom && !savingPackage && subscriptionId) {
    await supabase
      .from("subscription_deliverable_overrides")
      .delete()
      .eq("sponsor_subscription_id", subscriptionId);
    if (v.rules.length > 0) {
      await supabase.from("subscription_deliverable_overrides").insert(
        v.rules.map((r) => ({
          organization_id: orgId,
          sponsor_subscription_id: subscriptionId,
          deliverable_type: r.deliverable_type,
          quantity: r.quantity,
          recurrence: r.recurrence,
          notes: r.notes ?? null,
        })),
      );
    }
  }
}

export async function createSponsor(
  _prev: SponsorActionState,
  formData: FormData,
): Promise<SponsorActionState> {
  const parsed = parseForm(formData);
  if (!parsed.success) {
    return {
      error: "Please fix the highlighted fields.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const session = await getSessionContext();
  if (!session?.organization) return { error: "Your session has expired. Please sign in again." };

  const supabase = await createClient();
  const { data: inserted, error } = await supabase
    .from("sponsors")
    .insert(sponsorRow(session.organization.id, parsed.data))
    .select("id")
    .single();

  if (error || !inserted) {
    console.error("createSponsor failed:", error);
    return {
      error: error?.message
        ? `Could not create the sponsor: ${error.message}`
        : "Could not create the sponsor. Please try again.",
    };
  }

  await syncSubscription(supabase, session.organization.id, inserted.id, parsed.data);

  revalidatePath("/sponsors");
  redirect(`/sponsors/${inserted.id}`);
}

export async function updateSponsor(
  id: string,
  _prev: SponsorActionState,
  formData: FormData,
): Promise<SponsorActionState> {
  const parsed = parseForm(formData);
  if (!parsed.success) {
    return {
      error: "Please fix the highlighted fields.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const session = await getSessionContext();
  if (!session?.organization) return { error: "Your session has expired. Please sign in again." };

  const supabase = await createClient();
  const row = sponsorRow(session.organization.id, parsed.data);
  const { error } = await supabase.from("sponsors").update(row).eq("id", id);

  if (error) {
    console.error("updateSponsor failed:", error);
    return {
      error: error.message
        ? `Could not save changes: ${error.message}`
        : "Could not save changes. Please try again.",
    };
  }

  await syncSubscription(supabase, session.organization.id, id, parsed.data);

  revalidatePath("/sponsors");
  revalidatePath(`/sponsors/${id}`);
  redirect(`/sponsors/${id}`);
}

/** Archive a sponsor (soft, reversible — sets status to 'archived'). */
export async function archiveSponsor(id: string) {
  const supabase = await createClient();
  await supabase.from("sponsors").update({ status: "archived" }).eq("id", id);
  revalidatePath("/sponsors");
  revalidatePath(`/sponsors/${id}`);
  redirect("/sponsors");
}
