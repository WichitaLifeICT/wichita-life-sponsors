"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

const DEMO_TABLES = [
  "sponsors",
  "packages",
  "content_slots",
  "distribution_locations",
  "distribution_products",
] as const;

/**
 * Remove all demo/sample records for the current organization. Only rows flagged
 * is_demo = true are deleted; real data you've entered is untouched. Foreign-key
 * cascades handle child rows (subscriptions, deliverables, invoices, etc.).
 * Redirects back to Settings with a count of how many top-level records went.
 */
export async function removeDemoData() {
  const supabase = await createClient();

  let deleted = 0;
  for (const table of DEMO_TABLES) {
    const { data, error } = await supabase
      .from(table)
      .delete()
      .eq("is_demo", true)
      .select("id");
    if (error) {
      console.error(`removeDemoData: ${table} delete failed:`, error);
    } else {
      deleted += data?.length ?? 0;
    }
  }

  revalidatePath("/", "layout");
  redirect(`/settings?removed=${deleted}`);
}
