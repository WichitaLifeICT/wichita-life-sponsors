import { createClient } from "@/lib/supabase/server";
import type { SponsorAsset } from "@/types/database";
import { ASSET_BUCKET } from "@/lib/config";

export interface AssetRow extends SponsorAsset {
  sponsorName: string;
  url: string | null; // signed URL (uploads) or external URL
  isImage: boolean;
}

const IMAGE_MIME = /^image\//;

async function signAndEnrich(
  supabase: Awaited<ReturnType<typeof createClient>>,
  assets: SponsorAsset[],
  sponsorNames: Map<string, string>,
): Promise<AssetRow[]> {
  const paths = assets
    .filter((a) => a.file_url)
    .map((a) => a.file_url as string);

  const signed = new Map<string, string>();
  if (paths.length > 0) {
    const { data } = await supabase.storage
      .from(ASSET_BUCKET)
      .createSignedUrls(paths, 3600);
    for (const s of data ?? []) {
      if (s.signedUrl && s.path) signed.set(s.path, s.signedUrl);
    }
  }

  return assets.map((a) => ({
    ...a,
    sponsorName: sponsorNames.get(a.sponsor_id) ?? "Unknown",
    url: a.file_url ? signed.get(a.file_url) ?? null : a.external_url,
    isImage: !!a.mime_type && IMAGE_MIME.test(a.mime_type),
  }));
}

export interface AssetFilters {
  sponsorId?: string;
  type?: string;
}

export async function getAssetsData(filters: AssetFilters = {}): Promise<{
  assets: AssetRow[];
  sponsors: { id: string; name: string }[];
}> {
  const supabase = await createClient();

  let q = supabase
    .from("sponsor_assets")
    .select("*")
    .order("created_at", { ascending: false });
  if (filters.sponsorId) q = q.eq("sponsor_id", filters.sponsorId);
  if (filters.type) q = q.eq("asset_type", filters.type);

  const [{ data: assets }, { data: sponsors }] = await Promise.all([
    q,
    supabase.from("sponsors").select("id, company_name").order("company_name"),
  ]);

  const names = new Map(
    (sponsors ?? []).map((s) => [s.id as string, s.company_name as string]),
  );
  const rows = await signAndEnrich(supabase, (assets ?? []) as SponsorAsset[], names);

  return {
    assets: rows,
    sponsors: (sponsors ?? []).map((s) => ({
      id: s.id as string,
      name: s.company_name as string,
    })),
  };
}

export async function getSponsorAssets(sponsorId: string): Promise<AssetRow[]> {
  const supabase = await createClient();
  const [{ data: assets }, { data: sponsor }] = await Promise.all([
    supabase
      .from("sponsor_assets")
      .select("*")
      .eq("sponsor_id", sponsorId)
      .order("created_at", { ascending: false }),
    supabase.from("sponsors").select("company_name").eq("id", sponsorId).maybeSingle(),
  ]);
  const names = new Map([[sponsorId, (sponsor?.company_name as string) ?? "Unknown"]]);
  return signAndEnrich(supabase, (assets ?? []) as SponsorAsset[], names);
}
