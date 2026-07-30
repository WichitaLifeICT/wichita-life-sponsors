"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { getSessionContext } from "@/lib/data/session";
import { todayISO } from "@/lib/domain/dates";
import type { DeliverableStatus } from "@/types/database";

type SupabaseServer = Awaited<ReturnType<typeof createClient>>;

async function logStatusChange(
  supabase: SupabaseServer,
  orgId: string,
  deliverableId: string,
  from: string | null,
  to: string,
  userId: string | null,
  note?: string,
) {
  await supabase.from("deliverable_status_history").insert({
    organization_id: orgId,
    deliverable_id: deliverableId,
    from_status: from,
    to_status: to,
    changed_by: userId,
    note: note ?? null,
  });
}

/** Derived side effects when a status changes (e.g. stamp published date). */
function statusSideEffects(
  to: DeliverableStatus,
  current: { published_date: string | null },
): Record<string, unknown> {
  const patch: Record<string, unknown> = { status: to };
  if (to === "published" && !current.published_date) {
    patch.published_date = todayISO();
  }
  return patch;
}

/** Change a single deliverable's status (used by the board and detail view). */
export async function updateDeliverableStatus(
  id: string,
  newStatus: DeliverableStatus,
) {
  const session = await getSessionContext();
  if (!session?.organization) redirect("/login");

  const supabase = await createClient();
  const { data: current } = await supabase
    .from("deliverables")
    .select("status, published_date")
    .eq("id", id)
    .maybeSingle();
  if (!current) return;
  if (current.status === newStatus) return;

  await supabase
    .from("deliverables")
    .update(statusSideEffects(newStatus, current as { published_date: string | null }))
    .eq("id", id);

  await logStatusChange(
    supabase,
    session.organization.id,
    id,
    current.status as string,
    newStatus,
    session.userId,
  );

  revalidatePath("/deliverables");
  revalidatePath(`/deliverables/${id}`);
}

export interface DeliverableFieldsState {
  error: string | null;
}

/** Edit a deliverable's fields from the detail page. */
export async function updateDeliverableFields(
  id: string,
  _prev: DeliverableFieldsState,
  formData: FormData,
): Promise<DeliverableFieldsState> {
  const session = await getSessionContext();
  if (!session?.organization) return { error: "Your session has expired." };

  const supabase = await createClient();
  const { data: current } = await supabase
    .from("deliverables")
    .select("status, published_date")
    .eq("id", id)
    .maybeSingle();
  if (!current) return { error: "Deliverable not found." };

  const val = (k: string) => {
    const v = formData.get(k);
    const s = typeof v === "string" ? v.trim() : "";
    return s === "" ? null : s;
  };
  const newStatus = (val("status") ?? current.status) as DeliverableStatus;

  const patch: Record<string, unknown> = {
    status: newStatus,
    asset_status: val("asset_status") ?? "not_needed",
    due_date: val("due_date"),
    scheduled_date: val("scheduled_date"),
    published_date: val("published_date"),
    content_channel: val("content_channel"),
    content_url: val("content_url"),
    notes: val("notes"),
  };
  if (newStatus === "published" && !patch.published_date) {
    patch.published_date = todayISO();
  }

  const { error } = await supabase.from("deliverables").update(patch).eq("id", id);
  if (error) return { error: "Could not save changes. Please try again." };

  if (current.status !== newStatus) {
    await logStatusChange(
      supabase,
      session.organization.id,
      id,
      current.status as string,
      newStatus,
      session.userId,
    );
  }

  revalidatePath("/deliverables");
  revalidatePath(`/deliverables/${id}`);
  redirect(`/deliverables/${id}`);
}

// ---------------------------------------------------------------------------
// Bulk actions
// ---------------------------------------------------------------------------
export async function bulkUpdateDeliverables(formData: FormData) {
  const session = await getSessionContext();
  if (!session?.organization) redirect("/login");
  const orgId = session.organization.id;

  let ids: string[] = [];
  try {
    ids = JSON.parse(String(formData.get("ids") ?? "[]"));
  } catch {
    ids = [];
  }
  const action = String(formData.get("action") ?? "");
  const value = String(formData.get("value") ?? "");
  const returnMonth = String(formData.get("month") ?? "");
  if (ids.length === 0 || !action) return;

  const supabase = await createClient();

  if (action === "set_status" || action === "mark_published") {
    const to = (action === "mark_published" ? "published" : value) as DeliverableStatus;
    const { data: currents } = await supabase
      .from("deliverables")
      .select("id, status, published_date")
      .in("id", ids);
    for (const c of currents ?? []) {
      if (c.status === to) continue;
      await supabase
        .from("deliverables")
        .update(statusSideEffects(to, c as { published_date: string | null }))
        .eq("id", c.id);
      await logStatusChange(
        supabase,
        orgId,
        c.id as string,
        c.status as string,
        to,
        session.userId,
        "Bulk update",
      );
    }
  } else if (action === "mark_assets_received") {
    await supabase
      .from("deliverables")
      .update({ asset_status: "received" })
      .in("id", ids);
  } else if (action === "set_due_date") {
    await supabase
      .from("deliverables")
      .update({ due_date: value || null })
      .in("id", ids);
  } else if (action === "carry_forward") {
    const { data: rows } = await supabase
      .from("deliverables")
      .select("id, service_month")
      .in("id", ids);
    const { addMonths, toServiceMonth } = await import("@/lib/domain/dates");
    for (const r of rows ?? []) {
      const target = addMonths(toServiceMonth(r.service_month as string), 1);
      await supabase
        .from("deliverables")
        .update({ service_month: target, status: "carried_forward" })
        .eq("id", r.id);
    }
  }

  revalidatePath("/deliverables");
  redirect(returnMonth ? `/deliverables?month=${returnMonth}` : "/deliverables");
}
