"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

import { bulkUpdateDeliverables } from "@/lib/actions/deliverables";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { DeleteDeliverableButton } from "@/components/deliverables/delete-deliverable-button";
import {
  DeliverableStatusBadge,
  AssetStatusBadge,
} from "@/components/deliverables/status-badge";
import { deliverableTypeLabel, DELIVERABLE_STATUSES } from "@/lib/labels";
import { formatDate, formatMonthShort, humanize } from "@/lib/format";
import type { MonthlyDeliverableRow } from "@/lib/data/deliverables";

export function WorkspaceTable({
  rows,
  month,
}: {
  rows: MonthlyDeliverableRow[];
  month: string;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const allSelected = rows.length > 0 && selected.size === rows.length;
  const idsJson = useMemo(() => JSON.stringify([...selected]), [selected]);

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const toggleAll = () =>
    setSelected(allSelected ? new Set() : new Set(rows.map((r) => r.id)));

  return (
    <div className="space-y-3">
      {selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-muted/40 p-2">
          <span className="px-2 text-sm font-medium">{selected.size} selected</span>

          <BulkForm ids={idsJson} month={month} action="mark_published">
            <Button type="submit" size="sm" variant="outline">
              Mark published
            </Button>
          </BulkForm>

          <BulkForm ids={idsJson} month={month} action="mark_assets_received">
            <Button type="submit" size="sm" variant="outline">
              Assets received
            </Button>
          </BulkForm>

          <BulkForm ids={idsJson} month={month} action="carry_forward">
            <Button type="submit" size="sm" variant="outline">
              Carry forward
            </Button>
          </BulkForm>

          <form action={bulkUpdateDeliverables} className="flex items-center gap-1">
            <input type="hidden" name="ids" value={idsJson} />
            <input type="hidden" name="month" value={month} />
            <input type="hidden" name="action" value="set_status" />
            <select
              name="value"
              defaultValue="scheduled"
              className="h-8 rounded-md border border-input bg-transparent px-2 text-sm"
              aria-label="Set status to"
            >
              {DELIVERABLE_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {humanize(s)}
                </option>
              ))}
            </select>
            <Button type="submit" size="sm" variant="outline">
              Set status
            </Button>
          </form>

          <form action={bulkUpdateDeliverables} className="flex items-center gap-1">
            <input type="hidden" name="ids" value={idsJson} />
            <input type="hidden" name="month" value={month} />
            <input type="hidden" name="action" value="set_due_date" />
            <Input
              type="date"
              name="value"
              className="h-8 w-[150px]"
              aria-label="Set due date"
            />
            <Button type="submit" size="sm" variant="outline">
              Set due
            </Button>
          </form>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="text-destructive"
              >
                Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  Delete {selected.size} deliverable
                  {selected.size === 1 ? "" : "s"}?
                </AlertDialogTitle>
                <AlertDialogDescription>
                  They’ll be permanently removed, including any calendar
                  assignment. This can’t be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <form action={bulkUpdateDeliverables}>
                  <input type="hidden" name="ids" value={idsJson} />
                  <input type="hidden" name="month" value={month} />
                  <input type="hidden" name="action" value="delete" />
                  <Button type="submit" variant="destructive">
                    Delete
                  </Button>
                </form>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )}

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleAll}
                  aria-label="Select all"
                  className="size-4 rounded border-input"
                />
              </TableHead>
              <TableHead>Sponsor</TableHead>
              <TableHead>Deliverable</TableHead>
              <TableHead>Owed for</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Assets</TableHead>
              <TableHead>Due</TableHead>
              <TableHead>Scheduled</TableHead>
              <TableHead>Slot</TableHead>
              <TableHead className="text-right">Open</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((d) => {
              const carried = d.original_service_month !== d.service_month;
              return (
                <TableRow key={d.id} data-state={selected.has(d.id) ? "selected" : undefined}>
                  <TableCell>
                    <input
                      type="checkbox"
                      checked={selected.has(d.id)}
                      onChange={() => toggle(d.id)}
                      aria-label={`Select ${d.sponsorName} ${d.deliverable_type}`}
                      className="size-4 rounded border-input"
                    />
                  </TableCell>
                  <TableCell className="font-medium">
                    <Link href={`/sponsors/${d.sponsor_id}`} className="hover:underline">
                      {d.sponsorName}
                    </Link>
                  </TableCell>
                  <TableCell>{deliverableTypeLabel(d.deliverable_type)}</TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    {formatMonthShort(d.original_service_month)}
                    {carried && " (carried)"}
                  </TableCell>
                  <TableCell>
                    <DeliverableStatusBadge status={d.status} />
                  </TableCell>
                  <TableCell>
                    <AssetStatusBadge status={d.asset_status} />
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    {formatDate(d.due_date)}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    {formatDate(d.scheduled_date)}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                    {d.assignedSlotLabel ?? "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Link
                        href={`/deliverables/${d.id}`}
                        className="text-sm text-primary hover:underline"
                      >
                        Open
                      </Link>
                      <DeleteDeliverableButton
                        id={d.id}
                        label={`${d.sponsorName} · ${deliverableTypeLabel(d.deliverable_type)}`}
                        returnTo={`/deliverables?month=${month}`}
                      />
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function BulkForm({
  ids,
  month,
  action,
  children,
}: {
  ids: string;
  month: string;
  action: string;
  children: React.ReactNode;
}) {
  return (
    <form action={bulkUpdateDeliverables}>
      <input type="hidden" name="ids" value={ids} />
      <input type="hidden" name="month" value={month} />
      <input type="hidden" name="action" value={action} />
      {children}
    </form>
  );
}
