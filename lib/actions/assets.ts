"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { getSessionContext } from "@/lib/data/session";
import { ASSET_BUCKET } from "@/lib/config";

export interface AssetResult {
  ok: boolean;
  error?: string;
}

export interface UploadedAssetInput {
  name: string;
  asset_type: string;
  path: string;
  size: number;
  mime: string;
  deliverable_id?: string | null;
}

/** Record an asset that was already uploaded to storage by the browser. */
export async function recordUploadedAsset(
  sponsorId: string,
  input: UploadedAssetInput,
): Promise<AssetResult> {
  const session = await getSessionContext();
  if (!session?.organization) return { ok: false, error: "Session expired." };

  const supabase = await createClient();
  const { error } = await supabase.from("sponsor_assets").insert({
    organization_id: session.organization.id,
    sponsor_id: sponsorId,
    deliverable_id: input.deliverable_id || null,
    asset_type: input.asset_type,
    name: input.name,
    file_url: input.path,
    file_size: input.size,
    mime_type: input.mime,
  });
  if (error) return { ok: false, error: "Could not save the asset record." };

  revalidatePath("/assets");
  revalidatePath(`/sponsors/${sponsorId}`);
  return { ok: true };
}

export async function addExternalAsset(
  sponsorId: string,
  input: { name: string; asset_type: string; external_url: string; deliverable_id?: string | null },
): Promise<AssetResult> {
  const session = await getSessionContext();
  if (!session?.organization) return { ok: false, error: "Session expired." };
  if (!input.external_url) return { ok: false, error: "Enter a URL." };

  const supabase = await createClient();
  const { error } = await supabase.from("sponsor_assets").insert({
    organization_id: session.organization.id,
    sponsor_id: sponsorId,
    deliverable_id: input.deliverable_id || null,
    asset_type: input.asset_type,
    name: input.name,
    external_url: input.external_url,
  });
  if (error) return { ok: false, error: "Could not save the link." };

  revalidatePath("/assets");
  revalidatePath(`/sponsors/${sponsorId}`);
  return { ok: true };
}

/** Delete an asset: removes the storage object (if any) then the record. */
export async function deleteAsset(id: string, path: string | null, sponsorId: string) {
  const supabase = await createClient();
  if (path) {
    await supabase.storage.from(ASSET_BUCKET).remove([path]);
  }
  await supabase.from("sponsor_assets").delete().eq("id", id);
  revalidatePath("/assets");
  revalidatePath(`/sponsors/${sponsorId}`);
}
