"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { getSessionContext } from "@/lib/data/session";

export interface DistActionState {
  error: string | null;
}

async function org() {
  const session = await getSessionContext();
  return session?.organization?.id ?? null;
}

function s(formData: FormData, k: string): string | null {
  const v = formData.get(k);
  const t = typeof v === "string" ? v.trim() : "";
  return t === "" ? null : t;
}
function n(formData: FormData, k: string): number {
  const v = Number(formData.get(k));
  return Number.isFinite(v) && v >= 0 ? v : 0;
}

// ---- Locations --------------------------------------------------------------
export async function createLocation(
  _p: DistActionState,
  formData: FormData,
): Promise<DistActionState> {
  const name = s(formData, "name");
  if (!name) return { error: "Location name is required." };
  const orgId = await org();
  if (!orgId) return { error: "Session expired." };
  const supabase = await createClient();
  const { error } = await supabase.from("distribution_locations").insert({
    organization_id: orgId,
    name,
    contact_name: s(formData, "contact_name"),
    contact_email: s(formData, "contact_email"),
    phone: s(formData, "phone"),
    address: s(formData, "address"),
    notes: s(formData, "notes"),
  });
  if (error) return { error: "Could not save the location." };
  revalidatePath("/distribution");
  redirect("/distribution?tab=locations");
}

export async function updateLocation(
  id: string,
  _p: DistActionState,
  formData: FormData,
): Promise<DistActionState> {
  const name = s(formData, "name");
  if (!name) return { error: "Location name is required." };
  const supabase = await createClient();
  const { error } = await supabase
    .from("distribution_locations")
    .update({
      name,
      contact_name: s(formData, "contact_name"),
      contact_email: s(formData, "contact_email"),
      phone: s(formData, "phone"),
      address: s(formData, "address"),
      notes: s(formData, "notes"),
    })
    .eq("id", id);
  if (error) return { error: "Could not save the location." };
  revalidatePath("/distribution");
  redirect("/distribution?tab=locations");
}

export async function deleteLocation(id: string) {
  const supabase = await createClient();
  await supabase.from("distribution_locations").delete().eq("id", id);
  revalidatePath("/distribution");
  redirect("/distribution?tab=locations");
}

// ---- Products ---------------------------------------------------------------
export async function createProduct(
  _p: DistActionState,
  formData: FormData,
): Promise<DistActionState> {
  const name = s(formData, "name");
  if (!name) return { error: "Product name is required." };
  const orgId = await org();
  if (!orgId) return { error: "Session expired." };
  const supabase = await createClient();
  const { error } = await supabase.from("distribution_products").insert({
    organization_id: orgId,
    name,
    category: s(formData, "category") ?? "other",
    retail_price: n(formData, "retail_price"),
    wholesale_price: n(formData, "wholesale_price"),
    active: true,
  });
  if (error) return { error: "Could not save the product." };
  revalidatePath("/distribution");
  redirect("/distribution?tab=products");
}

export async function updateProduct(
  id: string,
  _p: DistActionState,
  formData: FormData,
): Promise<DistActionState> {
  const name = s(formData, "name");
  if (!name) return { error: "Product name is required." };
  const supabase = await createClient();
  const { error } = await supabase
    .from("distribution_products")
    .update({
      name,
      category: s(formData, "category") ?? "other",
      retail_price: n(formData, "retail_price"),
      wholesale_price: n(formData, "wholesale_price"),
    })
    .eq("id", id);
  if (error) return { error: "Could not save the product." };
  revalidatePath("/distribution");
  redirect("/distribution?tab=products");
}

export async function setProductActive(id: string, active: boolean) {
  const supabase = await createClient();
  await supabase.from("distribution_products").update({ active }).eq("id", id);
  revalidatePath("/distribution");
}

// ---- Drop-offs --------------------------------------------------------------
interface ItemInput {
  product_id?: string | null;
  product_name: string;
  quantity: number;
  unit_wholesale_price: number;
  unit_retail_price: number;
}

export async function createDropoff(
  _p: DistActionState,
  formData: FormData,
): Promise<DistActionState> {
  const locationId = s(formData, "location_id");
  const dealType = s(formData, "deal_type");
  const deliveredDate = s(formData, "delivered_date");
  if (!locationId) return { error: "Choose a location." };
  if (!dealType) return { error: "Choose wholesale or consignment." };
  if (!deliveredDate) return { error: "Choose the delivery date." };

  let items: ItemInput[] = [];
  try {
    items = JSON.parse(String(formData.get("items") ?? "[]"));
  } catch {
    items = [];
  }
  items = items.filter((i) => i.product_name && i.quantity > 0);
  if (items.length === 0) return { error: "Add at least one product with a quantity." };

  const orgId = await org();
  if (!orgId) return { error: "Session expired." };
  const supabase = await createClient();

  const rate = Number(formData.get("consignment_rate"));
  const { data: dropoff, error } = await supabase
    .from("distribution_dropoffs")
    .insert({
      organization_id: orgId,
      location_id: locationId,
      deal_type: dealType,
      delivered_date: deliveredDate,
      consignment_rate: Number.isFinite(rate) && rate > 0 ? rate : 0.7,
      notes: s(formData, "notes"),
    })
    .select("id")
    .single();
  if (error || !dropoff) return { error: "Could not create the drop-off." };

  await supabase.from("distribution_dropoff_items").insert(
    items.map((i) => ({
      organization_id: orgId,
      dropoff_id: dropoff.id,
      product_id: i.product_id || null,
      product_name: i.product_name,
      quantity: Math.max(0, Math.trunc(i.quantity)),
      unit_wholesale_price: i.unit_wholesale_price || 0,
      unit_retail_price: i.unit_retail_price || 0,
    })),
  );

  revalidatePath("/distribution");
  redirect(`/distribution/dropoffs/${dropoff.id}`);
}

/** Record consignment sales/returns for each line item. */
export async function updateDropoffItems(dropoffId: string, formData: FormData) {
  let updates: { id: string; quantity_sold: number; quantity_returned: number }[] = [];
  try {
    updates = JSON.parse(String(formData.get("items") ?? "[]"));
  } catch {
    updates = [];
  }
  const supabase = await createClient();
  for (const u of updates) {
    await supabase
      .from("distribution_dropoff_items")
      .update({
        quantity_sold: Math.max(0, Math.trunc(u.quantity_sold || 0)),
        quantity_returned: Math.max(0, Math.trunc(u.quantity_returned || 0)),
      })
      .eq("id", u.id);
  }
  revalidatePath("/distribution");
  revalidatePath(`/distribution/dropoffs/${dropoffId}`);
  redirect(`/distribution/dropoffs/${dropoffId}`);
}

export async function toggleDropoffPaid(id: string, currentlyPaid: boolean) {
  const { todayISO } = await import("@/lib/domain/dates");
  const paid = !currentlyPaid;
  const supabase = await createClient();
  await supabase
    .from("distribution_dropoffs")
    .update({ paid, paid_date: paid ? todayISO() : null })
    .eq("id", id);
  revalidatePath("/distribution");
  revalidatePath(`/distribution/dropoffs/${id}`);
}

export async function toggleDropoffSettled(id: string, currentlySettled: boolean) {
  const supabase = await createClient();
  await supabase
    .from("distribution_dropoffs")
    .update({ settled: !currentlySettled })
    .eq("id", id);
  revalidatePath("/distribution");
  revalidatePath(`/distribution/dropoffs/${id}`);
}

export async function deleteDropoff(id: string) {
  const supabase = await createClient();
  await supabase.from("distribution_dropoffs").delete().eq("id", id);
  revalidatePath("/distribution");
  redirect("/distribution");
}
