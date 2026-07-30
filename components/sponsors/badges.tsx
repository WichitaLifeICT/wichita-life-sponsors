import { Badge, type BadgeProps } from "@/components/ui/badge";
import type { SponsorStatus } from "@/types/database";
import {
  SPONSOR_PAYMENT_STATUS_LABEL,
  type SponsorPaymentStatus,
} from "@/lib/domain/billing";

const SPONSOR_STATUS_META: Record<
  SponsorStatus,
  { label: string; variant: BadgeProps["variant"] }
> = {
  active: { label: "Active", variant: "success" },
  lead: { label: "Lead", variant: "secondary" },
  paused: { label: "Paused", variant: "warning" },
  expired: { label: "Expired", variant: "outline" },
  archived: { label: "Archived", variant: "outline" },
};

export function SponsorStatusBadge({ status }: { status: SponsorStatus }) {
  const meta = SPONSOR_STATUS_META[status];
  return <Badge variant={meta.variant}>{meta.label}</Badge>;
}

const PAYMENT_VARIANT: Record<SponsorPaymentStatus, BadgeProps["variant"]> = {
  paid: "success",
  partially_paid: "warning",
  invoice_sent: "secondary",
  overdue: "destructive",
  no_invoice: "outline",
  not_due: "outline",
};

export function PaymentStatusBadge({
  status,
}: {
  status: SponsorPaymentStatus;
}) {
  return (
    <Badge variant={PAYMENT_VARIANT[status]}>
      {SPONSOR_PAYMENT_STATUS_LABEL[status]}
    </Badge>
  );
}
