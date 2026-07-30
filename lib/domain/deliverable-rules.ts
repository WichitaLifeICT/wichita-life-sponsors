import type { DeliverableType, Recurrence } from "@/types/database";

export interface DeliverableRuleInput {
  deliverable_type: DeliverableType;
  quantity: number;
  recurrence: Recurrence;
}

export interface EffectiveDeliverable {
  deliverable_type: DeliverableType;
  quantity: number;
  recurrence: Recurrence;
  /** True when a subscription override changed this from the package default. */
  overridden: boolean;
  /** True when this type is not in the package at all (added just for this sponsor). */
  added: boolean;
}

/**
 * Merge a package's deliverable rules with a subscription's overrides into the
 * effective set of deliverables a sponsor should receive.
 *
 * Semantics (matches the DB's unique(subscription, deliverable_type) override):
 *   - An override REPLACES the quantity/recurrence for that deliverable type.
 *   - An override quantity of 0 REMOVES that deliverable type.
 *   - An override for a type not in the package ADDS it.
 *   - Types with no override use the package rule unchanged.
 *
 * Package edits therefore only ever affect future resolution — historical
 * deliverable rows are never touched by this function.
 */
export function resolveEffectiveDeliverables(
  packageRules: DeliverableRuleInput[],
  overrides: DeliverableRuleInput[],
): EffectiveDeliverable[] {
  const base = new Map<DeliverableType, { quantity: number; recurrence: Recurrence }>();

  for (const rule of packageRules) {
    const existing = base.get(rule.deliverable_type);
    base.set(rule.deliverable_type, {
      quantity: (existing?.quantity ?? 0) + rule.quantity,
      recurrence: existing?.recurrence ?? rule.recurrence,
    });
  }

  const overriddenTypes = new Set<DeliverableType>();
  for (const ov of overrides) {
    overriddenTypes.add(ov.deliverable_type);
    if (ov.quantity <= 0) {
      base.delete(ov.deliverable_type);
    } else {
      base.set(ov.deliverable_type, {
        quantity: ov.quantity,
        recurrence: ov.recurrence,
      });
    }
  }

  const packageTypes = new Set(packageRules.map((r) => r.deliverable_type));

  return [...base.entries()]
    .filter(([, v]) => v.quantity > 0)
    .map(([deliverable_type, v]) => ({
      deliverable_type,
      quantity: v.quantity,
      recurrence: v.recurrence,
      overridden: overriddenTypes.has(deliverable_type),
      added: overriddenTypes.has(deliverable_type) && !packageTypes.has(deliverable_type),
    }));
}
