import type { Metadata } from "next";
import { CalendarDays } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata: Metadata = { title: "Calendar — Wichita Life" };

export default function CalendarPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Content Calendar"
        description="Manage newsletter and social inventory and schedule sponsor placements."
      />
      <EmptyState
        icon={CalendarDays}
        title="Content calendar is on the way"
        description="Month, week, and agenda views with content slots and capacity arrive in a later stage."
      />
    </div>
  );
}
