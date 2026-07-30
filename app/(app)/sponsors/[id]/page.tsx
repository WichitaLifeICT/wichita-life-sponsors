import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Pencil,
  PackagePlus,
  FilePlus2,
  CircleDollarSign,
  Upload,
  Sparkles,
  Boxes,
} from "lucide-react";

import { getSponsorDetail } from "@/lib/data/sponsors";
import { getSponsorBilling } from "@/lib/data/billing";
import { getSponsorAssets } from "@/lib/data/assets";
import { getSessionContext } from "@/lib/data/session";
import { PaymentStandingBadge } from "@/components/billing/payment-status-badge";
import { AssetUploader } from "@/components/assets/asset-uploader";
import { AssetGrid } from "@/components/assets/asset-grid";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SponsorStatusBadge } from "@/components/sponsors/badges";
import { ArchiveSponsorDialog } from "@/components/sponsors/archive-sponsor-dialog";
import { formatCurrency, formatDate, formatMonth, humanize } from "@/lib/format";
import { deliverableTypeLabel } from "@/lib/labels";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const detail = await getSponsorDetail(id);
  return { title: `${detail?.sponsor.company_name ?? "Sponsor"} — Wichita Life` };
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 py-1.5 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{children}</span>
    </div>
  );
}

export default async function SponsorDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [detail, billing, session, sponsorAssets] = await Promise.all([
    getSponsorDetail(id),
    getSponsorBilling(id),
    getSessionContext(),
    getSponsorAssets(id),
  ]);
  if (!detail) notFound();
  const orgId = session?.organization?.id;

  const {
    sponsor,
    subscription,
    pkg,
    monthlyValue,
    serviceMonth,
    owedThisMonth,
    completedThisMonth,
    upcoming,
    invoices,
    payments,
    isCustomized,
  } = detail;

  const unpaidPeriods = billing?.rows.filter((r) => !r.paid) ?? [];
  const hasPeriods = (billing?.rows.length ?? 0) > 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title={sponsor.company_name}
        description={
          sponsor.website ? sponsor.website.replace(/^https?:\/\//, "") : undefined
        }
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button asChild size="sm">
              <Link href={`/sponsors/${id}/edit`}>
                <Pencil className="size-4" />
                Edit
              </Link>
            </Button>
            {subscription && (
              <Button asChild variant="outline" size="sm">
                <Link href={`/sponsors/${id}/package`}>
                  <Boxes className="size-4" />
                  Manage deliverables
                </Link>
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              disabled
              title="Available when the Deliverables generator ships"
            >
              <PackagePlus className="size-4" />
              Add deliverable
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled
              title="Available when the Billing section ships"
            >
              <FilePlus2 className="size-4" />
              Add invoice
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled
              title="Available when the Billing section ships"
            >
              <CircleDollarSign className="size-4" />
              Record payment
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled
              title="Available when the Assets section ships"
            >
              <Upload className="size-4" />
              Upload asset
            </Button>
            <ArchiveSponsorDialog
              sponsorId={id}
              companyName={sponsor.company_name}
            />
          </div>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <SponsorStatusBadge status={sponsor.status} />
        <PaymentStandingBadge
          hasPeriods={hasPeriods}
          unpaidCount={unpaidPeriods.length}
        />
        {isCustomized && (
          <Badge variant="warning">
            <Sparkles className="mr-1 size-3" />
            Customized package
          </Badge>
        )}
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="deliverables">Deliverables</TabsTrigger>
          <TabsTrigger value="billing">Billing</TabsTrigger>
          <TabsTrigger value="assets">Assets</TabsTrigger>
          <TabsTrigger value="notes">Notes</TabsTrigger>
        </TabsList>

        {/* Overview */}
        <TabsContent value="overview">
          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle className="text-base">Summary</CardTitle>
              </CardHeader>
              <CardContent className="divide-y">
                <Fact label="Status">
                  <SponsorStatusBadge status={sponsor.status} />
                </Fact>
                <Fact label="Package">{pkg?.name ?? "—"}</Fact>
                <Fact label="Monthly value">
                  {monthlyValue > 0 ? formatCurrency(monthlyValue) : "—"}
                </Fact>
                <Fact label="Payments">
                  {!hasPeriods ? (
                    "—"
                  ) : unpaidPeriods.length === 0 ? (
                    <span className="text-success">Up to date</span>
                  ) : (
                    <Link
                      href={`/billing/${id}`}
                      className="text-warning hover:underline"
                    >
                      {unpaidPeriods.length} unpaid ·{" "}
                      {formatCurrency(billing?.outstanding ?? 0)}
                    </Link>
                  )}
                </Fact>
                <Fact label="Billing frequency">
                  {humanize(sponsor.billing_frequency)}
                </Fact>
                <Fact label="Payment method">
                  {sponsor.payment_method
                    ? `${humanize(sponsor.payment_method)}${
                        sponsor.payment_method === "stripe" &&
                        sponsor.stripe_subscription
                          ? " · subscription"
                          : ""
                      }`
                    : "—"}
                </Fact>
                <Fact label="Contract start">
                  {formatDate(sponsor.contract_start_date)}
                </Fact>
                <Fact label="Contract end">
                  {formatDate(sponsor.contract_end_date)}
                </Fact>
              </CardContent>
            </Card>

            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle className="text-base">Contacts</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <div>
                  <p className="text-xs uppercase text-muted-foreground">
                    Primary
                  </p>
                  <p className="font-medium">
                    {sponsor.primary_contact_name ?? "—"}
                  </p>
                  {sponsor.primary_contact_email && (
                    <p className="text-muted-foreground">
                      {sponsor.primary_contact_email}
                    </p>
                  )}
                  {sponsor.primary_contact_phone && (
                    <p className="text-muted-foreground">
                      {sponsor.primary_contact_phone}
                    </p>
                  )}
                </div>
                <div>
                  <p className="text-xs uppercase text-muted-foreground">
                    Billing
                  </p>
                  <p className="font-medium">
                    {sponsor.billing_contact_name ?? "—"}
                  </p>
                  {sponsor.billing_contact_email && (
                    <p className="text-muted-foreground">
                      {sponsor.billing_contact_email}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle className="text-base">
                  This month · {formatMonth(serviceMonth)}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-4">
                  <div className="flex-1 rounded-md bg-muted p-3 text-center">
                    <p className="text-2xl font-semibold">{completedThisMonth}</p>
                    <p className="text-xs text-muted-foreground">Completed</p>
                  </div>
                  <div className="flex-1 rounded-md bg-muted p-3 text-center">
                    <p className="text-2xl font-semibold">
                      {Math.max(0, owedThisMonth - completedThisMonth)}
                    </p>
                    <p className="text-xs text-muted-foreground">Still owed</p>
                  </div>
                </div>
                <div>
                  <p className="mb-2 text-xs uppercase text-muted-foreground">
                    Upcoming placements
                  </p>
                  {upcoming.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      Nothing scheduled yet.
                    </p>
                  ) : (
                    <ul className="space-y-1 text-sm">
                      {upcoming.slice(0, 5).map((d) => (
                        <li key={d.id} className="flex justify-between gap-2">
                          <span>{deliverableTypeLabel(d.deliverable_type)}</span>
                          <span className="text-muted-foreground">
                            {formatDate(d.scheduled_date)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Deliverables */}
        <TabsContent value="deliverables">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Upcoming &amp; scheduled deliverables
              </CardTitle>
            </CardHeader>
            <CardContent>
              {upcoming.length === 0 ? (
                <EmptyState
                  icon={PackagePlus}
                  title="No scheduled deliverables"
                  description="Generated and scheduled deliverables will appear here. The full workspace ships in a later stage."
                />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Service month</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Scheduled</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {upcoming.map((d) => (
                      <TableRow key={d.id}>
                        <TableCell>{deliverableTypeLabel(d.deliverable_type)}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatMonth(d.original_service_month)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{humanize(d.status)}</Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatDate(d.scheduled_date)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Billing */}
        <TabsContent value="billing">
          <div className="space-y-4">
            <Card>
              <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-medium">Payment periods</p>
                  <p className="text-sm text-muted-foreground">
                    {!hasPeriods
                      ? "No periods yet — set a contract start date."
                      : unpaidPeriods.length === 0
                        ? "Up to date on all periods."
                        : `${unpaidPeriods.length} unpaid · ${formatCurrency(billing?.outstanding ?? 0)} outstanding`}
                  </p>
                </div>
                <Button asChild size="sm">
                  <Link href={`/billing/${id}`}>
                    <CircleDollarSign className="size-4" />
                    Manage payment periods
                  </Link>
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Invoices</CardTitle>
              </CardHeader>
              <CardContent>
                {invoices.length === 0 ? (
                  <EmptyState
                    icon={FilePlus2}
                    title="No invoices yet"
                    description="Invoices you record will appear here. Full billing ships in a later stage."
                  />
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Number</TableHead>
                        <TableHead>Service period</TableHead>
                        <TableHead>Due</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead className="text-right">Balance</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {invoices.map((inv) => (
                        <TableRow key={inv.id}>
                          <TableCell className="font-medium">
                            {inv.invoice_number ?? "—"}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {formatDate(inv.service_period_start)} →{" "}
                            {formatDate(inv.service_period_end)}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {formatDate(inv.due_date)}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {formatCurrency(inv.amount)}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {formatCurrency(inv.balance)}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {humanize(inv.computedStatus)}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Payments</CardTitle>
              </CardHeader>
              <CardContent>
                {payments.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No payments recorded.
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Method</TableHead>
                        <TableHead>Reference</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {payments.map((p) => (
                        <TableRow key={p.id}>
                          <TableCell>{formatDate(p.payment_date)}</TableCell>
                          <TableCell className="text-muted-foreground">
                            {humanize(p.payment_method)}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {p.reference_number ?? "—"}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {formatCurrency(p.amount)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Assets */}
        <TabsContent value="assets">
          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base">Assets</CardTitle>
              {orgId && <AssetUploader sponsorId={id} orgId={orgId} />}
            </CardHeader>
            <CardContent>
              {sponsorAssets.length === 0 ? (
                <EmptyState
                  icon={Upload}
                  title="No assets yet"
                  description="Upload logos, photos, contracts, ad copy, and more — or add an external link."
                />
              ) : (
                <AssetGrid assets={sponsorAssets} />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notes */}
        <TabsContent value="notes">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Notes</CardTitle>
            </CardHeader>
            <CardContent>
              {sponsor.notes ? (
                <p className="whitespace-pre-wrap text-sm">{sponsor.notes}</p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No notes yet. Use “Edit” to add internal notes about this
                  sponsor.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
