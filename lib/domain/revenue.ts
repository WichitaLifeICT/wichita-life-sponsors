import type { BillingFrequency } from "@/types/database";

/**
 * Convert a price at a given billing frequency into its monthly equivalent,
 * used for "contracted monthly revenue" style figures.
 *
 * - monthly    -> amount
 * - quarterly  -> amount / 3
 * - annually   -> amount / 12
 * - one_time   -> 0  (not recurring, excluded from monthly run-rate)
 * - custom     -> amount (treated as an already-monthly figure)
 */
export function monthlyEquivalent(
  amount: number | null | undefined,
  frequency: BillingFrequency,
): number {
  const value = typeof amount === "number" ? amount : 0;
  switch (frequency) {
    case "monthly":
      return value;
    case "quarterly":
      return value / 3;
    case "annually":
      return value / 12;
    case "one_time":
      return 0;
    case "custom":
      return value;
    default:
      return value;
  }
}

/**
 * Like monthlyEquivalent, but for computing what a single billing PERIOD is
 * worth (not the recurring run-rate). The only difference: a one-time deal keeps
 * its full amount (it's billed once in its single period), rather than 0.
 */
export function monthlyEquivalentBasis(
  amount: number | null | undefined,
  frequency: BillingFrequency,
): number {
  const value = typeof amount === "number" ? amount : 0;
  switch (frequency) {
    case "quarterly":
      return value / 3;
    case "annually":
      return value / 12;
    case "one_time":
      return value;
    case "monthly":
    case "custom":
    default:
      return value;
  }
}

export interface EffectivePriceInputs {
  sponsorMonthlyPrice: number | null;
  sponsorBillingFrequency: BillingFrequency;
  subscriptionCustomMonthlyPrice?: number | null;
  packageBasePrice?: number | null;
  packageBillingFrequency?: BillingFrequency | null;
}

/**
 * A sponsor's effective monthly value. Preference order:
 *   1. subscription custom monthly price (already monthly)
 *   2. the assigned package's base price (normalized by its frequency)
 *   3. the sponsor's own monthly_price (normalized by its frequency)
 */
export function effectiveMonthlyValue(inputs: EffectivePriceInputs): number {
  const {
    sponsorMonthlyPrice,
    sponsorBillingFrequency,
    subscriptionCustomMonthlyPrice,
    packageBasePrice,
    packageBillingFrequency,
  } = inputs;

  if (
    typeof subscriptionCustomMonthlyPrice === "number" &&
    subscriptionCustomMonthlyPrice > 0
  ) {
    return subscriptionCustomMonthlyPrice;
  }

  if (typeof packageBasePrice === "number" && packageBillingFrequency) {
    return monthlyEquivalent(packageBasePrice, packageBillingFrequency);
  }

  return monthlyEquivalent(sponsorMonthlyPrice, sponsorBillingFrequency);
}

/**
 * Like effectiveMonthlyValue, but for what a single billing PERIOD is worth.
 * Identical preference order; the only difference is one-time deals keep their
 * full amount (see monthlyEquivalentBasis) instead of collapsing to 0. Use this
 * for period amounts and month-by-month revenue; use effectiveMonthlyValue for
 * the recurring run-rate ("contracted monthly").
 */
export function effectiveBillingBasis(inputs: EffectivePriceInputs): number {
  const {
    sponsorMonthlyPrice,
    sponsorBillingFrequency,
    subscriptionCustomMonthlyPrice,
    packageBasePrice,
    packageBillingFrequency,
  } = inputs;

  if (
    typeof subscriptionCustomMonthlyPrice === "number" &&
    subscriptionCustomMonthlyPrice > 0
  ) {
    return subscriptionCustomMonthlyPrice;
  }

  if (typeof packageBasePrice === "number" && packageBillingFrequency) {
    return monthlyEquivalentBasis(packageBasePrice, packageBillingFrequency);
  }

  return monthlyEquivalentBasis(sponsorMonthlyPrice, sponsorBillingFrequency);
}
