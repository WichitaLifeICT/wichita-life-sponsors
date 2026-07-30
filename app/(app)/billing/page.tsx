import type { Metadata } from "next";
import { Receipt } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata: Metadata = { title: "Billing — Wichita Life" };

export default function BillingPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Billing"
        description="Track invoices and payments, and see who still owes you."
      />
      <EmptyState
        icon={Receipt}
        title="Billing is on the way"
        description="Invoice and payment tracking with frequency-aware status arrives in a later stage."
      />
    </div>
  );
}
