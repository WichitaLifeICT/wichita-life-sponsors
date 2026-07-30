import { describe, it, expect } from "vitest";

import {
  wholesaleOwed,
  consignmentSoldRevenue,
  consignmentCut,
  unitsOnShelf,
  dropoffValue,
} from "@/lib/domain/distribution";

const items = [
  {
    quantity: 10,
    unit_wholesale_price: 12,
    unit_retail_price: 25,
    quantity_sold: 4,
    quantity_returned: 1,
  },
  {
    quantity: 5,
    unit_wholesale_price: 8,
    unit_retail_price: 18,
    quantity_sold: 2,
    quantity_returned: 0,
  },
];

describe("distribution math", () => {
  it("wholesale owed = units × wholesale price", () => {
    // 10*12 + 5*8 = 120 + 40 = 160
    expect(wholesaleOwed(items)).toBe(160);
  });

  it("consignment sold revenue at retail", () => {
    // 4*25 + 2*18 = 100 + 36 = 136
    expect(consignmentSoldRevenue(items)).toBe(136);
  });

  it("consignment cut at 70%", () => {
    expect(consignmentCut(items, 0.7)).toBe(95.2); // 136 * 0.7
  });

  it("units on shelf = dropped − sold − returned", () => {
    // (10-4-1) + (5-2-0) = 5 + 3 = 8
    expect(unitsOnShelf(items)).toBe(8);
  });

  it("dropoffValue switches on deal type", () => {
    expect(dropoffValue("wholesale", items, 0.7)).toBe(160);
    expect(dropoffValue("consignment", items, 0.7)).toBe(95.2);
  });
});
