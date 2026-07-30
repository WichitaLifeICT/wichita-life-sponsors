import type { Metadata } from "next";
import { FolderOpen } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata: Metadata = { title: "Assets — Wichita Life" };

export default function AssetsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Assets"
        description="Sponsor logos, photos, contracts, ad copy, and more."
      />
      <EmptyState
        icon={FolderOpen}
        title="Asset management is on the way"
        description="Secure file storage with previews and per-sponsor filtering arrives in a later stage."
      />
    </div>
  );
}
