import type { Metadata } from "next";
import { PackageCheck } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata: Metadata = { title: "Deliverables — Wichita Life" };

export default function DeliverablesPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Deliverables"
        description="Track what you owe each sponsor by service month, status, and assets."
      />
      <EmptyState
        icon={PackageCheck}
        title="Deliverables workspace is on the way"
        description="Table and board views, filters, bulk actions, and status history arrive in a later stage."
      />
    </div>
  );
}
