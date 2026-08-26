"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { getSessionContext } from "@/lib/data/session";
import { slotSchema } from "@/lib/validations/slot";
import {
  slotTypeForDeliverable,
  EMAIL_TIER_DELIVERABLE_TYPE,
  deliverableTypeLabel,
} from "@/lib/labels";

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
    slot_type: slotTypeForDeliverable(parsed.data.deliverable_type),
    deliverable_type: parsed.data.deliverable_type,
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
      slot_type: slotTypeForDeliverable(parsed.data.deliverable_type),
      deliverable_type: parsed.data.deliverable_type,
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

/**
 * Move a slot to a different day and keep its assigned deliverables in sync
 * (their scheduled_date follows). Used by the quick date picker in the slot
 * dialog so you can adjust the date without opening the full edit form.
 */
export async function rescheduleSlot(
  slotId: string,
  date: string,
  month: string,
) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) redirect(`/calendar?month=${month}`);

  const supabase = await createClient();
  await supabase
    .from("content_slots")
    .update({ scheduled_date: date })
    .eq("id", slotId);

  const { data: assignments } = await supabase
    .from("deliverable_slot_assignments")
    .select("deliverable_id")
    .eq("content_slot_id", slotId);
  const ids = (assignments ?? []).map((a) => a.deliverable_id as string);
  if (ids.length > 0) {
    await supabase
      .from("deliverables")
      .update({ scheduled_date: date })
      .in("id", ids);
  }

  revalidatePath("/calendar");
  revalidatePath("/deliverables");
  redirect(`/calendar?month=${date.slice(0, 7)}`);
}

const DEFAULT_TIERS = ["Headline", "Feature", "Lower", "Event banner"];

// Tiers that only run on specific weekdays (0=Sun … 6=Sat), regardless of which
// send days are chosen. The Deep Dive (sponsored) segment is Wednesday-only.
const TIER_WEEKDAYS: Record<string, number> = { "Deep Dive": 3 };

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

  // Skip any blocked days (holidays / off-days) this month.
  const { data: blocks } = await supabase
    .from("calendar_blocks")
    .select("block_date")
    .gte("block_date", `${month}-01`)
    .lte("block_date", `${month}-${String(totalDays).padStart(2, "0")}`);
  const blockedDates = new Set((blocks ?? []).map((b) => b.block_date as string));

  const toInsert: {
    organization_id: string;
    slot_type: "newsletter";
    deliverable_type: string | null;
    title: string;
    scheduled_date: string;
    capacity: number;
  }[] = [];
  for (let day = 1; day <= totalDays; day++) {
    const weekday = new Date(Date.UTC(y, m - 1, day)).getUTCDay();
    if (!weekdays.has(weekday)) continue;
    const date = `${month}-${String(day).padStart(2, "0")}`;
    if (blockedDates.has(date)) continue; // holiday / off-day
    for (const tier of tiers) {
      // Weekday-restricted tiers (e.g. Deep Dive = Wednesday) only appear on
      // their day, even if other send days are selected.
      if (tier in TIER_WEEKDAYS && TIER_WEEKDAYS[tier] !== weekday) continue;
      if (taken.has(`${date}|${tier}`)) continue;
      toInsert.push({
        organization_id: session.organization.id,
        slot_type: "newsletter",
        deliverable_type: EMAIL_TIER_DELIVERABLE_TYPE[tier] ?? null,
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

/** Unschedule + delete every content slot on a given date. */
async function clearSlotsOnDate(
  supabase: Awaited<ReturnType<typeof createClient>>,
  date: string,
) {
  const { data: slots } = await supabase
    .from("content_slots")
    .select("id")
    .eq("scheduled_date", date);
  const slotIds = (slots ?? []).map((s) => s.id as string);
  if (slotIds.length === 0) return;

  const { data: assignments } = await supabase
    .from("deliverable_slot_assignments")
    .select("deliverable_id")
    .in("content_slot_id", slotIds);
  const deliverableIds = (assignments ?? []).map((a) => a.deliverable_id as string);
  if (deliverableIds.length > 0) {
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
  await supabase.from("content_slots").delete().in("id", slotIds);
}

/**
 * Block a day (holiday / custom off-day): no posts go out that day. Clears any
 * slots already on that date and prevents auto-schedule from adding more.
 */
export async function addCalendarBlock(month: string, formData: FormData) {
  const session = await getSessionContext();
  if (!session?.organization) redirect("/login");

  const date = String(formData.get("block_date") ?? "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    redirect(`/calendar?month=${month}`);
  }
  const name = String(formData.get("name") ?? "").trim() || "Holiday";

  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("calendar_blocks")
    .select("id")
    .eq("block_date", date)
    .maybeSingle();
  if (existing) {
    await supabase.from("calendar_blocks").update({ name }).eq("id", existing.id);
  } else {
    await supabase.from("calendar_blocks").insert({
      organization_id: session.organization.id,
      block_date: date,
      name,
    });
  }

  await clearSlotsOnDate(supabase, date);

  revalidatePath("/calendar");
  redirect(`/calendar?month=${month}`);
}

/** Remove a day block. */
export async function deleteCalendarBlock(id: string, month: string) {
  const supabase = await createClient();
  await supabase.from("calendar_blocks").delete().eq("id", id);
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
 * slot's date, marks it scheduled when appropriate, and pulls its service month
 * to the slot's month — so placing a future (or earlier) deliverable on a day
 * makes it count for the month you placed it in.
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

  // Update the deliverable's scheduled date + service month (the month it's
  // placed in is the month it counts for — this is what pulls a future ad into
  // an earlier month, or an earlier one forward).
  const slotMonth = `${(slot.scheduled_date as string).slice(0, 7)}-01`;
  await supabase
    .from("deliverables")
    .update({ scheduled_date: slot.scheduled_date, service_month: slotMonth })
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

/**
 * Assign a sponsor directly to a slot by creating a new deliverable of the
 * slot's type for the slot's month and scheduling it there. Use this to place a
 * sponsor in an open ad spot even when there's no existing deliverable to draw
 * from (e.g. a pulled-forward or good-will placement). Enforces capacity.
 */
export async function assignSponsorToSlot(
  sponsorId: string,
  slotId: string,
  override = false,
): Promise<AssignResult> {
  const session = await getSessionContext();
  if (!session?.organization) return { ok: false, error: "Session expired." };
  if (!sponsorId) return { ok: false, error: "Choose a sponsor." };

  const supabase = await createClient();

  const { data: slot } = await supabase
    .from("content_slots")
    .select("id, capacity, scheduled_date, deliverable_type, title")
    .eq("id", slotId)
    .maybeSingle();
  if (!slot) return { ok: false, error: "Slot not found." };

  const { data: current } = await supabase
    .from("deliverable_slot_assignments")
    .select("deliverable_id")
    .eq("content_slot_id", slotId);
  if (!override && (current ?? []).length >= (slot.capacity as number)) {
    return { ok: false, needsOverride: true };
  }

  const type =
    (slot.deliverable_type as string | null) ??
    EMAIL_TIER_DELIVERABLE_TYPE[(slot.title as string) ?? ""] ??
    "custom";
  const serviceMonth = `${(slot.scheduled_date as string).slice(0, 7)}-01`;

  const { data: created, error } = await supabase
    .from("deliverables")
    .insert({
      organization_id: session.organization.id,
      sponsor_id: sponsorId,
      sponsor_subscription_id: null,
      deliverable_type: type,
      title: deliverableTypeLabel(type),
      service_month: serviceMonth,
      original_service_month: serviceMonth,
      scheduled_date: slot.scheduled_date,
      status: "scheduled" as const,
      asset_status: "not_needed" as const,
    })
    .select("id")
    .single();
  if (error || !created) {
    console.error("assignSponsorToSlot failed:", error);
    return { ok: false, error: error?.message ?? "Could not assign the sponsor." };
  }

  await supabase.from("deliverable_slot_assignments").insert({
    organization_id: session.organization.id,
    deliverable_id: created.id,
    content_slot_id: slotId,
    position: (current ?? []).length,
  });

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
