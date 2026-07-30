import type { Invoice, InvoiceStatus, Payment } from "@/types/database";
import { isPast } from "@/lib/domain/dates";

/** Sum of payments applied to an invoice. */
export function paidAmount(payments: Pick<Payment, "amount">[]): number {
  return payments.reduce((sum, p) => sum + (p.amount ?? 0), 0);
}

/**
 * Compute an invoice's effective status from its stored status, its payments,
 * and the due date. Manual states (draft/void/not_created) are respected; the
 * paid/partial/overdue distinctions are derived so they can't drift.
 */
export function computeInvoiceStatus(
  invoice: Pick<Invoice, "amount" | "status" | "due_date">,
  payments: Pick<Payment, "amount">[],
  now: Date = new Date(),
): InvoiceStatus {
  if (invoice.status === "void") return "void";
  if (invoice.status === "not_created") return "not_created";

  const amount = invoice.amount ?? 0;
  const paid = paidAmount(payments);

  if (amount > 0 && paid >= amount) return "paid";
  if (paid > 0 && paid < amount) return "partially_paid";

  // Nothing (or not enough) paid yet.
  if (amount > 0 && isPast(invoice.due_date, now)) return "overdue";

  // Fall back to the manual state (draft or sent).
  return invoice.status === "sent" ? "sent" : "draft";
}

/** Remaining balance on an invoice (never negative). */
export function invoiceBalance(
  invoice: Pick<Invoice, "amount">,
  payments: Pick<Payment, "amount">[],
): number {
  return Math.max(0, (invoice.amount ?? 0) - paidAmount(payments));
}

export type SponsorPaymentStatus =
  | "paid"
  | "partially_paid"
  | "invoice_sent"
  | "overdue"
  | "no_invoice"
  | "not_due";

export const SPONSOR_PAYMENT_STATUS_LABEL: Record<SponsorPaymentStatus, string> = {
  paid: "Paid",
  partially_paid: "Partially paid",
  invoice_sent: "Invoice sent",
  overdue: "Overdue",
  no_invoice: "No invoice",
  not_due: "Not currently due",
};

/**
 * Roll a sponsor's invoices up into a single payment status for lists.
 * Overdue wins over everything; otherwise we reflect the most recent activity.
 * Void invoices are ignored. Sponsors with no invoices report "no_invoice".
 */
export function sponsorPaymentStatus(
  invoices: Pick<Invoice, "id" | "amount" | "status" | "due_date" | "invoice_date">[],
  paymentsByInvoice: Map<string, Pick<Payment, "amount">[]>,
  now: Date = new Date(),
): SponsorPaymentStatus {
  const active = invoices.filter((i) => i.status !== "void");
  if (active.length === 0) return "no_invoice";

  const computed = active.map((inv) =>
    computeInvoiceStatus(inv, paymentsByInvoice.get(inv.id) ?? [], now),
  );

  if (computed.includes("overdue")) return "overdue";
  if (computed.includes("partially_paid")) return "partially_paid";

  // Prefer the newest invoice's state for the headline.
  const newest = [...active].sort((a, b) =>
    (b.invoice_date ?? "").localeCompare(a.invoice_date ?? ""),
  )[0];
  const newestStatus = computeInvoiceStatus(
    newest,
    paymentsByInvoice.get(newest.id) ?? [],
    now,
  );

  switch (newestStatus) {
    case "paid":
      return "paid";
    case "sent":
      return "invoice_sent";
    default:
      return computed.includes("paid") ? "paid" : "invoice_sent";
  }
}
