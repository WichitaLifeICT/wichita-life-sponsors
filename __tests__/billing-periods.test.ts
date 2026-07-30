import { describe, it, expect } from "vitest";

import { generatePeriods, periodMonths } from "@/lib/domain/billing-periods";

describe("periodMonths", () => {
  it("maps frequency to length", () => {
    expect(periodMonths("monthly")).toBe(1);
    expect(periodMonths("quarterly")).toBe(3);
    expect(periodMonths("annually")).toBe(12);
    expect(periodMonths("one_time")).toBe(1);
  });
});

describe("generatePeriods", () => {
  it("monthly: one period per month from start through today", () => {
    const p = generatePeriods("2026-05-10", "monthly", "2026-08-15");
    expect(p.map((x) => x.periodStart)).toEqual([
      "2026-05-01",
      "2026-06-01",
      "2026-07-01",
      "2026-08-01",
    ]);
    expect(p[0].periodEnd).toBe("2026-05-31");
  });

  it("quarterly: 3-month periods with correct end dates", () => {
    const p = generatePeriods("2026-01-01", "quarterly", "2026-08-01");
    expect(p.map((x) => x.periodStart)).toEqual(["2026-01-01", "2026-04-01", "2026-07-01"]);
    expect(p[0].periodEnd).toBe("2026-03-31");
    expect(p[1].periodEnd).toBe("2026-06-30");
  });

  it("annually: one period per year", () => {
    const p = generatePeriods("2025-03-01", "annually", "2026-08-01");
    expect(p.map((x) => x.periodStart)).toEqual(["2025-03-01", "2026-03-01"]);
    expect(p[0].periodEnd).toBe("2026-02-28");
  });

  it("one_time: a single period", () => {
    const p = generatePeriods("2026-02-01", "one_time", "2026-08-01");
    expect(p).toHaveLength(1);
    expect(p[0].periodStart).toBe("2026-02-01");
  });

  it("caps at contract end", () => {
    const p = generatePeriods("2026-01-01", "monthly", "2026-12-01", "2026-03-31");
    expect(p.map((x) => x.periodStart)).toEqual(["2026-01-01", "2026-02-01", "2026-03-01"]);
  });

  it("returns nothing without a contract start", () => {
    expect(generatePeriods(null, "monthly", "2026-08-01")).toEqual([]);
  });
});
