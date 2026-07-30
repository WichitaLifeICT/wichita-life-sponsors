"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { getSessionContext } from "@/lib/data/session";
import { todayISO } from "@/lib/domain/dates";

async function upsertPeriod(
  sponsorId: string,
  periodStart: string,
  periodEnd: string,
  patch: Record<string, unknown>,
) {
  const session = await getSessionContext();
  if (!session?.organization) return;
  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("billing_periods")
    .select("id")
    .eq("sponsor_id", sponsorId)
    .eq("period_start", periodStart)
    .maybeSingle();

  const { error } = existing
    ? await supabase.from("billing_periods").update(patch).eq("id", existing.id)
    : await supabase.from("billing_periods").insert({
        organization_id: session.organization.id,
        sponsor_id: sponsorId,
        period_start: periodStart,
        period_end: periodEnd,
        ...patch,
      });
  if (error) {
    console.error("billing_periods write failed:", error);
  }

  revalidatePath("/billing");
  revalidatePath(`/billing/${sponsorId}`);
  revalidatePath(`/sponsors/${sponsorId}`);
}

/** Flip a period's paid state, stamping/clearing the paid date. */
export async function togglePeriodPaid(
  sponsorId: string,
  periodStart: string,
  periodEnd: string,
  defaultAmount: number,
  currentlyPaid: boolean,
) {
  const paid = !currentlyPaid;
  await upsertPeriod(sponsorId, periodStart, periodEnd, {
    amount: defaultAmount,
    paid,
    paid_date: paid ? todayISO() : null,
  });
}

/** Edit the amount for a period (leaves paid state untouched). */
export async function updatePeriodAmount(
  sponsorId: string,
  periodStart: string,
  periodEnd: string,
  formData: FormData,
) {
  const raw = Number(formData.get("amount"));
  const amount = Number.isFinite(raw) && raw >= 0 ? raw : 0;
  await upsertPeriod(sponsorId, periodStart, periodEnd, { amount });
}
