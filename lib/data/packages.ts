import { createClient } from "@/lib/supabase/server";

/** Active packages for assignment dropdowns. */
export async function getPackagesForSelect(): Promise<
  { id: string; name: string }[]
> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("packages")
    .select("id, name")
    .eq("active", true)
    .order("name", { ascending: true });
  return (data ?? []).map((p) => ({ id: p.id as string, name: p.name as string }));
}
