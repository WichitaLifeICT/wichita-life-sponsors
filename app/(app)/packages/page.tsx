import type { Metadata } from "next";
import Link from "next/link";
import { Boxes, Plus, Users } from "lucide-react";

import { getPackagesList } from "@/lib/data/packages";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { PackageActions } from "@/components/packages/package-actions";
import { formatCurrency, humanize } from "@/lib/format";

export const metadata: Metadata = { title: "Packages — Wichita Life" };

export default async function PackagesPage() {
  const packages = await getPackagesList();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Packages"
        description="Sponsorship levels and the recurring deliverables they include."
        actions={
          <Button asChild>
            <Link href="/packages/new">
              <Plus className="size-4" />
              New package
            </Link>
          </Button>
        }
      />

      {packages.length === 0 ? (
        <EmptyState
          icon={Boxes}
          title="No packages yet"
          description="Create your first sponsorship package to define what sponsors receive."
          action={
            <Button asChild>
              <Link href="/packages/new">
                <Plus className="size-4" />
                New package
              </Link>
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {packages.map((p) => (
            <Card key={p.id} className={p.active ? "" : "opacity-70"}>
              <CardHeader className="flex-row items-start justify-between space-y-0 pb-3">
                <div className="min-w-0 space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="truncate font-semibold">{p.name}</h3>
                    {!p.active && <Badge variant="outline">Inactive</Badge>}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {formatCurrency(p.base_price)} ·{" "}
                    {humanize(p.billing_frequency)}
                  </p>
                </div>
                <PackageActions id={p.id} active={p.active} />
              </CardHeader>
              <CardContent className="space-y-3">
                {p.description && (
                  <p className="line-clamp-2 text-sm text-muted-foreground">
                    {p.description}
                  </p>
                )}
                <div>
                  <p className="mb-1 text-xs uppercase text-muted-foreground">
                    Includes monthly
                  </p>
                  {p.rules.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No deliverables defined.
                    </p>
                  ) : (
                    <ul className="space-y-0.5 text-sm">
                      {p.rules.map((r) => (
                        <li key={r.id} className="flex justify-between gap-2">
                          <span>{humanize(r.deliverable_type)}</span>
                          <span className="text-muted-foreground">
                            {r.quantity}× {humanize(r.recurrence).toLowerCase()}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div className="flex items-center gap-1.5 border-t pt-3 text-xs text-muted-foreground">
                  <Users className="size-3.5" />
                  {p.activeSponsors} active sponsor
                  {p.activeSponsors === 1 ? "" : "s"}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
