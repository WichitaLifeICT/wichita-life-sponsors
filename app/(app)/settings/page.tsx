import type { Metadata } from "next";

import { getSessionContext } from "@/lib/data/session";
import { PageHeader } from "@/components/layout/page-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata: Metadata = { title: "Settings — Wichita Life" };

export default async function SettingsPage() {
  const session = await getSessionContext();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="Organization, channels, and account preferences."
      />

      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
          <CardDescription>Your signed-in details.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Name</span>
            <span className="font-medium">
              {session?.profile?.full_name ?? "—"}
            </span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Email</span>
            <span className="font-medium">{session?.email ?? "—"}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Role</span>
            <span className="font-medium capitalize">
              {session?.profile?.role?.replace("_", " ") ?? "—"}
            </span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Organization</span>
            <span className="font-medium">
              {session?.organization?.name ?? "—"}
            </span>
          </div>
        </CardContent>
      </Card>

      <p className="text-sm text-muted-foreground">
        Organization settings, channel configuration, and data export arrive in a
        later stage.
      </p>
    </div>
  );
}
