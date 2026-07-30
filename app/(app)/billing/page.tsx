import type { Metadata } from "next";
import Link from "next/link";
import { Receipt, DollarSign, AlertCircle, Wallet } from "lucide-react";

import { getBillingOverview } from "@/lib/data/billing";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency, formatCurrencyShort, humanize } from "@/lib/format";

export const metadata: Metadata = { title: "Billing — Wichita Life" };

export default async function BillingPage() {
  const overview = await getBillingOverview();

  const cards = [
    {
      label: "Contracted monthly revenue",
      value: formatCurrencyShort(overview.contractedMonthly),
      icon: DollarSign,
    },
    {
      label: "Collected",
      value: formatCurrencyShort(overview.collected),
      icon: Wallet,
    },
    {
      label: "Outstanding",
      value: formatCurrencyShort(overview.outstanding),
      icon: AlertCircle,
    },
    {
      label: "Sponsors with balance",
      value: String(overview.unpaidSponsors),
      icon: Receipt,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Billing"
        description="Track each deal's value and mark periods paid — from the contract start date."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <Card key={c.label}>
              <CardContent className="flex items-center gap-4 p-5">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted">
                  <Icon className="size-5 text-muted-foreground" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">{c.label}</p>
                  <p className="text-2xl font-semibold tracking-tight">{c.value}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {overview.rows.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title="No billable sponsors yet"
          description="Sponsors need a contract start date (set it on the sponsor) to generate billing periods."
        />
      ) : (
        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Sponsor</TableHead>
                <TableHead>Billing</TableHead>
                <TableHead className="text-right">Monthly value</TableHead>
                <TableHead className="text-center">Unpaid periods</TableHead>
                <TableHead className="text-right">Outstanding</TableHead>
                <TableHead>Latest period</TableHead>
                <TableHead className="text-right">Open</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {overview.rows.map((r) => (
                <TableRow key={r.sponsorId}>
                  <TableCell className="font-medium">
                    <Link href={`/billing/${r.sponsorId}`} className="hover:underline">
                      {r.sponsorName}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {humanize(r.frequency)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatCurrency(r.monthlyValue)}
                  </TableCell>
                  <TableCell className="text-center tabular-nums">
                    {r.unpaidCount > 0 ? (
                      <span className="font-medium">{r.unpaidCount}</span>
                    ) : (
                      <span className="text-muted-foreground">0</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {r.outstanding > 0 ? (
                      formatCurrency(r.outstanding)
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {r.latestPaid === null ? (
                      <Badge variant="outline">—</Badge>
                    ) : r.latestPaid ? (
                      <Badge variant="success">Paid</Badge>
                    ) : (
                      <Badge variant="warning">Unpaid</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Link
                      href={`/billing/${r.sponsorId}`}
                      className="text-sm text-primary hover:underline"
                    >
                      Open
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
