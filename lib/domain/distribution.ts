import type { DistributionDealType } from "@/types/database";

export interface DropoffItemLike {
  quantity: number;
  unit_wholesale_price: number;
  unit_retail_price: number;
  quantity_sold: number;
  quantity_returned: number;
}

/** Wholesale amount owed for a drop-off: units × wholesale price per unit. */
export function wholesaleOwed(items: DropoffItemLike[]): number {
  return round2(
    items.reduce((sum, i) => sum + i.quantity * i.unit_wholesale_price, 0),
  );
}

/** Consignment: revenue from units sold, at retail price. */
export function consignmentSoldRevenue(items: DropoffItemLike[]): number {
  return round2(
    items.reduce((sum, i) => sum + i.quantity_sold * i.unit_retail_price, 0),
  );
}

/** Consignment: your cut = sold revenue × your rate (e.g. 0.70). */
export function consignmentCut(items: DropoffItemLike[], rate: number): number {
  return round2(consignmentSoldRevenue(items) * rate);
}

/** Units still on the shelf: dropped − sold − returned (never negative). */
export function unitsOnShelf(items: DropoffItemLike[]): number {
  return items.reduce(
    (sum, i) => sum + Math.max(0, i.quantity - i.quantity_sold - i.quantity_returned),
    0,
  );
}

export function totalUnits(items: DropoffItemLike[]): number {
  return items.reduce((sum, i) => sum + i.quantity, 0);
}

/** The headline value of a drop-off depending on its deal type. */
export function dropoffValue(
  dealType: DistributionDealType,
  items: DropoffItemLike[],
  rate: number,
): number {
  return dealType === "wholesale"
    ? wholesaleOwed(items)
    : consignmentCut(items, rate);
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
