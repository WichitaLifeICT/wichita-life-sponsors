import { Badge } from "@/components/ui/badge";

/**
 * Payment standing derived from billing periods:
 *  - no periods yet  -> nothing (returns null)
 *  - outstanding = 0  -> "Payments up to date"
 *  - otherwise        -> "N period(s) unpaid"
 */
export function PaymentStandingBadge({
  hasPeriods,
  unpaidCount,
}: {
  hasPeriods: boolean;
  unpaidCount: number;
}) {
  if (!hasPeriods) return null;
  if (unpaidCount === 0) {
    return <Badge variant="success">Payments up to date</Badge>;
  }
  return (
    <Badge variant="warning">
      {unpaidCount} period{unpaidCount === 1 ? "" : "s"} unpaid
    </Badge>
  );
}
