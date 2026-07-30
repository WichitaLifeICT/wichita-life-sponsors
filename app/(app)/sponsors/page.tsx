import type { Metadata } from "next";
import { Building2 } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata: Metadata = { title: "Sponsors — Wichita Life" };

export default function SponsorsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Sponsors"
        description="Every sponsor, their package, payment status, and deliverables."
      />
      <EmptyState
        icon={Building2}
        title="Sponsor management is on the way"
        description="The searchable sponsor list, summary cards, and detail pages are built in the next stage."
      />
    </div>
  );
}
