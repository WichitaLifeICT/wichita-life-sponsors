import type { DeliverableType, Recurrence } from "@/types/database";
import { toServiceMonth, monthsBetween } from "@/lib/domain/dates";

/**
 * Monthly deliverable generation — pure planning logic.
 *
 * Given the active subscriptions (with their already-resolved effective
 * deliverables) and the deliverables that already exist for a service month,
 * decide exactly which new deliverable rows to create. No database access here,
 * so it is fully unit-testable and deterministic.
 *
 * Rules:
 *   - Only subscriptions that are active AND have auto-generate enabled.
 *   - Only months within [start month, end month] of the subscription.
 *   - Recurrence decides which months a deliverable applies to, measured from
 *     the subscription's start month:
 *       monthly    -> every month
 *       quarterly  -> months 0, 3, 6, 9, … after start
 *       annually   -> months 0, 12, 24, … after start
 *       one_time   -> only the start month
 *       custom     -> treated as monthly (adjust manually as needed)
 *   - Idempotent: a deliverable is keyed by
 *     (subscription, type, original_service_month, sequence). Anything that
 *     already exists is skipped, so re-running never duplicates. If a quantity
 *     was increased, only the missing sequence numbers are added.
 */

export interface GenerationSubscriptionInput {
  subscriptionId: string;
  sponsorId: string;
  startDate: string; // YYYY-MM-DD
  endDate: string | null;
  status: string; // subscription_status
  autoGenerate: boolean;
  effective: {
    deliverable_type: DeliverableType;
    quantity: number;
    recurrence: Recurrence;
  }[];
}

export interface PlannedDeliverable {
  subscriptionId: string;
  sponsorId: string;
  deliverable_type: DeliverableType;
  service_month: string;
  original_service_month: string;
  sequence: number;
  quantity_total: number;
}

export interface GenerationPlan {
  toCreate: PlannedDeliverable[];
  skipped: number; // already-existing deliverables that were left untouched
}

export function recurrenceApplies(
  recurrence: Recurrence,
  monthsSinceStart: number,
): boolean {
  if (monthsSinceStart < 0) return false;
  switch (recurrence) {
    case "monthly":
    case "custom":
      return true;
    case "quarterly":
      return monthsSinceStart % 3 === 0;
    case "annually":
      return monthsSinceStart % 12 === 0;
    case "one_time":
      return monthsSinceStart === 0;
    default:
      return false;
  }
}

function existingKey(
  subscriptionId: string,
  type: string,
  originalServiceMonth: string,
  sequence: number,
) {
  return `${subscriptionId}|${type}|${originalServiceMonth}|${sequence}`;
}

/**
 * @param serviceMonth  target month, "YYYY-MM-01"
 * @param subs          active subscription inputs with resolved effective deliverables
 * @param existing      keys of deliverables that already exist for this month,
 *                      from existingKeyFor(...)
 */
export function planGeneration(
  serviceMonth: string,
  subs: GenerationSubscriptionInput[],
  existing: Set<string>,
): GenerationPlan {
  const toCreate: PlannedDeliverable[] = [];
  let skipped = 0;

  for (const sub of subs) {
    if (sub.status !== "active" || !sub.autoGenerate) continue;

    const startMonth = toServiceMonth(sub.startDate);
    const monthsSinceStart = monthsBetween(startMonth, serviceMonth);
    if (monthsSinceStart < 0) continue; // before the subscription started

    if (sub.endDate) {
      const endMonth = toServiceMonth(sub.endDate);
      if (monthsBetween(serviceMonth, endMonth) < 0) continue; // after it ended
    }

    for (const eff of sub.effective) {
      if (eff.quantity <= 0) continue;
      if (!recurrenceApplies(eff.recurrence, monthsSinceStart)) continue;

      for (let seq = 1; seq <= eff.quantity; seq++) {
        const key = existingKey(
          sub.subscriptionId,
          eff.deliverable_type,
          serviceMonth,
          seq,
        );
        if (existing.has(key)) {
          skipped++;
          continue;
        }
        toCreate.push({
          subscriptionId: sub.subscriptionId,
          sponsorId: sub.sponsorId,
          deliverable_type: eff.deliverable_type,
          service_month: serviceMonth,
          original_service_month: serviceMonth,
          sequence: seq,
          quantity_total: eff.quantity,
        });
      }
    }
  }

  return { toCreate, skipped };
}

/** Build the existing-deliverable key used by planGeneration. */
export function existingKeyFor(
  subscriptionId: string,
  type: string,
  originalServiceMonth: string,
  sequence: number,
) {
  return existingKey(subscriptionId, type, originalServiceMonth, sequence);
}
