import { describe, it, expect } from "vitest";

import {
  planGeneration,
  recurrenceApplies,
  existingKeyFor,
  type GenerationSubscriptionInput,
} from "@/lib/domain/generation";

function sub(
  overrides: Partial<GenerationSubscriptionInput> = {},
): GenerationSubscriptionInput {
  return {
    subscriptionId: "sub1",
    sponsorId: "sp1",
    startDate: "2026-01-01",
    endDate: null,
    status: "active",
    autoGenerate: true,
    effective: [
      { deliverable_type: "newsletter_headline", quantity: 2, recurrence: "monthly" },
      { deliverable_type: "social_post", quantity: 1, recurrence: "monthly" },
    ],
    ...overrides,
  };
}

describe("recurrenceApplies", () => {
  it("monthly every month; quarterly every 3; annual every 12; one_time only month 0", () => {
    expect(recurrenceApplies("monthly", 5)).toBe(true);
    expect(recurrenceApplies("quarterly", 0)).toBe(true);
    expect(recurrenceApplies("quarterly", 3)).toBe(true);
    expect(recurrenceApplies("quarterly", 2)).toBe(false);
    expect(recurrenceApplies("annually", 12)).toBe(true);
    expect(recurrenceApplies("annually", 6)).toBe(false);
    expect(recurrenceApplies("one_time", 0)).toBe(true);
    expect(recurrenceApplies("one_time", 1)).toBe(false);
  });
});

describe("planGeneration", () => {
  it("creates the right count for a monthly subscription", () => {
    const plan = planGeneration("2026-08-01", [sub()], new Set());
    expect(plan.toCreate).toHaveLength(3); // 2 headline + 1 social
    expect(plan.skipped).toBe(0);
    const headlines = plan.toCreate.filter(
      (d) => d.deliverable_type === "newsletter_headline",
    );
    expect(headlines.map((h) => h.sequence).sort()).toEqual([1, 2]);
    expect(headlines[0].quantity_total).toBe(2);
    expect(headlines[0].original_service_month).toBe("2026-08-01");
  });

  it("is idempotent — existing deliverables are skipped", () => {
    const existing = new Set([
      existingKeyFor("sub1", "newsletter_headline", "2026-08-01", 1),
      existingKeyFor("sub1", "newsletter_headline", "2026-08-01", 2),
      existingKeyFor("sub1", "social_post", "2026-08-01", 1),
    ]);
    const plan = planGeneration("2026-08-01", [sub()], existing);
    expect(plan.toCreate).toHaveLength(0);
    expect(plan.skipped).toBe(3);
  });

  it("adds only missing sequences when a quantity increased", () => {
    const existing = new Set([
      existingKeyFor("sub1", "newsletter_headline", "2026-08-01", 1),
    ]);
    const plan = planGeneration("2026-08-01", [sub()], existing);
    // headline seq 2 + social seq 1 remain
    expect(plan.toCreate.map((d) => `${d.deliverable_type}:${d.sequence}`).sort()).toEqual(
      ["newsletter_headline:2", "social_post:1"],
    );
    expect(plan.skipped).toBe(1);
  });

  it("ignores paused / non-auto-generate subscriptions", () => {
    expect(planGeneration("2026-08-01", [sub({ status: "paused" })], new Set()).toCreate).toHaveLength(0);
    expect(planGeneration("2026-08-01", [sub({ autoGenerate: false })], new Set()).toCreate).toHaveLength(0);
    expect(planGeneration("2026-08-01", [sub({ status: "ended" })], new Set()).toCreate).toHaveLength(0);
  });

  it("respects start and end dates", () => {
    // before start
    expect(
      planGeneration("2025-12-01", [sub({ startDate: "2026-01-01" })], new Set()).toCreate,
    ).toHaveLength(0);
    // after end
    expect(
      planGeneration("2026-09-01", [sub({ endDate: "2026-08-31" })], new Set()).toCreate,
    ).toHaveLength(0);
    // within window (end month inclusive)
    expect(
      planGeneration("2026-08-01", [sub({ endDate: "2026-08-31" })], new Set()).toCreate.length,
    ).toBeGreaterThan(0);
  });

  it("applies quarterly only on quarter months from start", () => {
    const s = sub({
      startDate: "2026-01-01",
      effective: [
        { deliverable_type: "event_banner", quantity: 1, recurrence: "quarterly" },
      ],
    });
    // Jan (month 0) -> yes
    expect(planGeneration("2026-01-01", [s], new Set()).toCreate).toHaveLength(1);
    // Feb (month 1) -> no
    expect(planGeneration("2026-02-01", [s], new Set()).toCreate).toHaveLength(0);
    // Apr (month 3) -> yes
    expect(planGeneration("2026-04-01", [s], new Set()).toCreate).toHaveLength(1);
  });

  it("applies one_time only in the start month", () => {
    const s = sub({
      startDate: "2026-03-01",
      effective: [
        { deliverable_type: "event_sponsorship", quantity: 1, recurrence: "one_time" },
      ],
    });
    expect(planGeneration("2026-03-01", [s], new Set()).toCreate).toHaveLength(1);
    expect(planGeneration("2026-04-01", [s], new Set()).toCreate).toHaveLength(0);
  });
});
