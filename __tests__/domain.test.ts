import { describe, it, expect } from "vitest";

import { monthlyEquivalent, effectiveMonthlyValue } from "@/lib/domain/revenue";
import {
  computeInvoiceStatus,
  invoiceBalance,
  paidAmount,
  sponsorPaymentStatus,
} from "@/lib/domain/billing";
import { daysUntil, currentServiceMonth, addMonths } from "@/lib/domain/dates";

const NOW = new Date("2026-07-30T18:00:00Z"); // fixed reference

describe("monthlyEquivalent", () => {
  it("normalizes each frequency", () => {
    expect(monthlyEquivalent(500, "monthly")).toBe(500);
    expect(monthlyEquivalent(900, "quarterly")).toBe(300);
    expect(monthlyEquivalent(1200, "annually")).toBe(100);
    expect(monthlyEquivalent(1000, "one_time")).toBe(0);
    expect(monthlyEquivalent(250, "custom")).toBe(250);
  });
});

describe("effectiveMonthlyValue", () => {
  it("prefers subscription custom price, then package, then sponsor", () => {
    expect(
      effectiveMonthlyValue({
        sponsorMonthlyPrice: 100,
        sponsorBillingFrequency: "monthly",
        subscriptionCustomMonthlyPrice: 750,
        packageBasePrice: 500,
        packageBillingFrequency: "monthly",
      }),
    ).toBe(750);

    expect(
      effectiveMonthlyValue({
        sponsorMonthlyPrice: 100,
        sponsorBillingFrequency: "monthly",
        subscriptionCustomMonthlyPrice: null,
        packageBasePrice: 1200,
        packageBillingFrequency: "annually",
      }),
    ).toBe(100);

    expect(
      effectiveMonthlyValue({
        sponsorMonthlyPrice: 900,
        sponsorBillingFrequency: "quarterly",
      }),
    ).toBe(300);
  });
});

describe("invoice payment math", () => {
  it("sums payments and computes balance", () => {
    const payments = [{ amount: 200 }, { amount: 150 }];
    expect(paidAmount(payments)).toBe(350);
    expect(invoiceBalance({ amount: 500 }, payments)).toBe(150);
    expect(invoiceBalance({ amount: 300 }, payments)).toBe(0); // never negative
  });

  it("derives status: full, partial, overdue, void", () => {
    expect(
      computeInvoiceStatus({ amount: 500, status: "sent", due_date: "2026-08-15" }, [{ amount: 500 }], NOW),
    ).toBe("paid");

    expect(
      computeInvoiceStatus({ amount: 500, status: "sent", due_date: "2026-08-15" }, [{ amount: 200 }], NOW),
    ).toBe("partially_paid");

    // Past due, unpaid -> overdue
    expect(
      computeInvoiceStatus({ amount: 500, status: "sent", due_date: "2026-07-15" }, [], NOW),
    ).toBe("overdue");

    // Void always wins
    expect(
      computeInvoiceStatus({ amount: 500, status: "void", due_date: "2026-07-15" }, [], NOW),
    ).toBe("void");
  });
});

describe("sponsorPaymentStatus", () => {
  it("returns no_invoice when there are none", () => {
    expect(sponsorPaymentStatus([], new Map(), NOW)).toBe("no_invoice");
  });

  it("overdue takes precedence", () => {
    const invoices = [
      { id: "a", amount: 500, status: "paid" as const, due_date: "2026-06-15", invoice_date: "2026-06-01" },
      { id: "b", amount: 500, status: "sent" as const, due_date: "2026-07-15", invoice_date: "2026-07-01" },
    ];
    const pay = new Map([["a", [{ amount: 500 }]]]);
    expect(sponsorPaymentStatus(invoices, pay, NOW)).toBe("overdue");
  });
});

describe("service month helpers", () => {
  it("computes current service month and offsets", () => {
    expect(currentServiceMonth(NOW)).toBe("2026-07-01");
    expect(addMonths("2026-07-01", 1)).toBe("2026-08-01");
    expect(addMonths("2026-01-01", -1)).toBe("2025-12-01");
  });

  it("counts days until a date", () => {
    expect(daysUntil("2026-07-30", NOW)).toBe(0);
    expect(daysUntil("2026-08-09", NOW)).toBe(10);
    expect(daysUntil("2026-07-20", NOW)).toBe(-10);
  });
});
