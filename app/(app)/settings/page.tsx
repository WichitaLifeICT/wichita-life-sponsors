import type { Metadata } from "next";
import Link from "next/link";
import { Upload } from "lucide-react";

import { getSessionContext } from "@/lib/data/session";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { RemoveDemoButton } from "@/components/settings/remove-demo-button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata: Metadata = { title: "Settings — Wichita Life" };

const str = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const session = await getSessionContext();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="Organization, channels, and account preferences."
      />

      {str(sp.removed) !== undefined && (
        <p className="rounded-md bg-success/10 px-3 py-2 text-sm text-success">
          Removed {str(sp.removed)} demo record
          {str(sp.removed) === "1" ? "" : "s"} (plus their related rows). Your real
          data is untouched.
        </p>
      )}

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

      <Card>
        <CardHeader>
          <CardTitle>Data management</CardTitle>
          <CardDescription>
            Import your real sponsors and clear out the sample data.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href="/sponsors/import">
              <Upload className="size-4" />
              Import sponsors (CSV)
            </Link>
          </Button>
          <RemoveDemoButton />
        </CardContent>
      </Card>

      <p className="text-sm text-muted-foreground">
        Organization settings and channel configuration arrive in a later stage.
      </p>
    </div>
  );
}
