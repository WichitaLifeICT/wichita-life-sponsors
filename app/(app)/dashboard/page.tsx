import type { Metadata } from "next";

import { getSessionContext } from "@/lib/data/session";
import { PageHeader } from "@/components/layout/page-header";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Dashboard — Wichita Life",
};

const UPCOMING_CARDS = [
  "Active sponsors",
  "Contracted monthly revenue",
  "Deliverables due this week",
  "Outstanding invoices",
  "Missing sponsor assets",
  "Contracts expiring within 60 days",
];

export default async function DashboardPage() {
  const session = await getSessionContext();
  const firstName =
    session?.profile?.full_name?.split(" ")[0] ??
    session?.email?.split("@")[0] ??
    "there";

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Welcome, ${firstName}`}
        description="Your sponsor operations at a glance. Live figures arrive as each section is built."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {UPCOMING_CARDS.map((label) => (
          <Card key={label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold text-muted-foreground/60">
                —
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Wired up in a later stage
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
