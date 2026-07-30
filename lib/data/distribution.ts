import { createClient } from "@/lib/supabase/server";
import type {
  DistributionDropoff,
  DistributionDropoffItem,
  DistributionLocation,
  DistributionProduct,
} from "@/types/database";
import {
  dropoffValue,
  wholesaleOwed,
  consignmentCut,
  unitsOnShelf,
  totalUnits,
} from "@/lib/domain/distribution";

export async function getProducts(): Promise<DistributionProduct[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("distribution_products")
    .select("*")
    .order("name", { ascending: true });
  return (data ?? []) as DistributionProduct[];
}

export async function getLocations(): Promise<DistributionLocation[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("distribution_locations")
    .select("*")
    .order("name", { ascending: true });
  return (data ?? []) as DistributionLocation[];
}

export interface DropoffRow extends DistributionDropoff {
  locationName: string;
  itemCount: number;
  units: number;
  onShelf: number;
  value: number;
}

export interface DistributionSummary {
  wholesaleOutstanding: number;
  wholesaleCollected: number;
  consignmentCutEarned: number;
  unitsOnShelf: number;
}

export interface DistributionData {
  dropoffs: DropoffRow[];
  products: DistributionProduct[];
  locations: DistributionLocation[];
  summary: DistributionSummary;
}

export async function getDistributionData(): Promise<DistributionData> {
  const supabase = await createClient();
  const [{ data: dropoffs }, { data: items }, { data: locations }, { data: products }] =
    await Promise.all([
      supabase
        .from("distribution_dropoffs")
        .select("*")
        .order("delivered_date", { ascending: false }),
      supabase.from("distribution_dropoff_items").select("*"),
      supabase
        .from("distribution_locations")
        .select("*")
        .order("name", { ascending: true }),
      supabase
        .from("distribution_products")
        .select("*")
        .order("name", { ascending: true }),
    ]);

  const itemsByDropoff = new Map<string, DistributionDropoffItem[]>();
  for (const it of (items ?? []) as DistributionDropoffItem[]) {
    const arr = itemsByDropoff.get(it.dropoff_id) ?? [];
    arr.push(it);
    itemsByDropoff.set(it.dropoff_id, arr);
  }
  const locationName = new Map(
    (locations ?? []).map((l) => [l.id as string, l.name as string]),
  );

  let wholesaleOutstanding = 0;
  let wholesaleCollected = 0;
  let consignmentCutEarned = 0;
  let shelf = 0;

  const rows: DropoffRow[] = ((dropoffs ?? []) as DistributionDropoff[]).map((d) => {
    const its = itemsByDropoff.get(d.id) ?? [];
    const value = dropoffValue(d.deal_type, its, d.consignment_rate);
    const onShelf = unitsOnShelf(its);

    if (d.deal_type === "wholesale") {
      const owed = wholesaleOwed(its);
      if (d.paid) wholesaleCollected += owed;
      else wholesaleOutstanding += owed;
    } else {
      consignmentCutEarned += consignmentCut(its, d.consignment_rate);
      if (!d.settled) shelf += onShelf;
    }

    return {
      ...d,
      locationName: locationName.get(d.location_id) ?? "Unknown",
      itemCount: its.length,
      units: totalUnits(its),
      onShelf,
      value,
    };
  });

  return {
    dropoffs: rows,
    products: (products ?? []) as DistributionProduct[],
    locations: (locations ?? []) as DistributionLocation[],
    summary: {
      wholesaleOutstanding: round2(wholesaleOutstanding),
      wholesaleCollected: round2(wholesaleCollected),
      consignmentCutEarned: round2(consignmentCutEarned),
      unitsOnShelf: shelf,
    },
  };
}

export interface DropoffDetail {
  dropoff: DistributionDropoff;
  locationName: string;
  items: DistributionDropoffItem[];
}

export async function getDropoffDetail(id: string): Promise<DropoffDetail | null> {
  const supabase = await createClient();
  const { data: dropoff } = await supabase
    .from("distribution_dropoffs")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!dropoff) return null;

  const [{ data: location }, { data: items }] = await Promise.all([
    supabase
      .from("distribution_locations")
      .select("name")
      .eq("id", (dropoff as DistributionDropoff).location_id)
      .maybeSingle(),
    supabase
      .from("distribution_dropoff_items")
      .select("*")
      .eq("dropoff_id", id)
      .order("created_at", { ascending: true }),
  ]);

  return {
    dropoff: dropoff as DistributionDropoff,
    locationName: (location?.name as string) ?? "Unknown",
    items: (items ?? []) as DistributionDropoffItem[],
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
