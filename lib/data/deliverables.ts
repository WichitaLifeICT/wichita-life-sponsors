import { createClient } from "@/lib/supabase/server";
import type { Deliverable } from "@/types/database";

export interface MonthlyFulfillment {
  total: number;
  published: number;
  scheduled: number;
  waitingOnAssets: number;
  notScheduled: number;
  carriedForward: number;
  inProgress: number; // drafting / ready_for_review / approved
  completionPct: number;
}

const IN_PROGRESS = new Set(["drafting", "ready_for_review", "approved"]);

/** Fulfillment summary for a service month. */
export async function getMonthlyFulfillment(
  serviceMonth: string,
): Promise<MonthlyFulfillment> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("deliverables")
    .select("status")
    .eq("service_month", serviceMonth);

  const rows = (data ?? []) as { status: string }[];
  const active = rows.filter((r) => r.status !== "canceled");
  const count = (s: string) => active.filter((r) => r.status === s).length;

  const total = active.length;
  const published = count("published");

  return {
    total,
    published,
    scheduled: count("scheduled"),
    waitingOnAssets: count("waiting_on_assets"),
    notScheduled: count("not_scheduled"),
    carriedForward: count("carried_forward"),
    inProgress: active.filter((r) => IN_PROGRESS.has(r.status)).length,
    completionPct: total > 0 ? Math.round((published / total) * 100) : 0,
  };
}

export interface MonthlyDeliverableRow extends Deliverable {
  sponsorName: string;
}

/** All deliverables for a service month, with sponsor names, for the list view. */
export async function getMonthlyDeliverables(
  serviceMonth: string,
): Promise<MonthlyDeliverableRow[]> {
  const supabase = await createClient();

  const [{ data: deliverables }, { data: sponsors }] = await Promise.all([
    supabase
      .from("deliverables")
      .select("*")
      .eq("service_month", serviceMonth)
      .order("due_date", { ascending: true, nullsFirst: false }),
    supabase.from("sponsors").select("id, company_name"),
  ]);

  const nameById = new Map(
    (sponsors ?? []).map((s) => [s.id as string, s.company_name as string]),
  );

  return ((deliverables ?? []) as Deliverable[]).map((d) => ({
    ...d,
    sponsorName: nameById.get(d.sponsor_id) ?? "Unknown",
  }));
}
