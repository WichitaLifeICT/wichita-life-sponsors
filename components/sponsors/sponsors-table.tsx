import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SponsorStatusBadge, PaymentStatusBadge } from "@/components/sponsors/badges";
import { formatCurrency, formatDate } from "@/lib/format";
import type { EnrichedSponsor } from "@/lib/data/sponsors";

export function SponsorsTable({ rows }: { rows: EnrichedSponsor[] }) {
  return (
    <div className="rounded-lg border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Company</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Package</TableHead>
            <TableHead className="text-right">Monthly value</TableHead>
            <TableHead>Contract</TableHead>
            <TableHead>Payment</TableHead>
            <TableHead className="text-center">Owed this mo.</TableHead>
            <TableHead>Next placement</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((s) => (
            <TableRow key={s.id}>
              <TableCell className="font-medium">
                <Link
                  href={`/sponsors/${s.id}`}
                  className="hover:underline"
                >
                  {s.company_name}
                </Link>
                {s.industry && (
                  <p className="text-xs text-muted-foreground">{s.industry}</p>
                )}
              </TableCell>
              <TableCell>
                <SponsorStatusBadge status={s.status} />
              </TableCell>
              <TableCell className="whitespace-nowrap text-muted-foreground">
                {s.packageName ?? "—"}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {s.monthlyValue > 0 ? formatCurrency(s.monthlyValue) : "—"}
              </TableCell>
              <TableCell className="whitespace-nowrap text-muted-foreground">
                {s.contract_start_date || s.contract_end_date ? (
                  <span className="text-xs">
                    {formatDate(s.contract_start_date)} →{" "}
                    {formatDate(s.contract_end_date)}
                  </span>
                ) : (
                  "—"
                )}
              </TableCell>
              <TableCell>
                <PaymentStatusBadge status={s.paymentStatus} />
              </TableCell>
              <TableCell className="text-center tabular-nums">
                {s.remainingThisMonth > 0 ? (
                  <span className="font-medium">{s.remainingThisMonth}</span>
                ) : (
                  <span className="text-muted-foreground">0</span>
                )}
              </TableCell>
              <TableCell className="whitespace-nowrap text-muted-foreground">
                {s.nextScheduledDate ? formatDate(s.nextScheduledDate) : "—"}
              </TableCell>
              <TableCell className="text-right">
                <Link
                  href={`/sponsors/${s.id}`}
                  className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                >
                  View
                  <ArrowUpRight className="size-3.5" />
                </Link>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
