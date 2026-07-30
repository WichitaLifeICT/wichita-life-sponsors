"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { getSessionContext } from "@/lib/data/session";
import { slotSchema } from "@/lib/validations/slot";

export interface SlotActionState {
  error: string | null;
}

export async function createSlot(
  _prev: SlotActionState,
  formData: FormData,
): Promise<SlotActionState> {
  const parsed = slotSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the form." };
  }
  const session = await getSessionContext();
  if (!session?.organization) return { error: "Your session has expired." };

  const supabase = await createClient();
  const { error } = await supabase.from("content_slots").insert({
    organization_id: session.organization.id,
    slot_type: parsed.data.slot_type,
    title: parsed.data.title ?? null,
    scheduled_date: parsed.data.scheduled_date,
    capacity: parsed.data.capacity,
    notes: parsed.data.notes ?? null,
  });
  if (error) return { error: "Could not create the slot. Please try again." };

  revalidatePath("/calendar");
  redirect(`/calendar?month=${parsed.data.scheduled_date.slice(0, 7)}`);
}

export async function updateSlot(
  id: string,
  _prev: SlotActionState,
  formData: FormData,
): Promise<SlotActionState> {
  const parsed = slotSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the form." };
  }
  const supabase = await createClient();
  const { error } = await supabase
    .from("content_slots")
    .update({
      slot_type: parsed.data.slot_type,
      title: parsed.data.title ?? null,
      scheduled_date: parsed.data.scheduled_date,
      capacity: parsed.data.capacity,
      notes: parsed.data.notes ?? null,
    })
    .eq("id", id);
  if (error) return { error: "Could not save the slot. Please try again." };

  revalidatePath("/calendar");
  redirect(`/calendar?month=${parsed.data.scheduled_date.slice(0, 7)}`);
}

const DEFAULT_TIERS = ["Headline", "Feature", "Lower", "Event banner"];

/**
 * Auto-create email ad slots for a month. For each selected send day
 * (defaults to Mon/Wed/Thu/Fri) it creates one newsletter slot per selected ad
 * tier (Headline / Feature / Lower / Event banner), each holding one sponsor, so
 * every tier shows as its own clickable slot on the calendar. Idempotent: skips
 * a (date, tier) that already exists, so deleted days only return if regenerated.
 */
export async function generateEmailSlots(month: string, formData: FormData) {
  const session = await getSessionContext();
  if (!session?.organization) redirect("/login");

  const selectedDays = formData.getAll("weekday").map((v) => Number(v));
  const weekdays = new Set(selectedDays.length ? selectedDays : [1, 3, 4, 5]);
  const selectedTiers = formData.getAll("tier").map((v) => String(v));
  const tiers = selectedTiers.length ? selectedTiers : DEFAULT_TIERS;

  const [y, m] = month.split("-").map(Number);
  const totalDays = new Date(Date.UTC(y, m, 0)).getUTCDate();

  const supabase = await createClient();

  // Existing newsletter slots this month, keyed by date + tier title.
  const { data: existing } = await supabase
    .from("content_slots")
    .select("scheduled_date, title")
    .eq("slot_type", "newsletter")
    .gte("scheduled_date", `${month}-01`)
    .lte("scheduled_date", `${month}-${String(totalDays).padStart(2, "0")}`);
  const taken = new Set(
    (existing ?? []).map((s) => `${s.scheduled_date}|${s.title ?? ""}`),
  );

  const toInsert: {
    organization_id: string;
    slot_type: "newsletter";
    title: string;
    scheduled_date: string;
    capacity: number;
  }[] = [];
  for (let day = 1; day <= totalDays; day++) {
    const weekday = new Date(Date.UTC(y, m - 1, day)).getUTCDay();
    if (!weekdays.has(weekday)) continue;
    const date = `${month}-${String(day).padStart(2, "0")}`;
    for (const tier of tiers) {
      if (taken.has(`${date}|${tier}`)) continue;
      toInsert.push({
        organization_id: session.organization.id,
        slot_type: "newsletter",
        title: tier,
        scheduled_date: date,
        capacity: 1,
      });
    }
  }

  if (toInsert.length > 0) {
    await supabase.from("content_slots").insert(toInsert);
  }

  revalidatePath("/calendar");
  redirect(`/calendar?month=${month}`);
}

/** Delete a slot and unschedule any deliverables that were assigned to it. */
export async function deleteSlot(id: string, month: string) {
  const supabase = await createClient();

  const { data: assignments } = await supabase
    .from("deliverable_slot_assignments")
    .select("deliverable_id")
    .eq("content_slot_id", id);

  const deliverableIds = (assignments ?? []).map((a) => a.deliverable_id as string);
  if (deliverableIds.length > 0) {
    // Clear scheduled date; revert scheduled -> not_scheduled.
    await supabase
      .from("deliverables")
      .update({ scheduled_date: null })
      .in("id", deliverableIds);
    await supabase
      .from("deliverables")
      .update({ status: "not_scheduled" })
      .in("id", deliverableIds)
      .eq("status", "scheduled");
  }

  await supabase.from("content_slots").delete().eq("id", id);
  revalidatePath("/calendar");
  redirect(`/calendar?month=${month}`);
}

export interface AssignResult {
  ok: boolean;
  needsOverride?: boolean;
  error?: string;
}

/**
 * Assign a deliverable to a slot: enforces capacity (unless override), moves the
 * deliverable if it was already in another slot, sets its scheduled date to the
 * slot's date, and marks it scheduled when appropriate (service month preserved).
 */
export async function assignDeliverable(
  deliverableId: string,
  slotId: string,
  override = false,
): Promise<AssignResult> {
  const session = await getSessionContext();
  if (!session?.organization) return { ok: false, error: "Session expired." };

  const supabase = await createClient();

  const { data: slot } = await supabase
    .from("content_slots")
    .select("id, capacity, scheduled_date")
    .eq("id", slotId)
    .maybeSingle();
  if (!slot) return { ok: false, error: "Slot not found." };

  // Current occupancy (excluding this deliverable if already here).
  const { data: current } = await supabase
    .from("deliverable_slot_assignments")
    .select("deliverable_id")
    .eq("content_slot_id", slotId);
  const others = (current ?? []).filter(
    (a) => a.deliverable_id !== deliverableId,
  );
  if (!override && others.length >= (slot.capacity as number)) {
    return { ok: false, needsOverride: true };
  }

  // Move: remove any existing assignment for this deliverable first.
  await supabase
    .from("deliverable_slot_assignments")
    .delete()
    .eq("deliverable_id", deliverableId);

  await supabase.from("deliverable_slot_assignments").insert({
    organization_id: session.organization.id,
    deliverable_id: deliverableId,
    content_slot_id: slotId,
    position: others.length,
  });

  // Update the deliverable's scheduled date + status.
  await supabase
    .from("deliverables")
    .update({ scheduled_date: slot.scheduled_date })
    .eq("id", deliverableId);
  await supabase
    .from("deliverables")
    .update({ status: "scheduled" })
    .eq("id", deliverableId)
    .in("status", ["not_scheduled", "waiting_on_assets"]);

  revalidatePath("/calendar");
  revalidatePath("/deliverables");
  return { ok: true };
}

/** Remove a deliverable from its slot and clear its scheduled date. */
export async function unassignDeliverable(deliverableId: string) {
  const supabase = await createClient();

  await supabase
    .from("deliverable_slot_assignments")
    .delete()
    .eq("deliverable_id", deliverableId);
  await supabase
    .from("deliverables")
    .update({ scheduled_date: null })
    .eq("id", deliverableId);
  await supabase
    .from("deliverables")
    .update({ status: "not_scheduled" })
    .eq("id", deliverableId)
    .eq("status", "scheduled");

  revalidatePath("/calendar");
  revalidatePath("/deliverables");
  return { ok: true };
}
