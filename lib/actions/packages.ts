"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { getSessionContext } from "@/lib/data/session";
import { packageSchema, type PackageParsed } from "@/lib/validations/package";

export interface PackageActionState {
  error: string | null;
  fieldErrors?: Record<string, string[]>;
}

function parsePackageForm(formData: FormData) {
  let rules: unknown = [];
  try {
    rules = JSON.parse(String(formData.get("rules") ?? "[]"));
  } catch {
    rules = [];
  }
  const raw = {
    name: formData.get("name"),
    description: formData.get("description"),
    base_price: formData.get("base_price"),
    billing_frequency: formData.get("billing_frequency"),
    active: formData.get("active") === "on" || formData.get("active") === "true",
    rules,
  };
  return packageSchema.safeParse(raw);
}

async function replaceRules(
  supabase: Awaited<ReturnType<typeof createClient>>,
  orgId: string,
  packageId: string,
  parsed: PackageParsed,
) {
  // Deleting + re-inserting rules only changes FUTURE deliverable generation;
  // deliverables already created are separate rows and are never touched here.
  await supabase
    .from("package_deliverable_rules")
    .delete()
    .eq("package_id", packageId);

  if (parsed.rules.length > 0) {
    await supabase.from("package_deliverable_rules").insert(
      parsed.rules.map((r) => ({
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

export async function createPackage(
  _prev: PackageActionState,
  formData: FormData,
): Promise<PackageActionState> {
  const parsed = parsePackageForm(formData);
  if (!parsed.success) {
    return {
      error: "Please fix the highlighted fields.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }
  const session = await getSessionContext();
  if (!session?.organization) return { error: "Your session has expired. Please sign in again." };

  const supabase = await createClient();
  const { data: pkg, error } = await supabase
    .from("packages")
    .insert({
      organization_id: session.organization.id,
      name: parsed.data.name,
      description: parsed.data.description ?? null,
      base_price: parsed.data.base_price,
      billing_frequency: parsed.data.billing_frequency,
      active: parsed.data.active,
    })
    .select("id")
    .single();

  if (error || !pkg) return { error: "Could not create the package. Please try again." };

  await replaceRules(supabase, session.organization.id, pkg.id, parsed.data);

  revalidatePath("/packages");
  redirect("/packages");
}

export async function updatePackage(
  id: string,
  _prev: PackageActionState,
  formData: FormData,
): Promise<PackageActionState> {
  const parsed = parsePackageForm(formData);
  if (!parsed.success) {
    return {
      error: "Please fix the highlighted fields.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }
  const session = await getSessionContext();
  if (!session?.organization) return { error: "Your session has expired. Please sign in again." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("packages")
    .update({
      name: parsed.data.name,
      description: parsed.data.description ?? null,
      base_price: parsed.data.base_price,
      billing_frequency: parsed.data.billing_frequency,
      active: parsed.data.active,
    })
    .eq("id", id);

  if (error) return { error: "Could not save the package. Please try again." };

  await replaceRules(supabase, session.organization.id, id, parsed.data);

  revalidatePath("/packages");
  redirect("/packages");
}

/** Duplicate a package and its rules; opens the copy for editing. */
export async function duplicatePackage(id: string) {
  const session = await getSessionContext();
  if (!session?.organization) redirect("/packages");

  const supabase = await createClient();
  const { data: original } = await supabase
    .from("packages")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!original) redirect("/packages");

  const { data: copy } = await supabase
    .from("packages")
    .insert({
      organization_id: session.organization.id,
      name: `${original.name} (Copy)`,
      description: original.description,
      base_price: original.base_price,
      billing_frequency: original.billing_frequency,
      active: original.active,
    })
    .select("id")
    .single();

  if (copy) {
    const { data: rules } = await supabase
      .from("package_deliverable_rules")
      .select("deliverable_type, quantity, recurrence, notes")
      .eq("package_id", id);
    if (rules && rules.length > 0) {
      await supabase.from("package_deliverable_rules").insert(
        rules.map((r) => ({
          organization_id: session.organization!.id,
          package_id: copy.id,
          deliverable_type: r.deliverable_type,
          quantity: r.quantity,
          recurrence: r.recurrence,
          notes: r.notes,
        })),
      );
    }
    revalidatePath("/packages");
    redirect(`/packages/${copy.id}/edit`);
  }
  revalidatePath("/packages");
  redirect("/packages");
}

/** Activate or deactivate a package (does not affect existing subscriptions). */
export async function setPackageActive(id: string, active: boolean) {
  const supabase = await createClient();
  await supabase.from("packages").update({ active }).eq("id", id);
  revalidatePath("/packages");
}
