import type { Metadata } from "next";
import { FolderOpen } from "lucide-react";

import { getAssetsData } from "@/lib/data/assets";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { AssetFilters } from "@/components/assets/asset-filters";
import { AssetGrid } from "@/components/assets/asset-grid";

export const metadata: Metadata = { title: "Assets — Wichita Life" };
const str = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function AssetsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const { assets, sponsors } = await getAssetsData({
    sponsorId: str(sp.sponsor),
    type: str(sp.type),
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Assets"
        description="Sponsor logos, photos, contracts, ad copy, and more. Upload files from a sponsor's page."
      />

      <AssetFilters sponsors={sponsors} />

      {assets.length === 0 ? (
        <EmptyState
          icon={FolderOpen}
          title="No assets found"
          description="Upload files from a sponsor's Assets tab, or adjust your filters."
        />
      ) : (
        <AssetGrid assets={assets} showSponsor />
      )}
    </div>
  );
}
