import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { getSponsorBilling } from "@/lib/data/billing";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { PeriodLedger } from "@/components/billing/period-ledger";
import { formatCurrency, humanize } from "@/lib/format";
import { Receipt } from "lucide-react";

export const metadata: Metadata = { title: "Billing — Wichita Life" };

export default async function SponsorBillingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const billing = await getSponsorBilling(id);
  if (!billing) notFound();

  const { sponsor, monthlyValue, rows, totalDue, totalPaid, outstanding } = billing;

  const stats = [
    { label: "Monthly value", value: formatCurrency(monthlyValue) },
    { label: "Total due to date", value: formatCurrency(totalDue) },
    { label: "Paid", value: formatCurrency(totalPaid) },
    { label: "Outstanding", value: formatCurrency(outstanding) },
  ];

  return (
    <div className="space-y-6">
      <div>
        <Button asChild variant="ghost" size="sm" className="mb-2 -ml-2">
          <Link href="/billing">
            <ArrowLeft className="size-4" />
            Billing
          </Link>
        </Button>
        <PageHeader
          title={sponsor.company_name}
          description={`${humanize(sponsor.billing_frequency)} billing${
            sponsor.payment_method
              ? ` · ${humanize(sponsor.payment_method)}${
                  sponsor.payment_method === "stripe" && sponsor.stripe_subscription
                    ? " subscription"
                    : ""
                }`
              : ""
          }`}
        />
      </div>

      {!sponsor.contract_start_date ? (
        <EmptyState
          icon={Receipt}
          title="No contract start date"
          description="Set a contract start date on this sponsor to generate billing periods."
          action={
            <Button asChild>
              <Link href={`/sponsors/${id}/edit`}>Edit sponsor</Link>
            </Button>
          }
        />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {stats.map((s) => (
              <Card key={s.label}>
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                  <p className="text-xl font-semibold tabular-nums">{s.value}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {rows.length === 0 ? (
            <EmptyState
              icon={Receipt}
              title="No periods yet"
              description="Billing periods start from the contract start date. Check that the date isn't in the future."
            />
          ) : (
            <PeriodLedger sponsorId={id} rows={rows} />
          )}
        </>
      )}
    </div>
  );
}
