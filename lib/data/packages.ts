import { createClient } from "@/lib/supabase/server";
import type { Package, PackageDeliverableRule } from "@/types/database";

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

export interface PackageWithRules extends Package {
  rules: PackageDeliverableRule[];
  activeSponsors: number;
}

/** All packages with their deliverable rules and active-sponsor counts. */
export async function getPackagesList(): Promise<PackageWithRules[]> {
  const supabase = await createClient();

  const [{ data: packages }, { data: rules }, { data: subs }] =
    await Promise.all([
      supabase.from("packages").select("*").order("name", { ascending: true }),
      supabase.from("package_deliverable_rules").select("*"),
      supabase
        .from("sponsor_subscriptions")
        .select("package_id")
        .eq("status", "active"),
    ]);

  const rulesByPackage = new Map<string, PackageDeliverableRule[]>();
  for (const r of (rules ?? []) as PackageDeliverableRule[]) {
    const arr = rulesByPackage.get(r.package_id) ?? [];
    arr.push(r);
    rulesByPackage.set(r.package_id, arr);
  }

  const countByPackage = new Map<string, number>();
  for (const s of subs ?? []) {
    const key = s.package_id as string | null;
    if (!key) continue;
    countByPackage.set(key, (countByPackage.get(key) ?? 0) + 1);
  }

  return ((packages ?? []) as Package[]).map((p) => ({
    ...p,
    rules: rulesByPackage.get(p.id) ?? [],
    activeSponsors: countByPackage.get(p.id) ?? 0,
  }));
}

/** One package with its deliverable rules. Null if not found. */
export async function getPackageDetail(
  id: string,
): Promise<{ pkg: Package; rules: PackageDeliverableRule[] } | null> {
  const supabase = await createClient();
  const [{ data: pkg }, { data: rules }] = await Promise.all([
    supabase.from("packages").select("*").eq("id", id).maybeSingle(),
    supabase
      .from("package_deliverable_rules")
      .select("*")
      .eq("package_id", id)
      .order("created_at", { ascending: true }),
  ]);
  if (!pkg) return null;
  return { pkg: pkg as Package, rules: (rules ?? []) as PackageDeliverableRule[] };
}
