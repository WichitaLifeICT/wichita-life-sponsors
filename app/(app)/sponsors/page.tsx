import type { Metadata } from "next";
import Link from "next/link";
import { Building2, Plus, Upload } from "lucide-react";

import { getSponsorListData, type SponsorFilters } from "@/lib/data/sponsors";
import type { SponsorStatus } from "@/types/database";
import type { SponsorPaymentStatus } from "@/lib/domain/billing";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { SponsorSummaryCards } from "@/components/sponsors/summary-cards";
import { SponsorFilters as Filters } from "@/components/sponsors/sponsor-filters";
import { SponsorsTable } from "@/components/sponsors/sponsors-table";

export const metadata: Metadata = { title: "Sponsors — Wichita Life" };

type SearchParams = Record<string, string | string[] | undefined>;

function str(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

export default async function SponsorsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;

  const filters: SponsorFilters = {
    q: str(sp.q),
    status: (str(sp.status) as SponsorStatus | "all") || undefined,
    packageId: str(sp.packageId),
    expiring: str(sp.expiring) === "1",
    payment: str(sp.payment) as SponsorPaymentStatus | "unpaid" | "all" | undefined,
    sort: str(sp.sort),
    page: Number(str(sp.page) ?? "1") || 1,
  };

  const { rows, summary, total, page, pageSize, packages } =
    await getSponsorListData(filters);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const hasAnySponsors = summary.total > 0;

  const pageHref = (n: number) => {
    const next = new URLSearchParams();
    for (const [k, v] of Object.entries(sp)) {
      const s = str(v);
      if (s) next.set(k, s);
    }
    next.set("page", String(n));
    return `/sponsors?${next.toString()}`;
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sponsors"
        description="Every sponsor, their package, payment status, and deliverables."
        actions={
          <div className="flex items-center gap-2">
            <Button asChild variant="outline">
              <Link href="/sponsors/import">
                <Upload className="size-4" />
                Import
              </Link>
            </Button>
            <Button asChild>
              <Link href="/sponsors/new">
                <Plus className="size-4" />
                New sponsor
              </Link>
            </Button>
          </div>
        }
      />

      <SponsorSummaryCards summary={summary} />

      {!hasAnySponsors ? (
        <EmptyState
          icon={Building2}
          title="No sponsors yet"
          description="Add your first sponsor, or run the demo seed to explore with sample data."
          action={
            <Button asChild>
              <Link href="/sponsors/new">
                <Plus className="size-4" />
                New sponsor
              </Link>
            </Button>
          }
        />
      ) : (
        <div className="space-y-4">
          <Filters packages={packages} />

          {rows.length === 0 ? (
            <EmptyState
              icon={Building2}
              title="No sponsors match your filters"
              description="Try clearing a filter or adjusting your search."
            />
          ) : (
            <>
              <SponsorsTable rows={rows} />
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>
                  {total} sponsor{total === 1 ? "" : "s"}
                  {totalPages > 1 && ` · page ${page} of ${totalPages}`}
                </span>
                {totalPages > 1 && (
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      asChild
                      disabled={page <= 1}
                    >
                      <Link href={pageHref(Math.max(1, page - 1))}>Previous</Link>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      asChild
                      disabled={page >= totalPages}
                    >
                      <Link href={pageHref(Math.min(totalPages, page + 1))}>
                        Next
                      </Link>
                    </Button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
