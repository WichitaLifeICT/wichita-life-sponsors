import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Trash2 } from "lucide-react";

import { getDropoffDetail } from "@/lib/data/distribution";
import {
  wholesaleOwed,
  consignmentSoldRevenue,
  consignmentCut,
  unitsOnShelf,
} from "@/lib/domain/distribution";
import {
  toggleDropoffPaid,
  toggleDropoffSettled,
  deleteDropoff,
} from "@/lib/actions/distribution";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { RecordSales } from "@/components/distribution/record-sales";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { formatCurrency, formatDate, humanize } from "@/lib/format";

export const metadata: Metadata = { title: "Drop-off — Wichita Life" };

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-xl font-semibold tabular-nums">{value}</p>
      </CardContent>
    </Card>
  );
}

export default async function DropoffDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const detail = await getDropoffDetail(id);
  if (!detail) notFound();

  const { dropoff, locationName, items } = detail;
  const isWholesale = dropoff.deal_type === "wholesale";
  const owed = wholesaleOwed(items);
  const soldRevenue = consignmentSoldRevenue(items);
  const cut = consignmentCut(items, dropoff.consignment_rate);
  const shelf = unitsOnShelf(items);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <Button asChild variant="ghost" size="sm" className="mb-2 -ml-2">
          <Link href="/distribution">
            <ArrowLeft className="size-4" />
            Distribution
          </Link>
        </Button>
        <PageHeader
          title={locationName}
          description={`${humanize(dropoff.deal_type)} · delivered ${formatDate(dropoff.delivered_date)}`}
          actions={
            <div className="flex items-center gap-2">
              {isWholesale ? (
                <form action={toggleDropoffPaid.bind(null, id, dropoff.paid)}>
                  <Button type="submit" variant={dropoff.paid ? "outline" : "default"}>
                    {dropoff.paid ? "Mark unpaid" : "Mark paid"}
                  </Button>
                </form>
              ) : (
                <form action={toggleDropoffSettled.bind(null, id, dropoff.settled)}>
                  <Button type="submit" variant={dropoff.settled ? "outline" : "default"}>
                    {dropoff.settled ? "Reopen" : "Mark settled"}
                  </Button>
                </form>
              )}
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="icon" aria-label="Delete drop-off">
                    <Trash2 className="size-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete this drop-off?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This removes the drop-off and its line items. This can’t be
                      undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <form action={deleteDropoff.bind(null, id)}>
                      <Button type="submit" variant="destructive">
                        Delete
                      </Button>
                    </form>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          }
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={isWholesale ? "secondary" : "outline"}>
          {humanize(dropoff.deal_type)}
        </Badge>
        {isWholesale ? (
          <Badge variant={dropoff.paid ? "success" : "warning"}>
            {dropoff.paid ? `Paid · ${formatDate(dropoff.paid_date)}` : "Unpaid"}
          </Badge>
        ) : (
          <Badge variant={dropoff.settled ? "success" : "secondary"}>
            {dropoff.settled ? "Settled" : "Active"}
          </Badge>
        )}
      </div>

      {isWholesale ? (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
            <Stat label="Total owed" value={formatCurrency(owed)} />
            <Stat label="Units delivered" value={String(items.reduce((s, i) => s + i.quantity, 0))} />
            <Stat label="Status" value={dropoff.paid ? "Paid" : "Unpaid"} />
          </div>
          <div className="rounded-lg border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead className="text-center">Qty</TableHead>
                  <TableHead className="text-right">Wholesale $/unit</TableHead>
                  <TableHead className="text-right">Line total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((it) => (
                  <TableRow key={it.id}>
                    <TableCell className="font-medium">{it.product_name}</TableCell>
                    <TableCell className="text-center tabular-nums">{it.quantity}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatCurrency(it.unit_wholesale_price)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatCurrency(it.quantity * it.unit_wholesale_price)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <Stat label="Sold revenue" value={formatCurrency(soldRevenue)} />
            <Stat
              label={`Your cut (${Math.round(dropoff.consignment_rate * 100)}%)`}
              value={formatCurrency(cut)}
            />
            <Stat label="On shelf" value={String(shelf)} />
            <Stat label="Delivered" value={String(items.reduce((s, i) => s + i.quantity, 0))} />
          </div>
          <div>
            <p className="mb-2 text-sm font-medium">Record what sold</p>
            <RecordSales dropoffId={id} items={items} />
          </div>
        </>
      )}

      {dropoff.notes && (
        <Card>
          <CardContent className="p-4 text-sm">
            <p className="mb-1 text-xs uppercase text-muted-foreground">Notes</p>
            {dropoff.notes}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
