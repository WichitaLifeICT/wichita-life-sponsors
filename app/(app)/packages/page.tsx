import type { Metadata } from "next";
import { Boxes } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata: Metadata = { title: "Packages — Wichita Life" };

export default function PackagesPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Packages"
        description="Define sponsorship levels and the recurring deliverables they include."
      />
      <EmptyState
        icon={Boxes}
        title="Packages are on the way"
        description="Create, edit, duplicate, and deactivate packages with deliverable rules in a later stage."
      />
    </div>
  );
}
