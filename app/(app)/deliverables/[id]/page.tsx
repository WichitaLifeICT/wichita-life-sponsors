import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { getDeliverableDetail } from "@/lib/data/deliverables";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DeliverableStatusBadge } from "@/components/deliverables/status-badge";
import { DeliverableDetailForm } from "@/components/deliverables/deliverable-detail-form";
import { DeleteDeliverableButton } from "@/components/deliverables/delete-deliverable-button";
import { deliverableTypeLabel } from "@/lib/labels";
import { formatDate, formatMonth, humanize } from "@/lib/format";

export const metadata: Metadata = { title: "Deliverable — Wichita Life" };

export default async function DeliverableDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const detail = await getDeliverableDetail(id);
  if (!detail) notFound();

  const { deliverable: d, sponsorName, packageName, assignedSlotLabel, history } =
    detail;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <Button asChild variant="ghost" size="sm" className="mb-2 -ml-2">
          <Link href="/deliverables">
            <ArrowLeft className="size-4" />
            Deliverables
          </Link>
        </Button>
        <PageHeader
          title={deliverableTypeLabel(d.deliverable_type)}
          description={
            <>
              <Link href={`/sponsors/${d.sponsor_id}`} className="hover:underline">
                {sponsorName}
              </Link>
              {d.title ? ` · ${d.title}` : ""}
            </>
          }
          actions={
            <div className="flex items-center gap-2">
              <DeliverableStatusBadge status={d.status} />
              <DeleteDeliverableButton
                id={d.id}
                label={deliverableTypeLabel(d.deliverable_type)}
                returnTo="/deliverables"
              />
            </div>
          }
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Details</CardTitle>
            </CardHeader>
            <CardContent>
              <DeliverableDetailForm deliverable={d} />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Context</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <Row label="Sponsor" value={sponsorName} />
              <Row label="Package" value={packageName ?? "—"} />
              <Row label="Service month" value={formatMonth(d.service_month)} />
              <Row
                label="Originally owed"
                value={formatMonth(d.original_service_month)}
              />
              <Row label="Assigned slot" value={assignedSlotLabel ?? "—"} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Status history</CardTitle>
            </CardHeader>
            <CardContent>
              {history.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No status changes recorded yet.
                </p>
              ) : (
                <ol className="space-y-3">
                  {history.map((h) => (
                    <li key={h.id} className="text-sm">
                      <div className="flex items-center gap-1">
                        <span className="text-muted-foreground">
                          {h.from_status ? humanize(h.from_status) : "Created"}
                        </span>
                        <span className="text-muted-foreground">→</span>
                        <span className="font-medium">{humanize(h.to_status)}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(h.changed_at, "MMM d, yyyy · h:mm a")}
                        {h.changedByName ? ` · ${h.changedByName}` : ""}
                        {h.note ? ` · ${h.note}` : ""}
                      </p>
                    </li>
                  ))}
                </ol>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}
