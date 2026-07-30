"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

/**
 * Remove all demo/sample records for the current organization. Only rows flagged
 * is_demo = true are deleted; real data you've entered is untouched. Foreign-key
 * cascades handle child rows (subscriptions, deliverables, invoices, etc.).
 */
export async function removeDemoData() {
  const supabase = await createClient();

  // Parents first; cascades clean up their children.
  await supabase.from("sponsors").delete().eq("is_demo", true);
  await supabase.from("packages").delete().eq("is_demo", true);
  await supabase.from("content_slots").delete().eq("is_demo", true);
  await supabase.from("distribution_locations").delete().eq("is_demo", true);
  await supabase.from("distribution_products").delete().eq("is_demo", true);

  revalidatePath("/", "layout");
  redirect("/settings?removed=1");
}
