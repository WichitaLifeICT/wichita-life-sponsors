import { describe, it, expect } from "vitest";

import { resolveEffectiveDeliverables } from "@/lib/domain/deliverable-rules";

const rule = (
  deliverable_type: string,
  quantity: number,
  recurrence = "monthly",
) => ({ deliverable_type, quantity, recurrence }) as never;

describe("resolveEffectiveDeliverables", () => {
  it("returns package rules unchanged when there are no overrides", () => {
    const result = resolveEffectiveDeliverables(
      [rule("newsletter_placement", 2), rule("social_post", 1)],
      [],
    );
    expect(result).toHaveLength(2);
    expect(result.find((r) => r.deliverable_type === "newsletter_placement"))
      .toMatchObject({ quantity: 2, overridden: false, added: false });
  });

  it("override replaces quantity for a type", () => {
    const result = resolveEffectiveDeliverables(
      [rule("newsletter_placement", 1)],
      [rule("newsletter_placement", 3)],
    );
    expect(result).toEqual([
      expect.objectContaining({
        deliverable_type: "newsletter_placement",
        quantity: 3,
        overridden: true,
        added: false,
      }),
    ]);
  });

  it("override quantity 0 removes a deliverable type", () => {
    const result = resolveEffectiveDeliverables(
      [rule("newsletter_placement", 2), rule("social_post", 1)],
      [rule("social_post", 0)],
    );
    expect(result).toHaveLength(1);
    expect(result[0].deliverable_type).toBe("newsletter_placement");
  });

  it("override for a new type adds it and marks it added", () => {
    const result = resolveEffectiveDeliverables(
      [rule("newsletter_placement", 1)],
      [rule("website_banner", 1)],
    );
    const banner = result.find((r) => r.deliverable_type === "website_banner");
    expect(banner).toMatchObject({ quantity: 1, overridden: true, added: true });
  });
});
