import Link from "next/link";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { CarryForwardButton } from "@/components/deliverables/carry-forward-button";
import { deliverableTypeLabel } from "@/lib/labels";
import { formatDate, formatMonthShort, humanize } from "@/lib/format";
import type { MonthlyDeliverableRow } from "@/lib/data/deliverables";

const STATUS_VARIANT: Record<string, BadgeProps["variant"]> = {
  published: "success",
  approved: "success",
  scheduled: "secondary",
  ready_for_review: "secondary",
  drafting: "secondary",
  waiting_on_assets: "warning",
  not_scheduled: "outline",
  carried_forward: "warning",
  skipped: "outline",
  canceled: "destructive",
};

const ASSET_VARIANT: Record<string, BadgeProps["variant"]> = {
  received: "success",
  partial: "warning",
  missing: "destructive",
  not_needed: "outline",
};

const CARRYABLE = new Set(["not_scheduled", "waiting_on_assets", "drafting"]);

export function DeliverablesTable({ rows }: { rows: MonthlyDeliverableRow[] }) {
  return (
    <div className="rounded-lg border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Sponsor</TableHead>
            <TableHead>Deliverable</TableHead>
            <TableHead>Owed for</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Assets</TableHead>
            <TableHead>Due</TableHead>
            <TableHead>Scheduled</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((d) => {
            const carried = d.original_service_month !== d.service_month;
            return (
              <TableRow key={d.id}>
                <TableCell className="font-medium">
                  <Link href={`/sponsors/${d.sponsor_id}`} className="hover:underline">
                    {d.sponsorName}
                  </Link>
                </TableCell>
                <TableCell>{deliverableTypeLabel(d.deliverable_type)}</TableCell>
                <TableCell className="whitespace-nowrap text-muted-foreground">
                  {formatMonthShort(d.original_service_month)}
                  {carried && (
                    <Badge variant="warning" className="ml-2">
                      carried
                    </Badge>
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant={STATUS_VARIANT[d.status] ?? "outline"}>
                    {humanize(d.status)}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={ASSET_VARIANT[d.asset_status] ?? "outline"}>
                    {humanize(d.asset_status)}
                  </Badge>
                </TableCell>
                <TableCell className="whitespace-nowrap text-muted-foreground">
                  {formatDate(d.due_date)}
                </TableCell>
                <TableCell className="whitespace-nowrap text-muted-foreground">
                  {formatDate(d.scheduled_date)}
                </TableCell>
                <TableCell className="text-right">
                  {CARRYABLE.has(d.status) && <CarryForwardButton id={d.id} />}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
