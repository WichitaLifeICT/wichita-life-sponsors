import type { Metadata } from "next";
import Link from "next/link";
import {
  Users,
  DollarSign,
  AlertCircle,
  CalendarClock,
  CalendarX,
  FileWarning,
  Boxes,
  ArrowRight,
} from "lucide-react";

import { getSessionContext } from "@/lib/data/session";
import { getDashboardData } from "@/lib/data/dashboard";
import { getMonthlyRevenue } from "@/lib/data/billing";
import { currentServiceMonth, addMonths } from "@/lib/domain/dates";
import { REVENUE_START_MONTH } from "@/lib/config";
import {
  formatCurrency,
  formatCurrencyShort,
  formatDate,
  formatMonth,
} from "@/lib/format";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageHeader } from "@/components/layout/page-header";
import { MonthPicker } from "@/components/deliverables/month-picker";
import { FulfillmentSummary } from "@/components/deliverables/fulfillment-summary";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { LucideIcon } from "lucide-react";

export const metadata: Metadata = { title: "Dashboard — Wichita Life" };
const str = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

function StatCard({
  label,
  value,
  icon: Icon,
  href,
  alert,
}: {
  label: string;
  value: string;
  icon: LucideIcon;
  href: string;
  alert?: boolean;
}) {
  return (
    <Link href={href} className="block">
      <Card className="transition-colors hover:bg-accent">
        <CardContent className="flex items-center gap-3 p-4">
          <div
            className={`flex size-9 shrink-0 items-center justify-center rounded-full ${alert ? "bg-warning/15 text-warning" : "bg-muted text-muted-foreground"}`}
          >
            <Icon className="size-4" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-xs text-muted-foreground">{label}</p>
            <p className="text-xl font-semibold">{value}</p>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const monthParam = str(sp.month);
  const month =
    monthParam && /^\d{4}-\d{2}$/.test(monthParam)
      ? monthParam
      : currentServiceMonth().slice(0, 7);

  const currentMonth = currentServiceMonth().slice(0, 7);
  const throughMonth = month > currentMonth ? month : currentMonth;
  const fromMonth =
    REVENUE_START_MONTH > throughMonth ? throughMonth : REVENUE_START_MONTH;

  // Previous / current / projected-next window (relative to the selected month).
  const prevMonth = addMonths(`${month}-01`, -1).slice(0, 7);
  const nextMonth = addMonths(`${month}-01`, 1).slice(0, 7);

  const [session, d, revenueSeries, trend] = await Promise.all([
    getSessionContext(),
    getDashboardData(month),
    getMonthlyRevenue(fromMonth, throughMonth),
    getMonthlyRevenue(prevMonth, nextMonth),
  ]);
  const trendByMonth = new Map(trend.map((r) => [r.month, r]));
  const zeroRev = { billed: 0, collected: 0, outstanding: 0 };
  const revPrev = trendByMonth.get(prevMonth) ?? { month: prevMonth, ...zeroRev };
  const revCur = trendByMonth.get(month) ?? { month, ...zeroRev };
  const revNext = trendByMonth.get(nextMonth) ?? { month: nextMonth, ...zeroRev };
  const firstName =
    session?.profile?.full_name?.split(" ")[0] ??
    session?.email?.split("@")[0] ??
    "there";

  const m = `?month=${month}`;

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Welcome, ${firstName}`}
        description={`Your operations for ${formatMonth(`${month}-01`)}.`}
        actions={<MonthPicker month={month} />}
      />

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Active sponsors" value={String(d.cards.activeSponsors)} icon={Users} href="/sponsors?status=active" />
        <StatCard label="Contracted monthly" value={formatCurrencyShort(d.cards.contractedMonthly)} icon={DollarSign} href="/billing" />
        <StatCard label="Outstanding" value={formatCurrencyShort(d.cards.outstanding)} icon={AlertCircle} href="/billing" alert={d.cards.outstanding > 0} />
        <StatCard label="Due this week" value={String(d.cards.dueThisWeek)} icon={CalendarClock} href={`/deliverables${m}`} alert={d.cards.dueThisWeek > 0} />
        <StatCard label="Unscheduled this month" value={String(d.cards.unscheduledThisMonth)} icon={CalendarX} href={`/deliverables${m}&scheduled=unscheduled`} alert={d.cards.unscheduledThisMonth > 0} />
        <StatCard label="Expiring ≤60 days" value={String(d.cards.expiring60)} icon={FileWarning} href="/sponsors?expiring=1" alert={d.cards.expiring60 > 0} />
        <StatCard label="Open ad spots" value={String(d.cards.openInventory)} icon={Boxes} href={`/calendar${m}&fill=open`} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Needs attention */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Needs attention</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <AttnRow show={d.needsAttention.pastDue > 0} href={`/deliverables${m}&overdue=1`} label={`${d.needsAttention.pastDue} deliverable(s) past due`} />
            <AttnRow show={d.needsAttention.unpaidSponsors > 0} href="/billing" label={`${d.needsAttention.unpaidSponsors} sponsor(s) with an unpaid balance`} />
            {d.needsAttention.expiring.map((e) => (
              <AttnRow key={e.id} show href={`/sponsors/${e.id}`} label={`${e.name} — contract expires in ${e.days} day(s)`} />
            ))}
            {d.needsAttention.noPackage.map((n) => (
              <AttnRow key={n.id} show href={`/sponsors/${n.id}`} label={`${n.name} — active but has no package`} />
            ))}
            {d.needsAttention.pastDue === 0 &&
              d.needsAttention.unpaidSponsors === 0 &&
              d.needsAttention.expiring.length === 0 &&
              d.needsAttention.noPackage.length === 0 && (
                <p className="py-4 text-center text-muted-foreground">
                  Nothing needs attention right now. 🎉
                </p>
              )}
          </CardContent>
        </Card>

        {/* This week */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">This week</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div>
              <p className="mb-1 text-xs uppercase text-muted-foreground">Content going out</p>
              {d.thisWeek.slots.length === 0 ? (
                <p className="text-muted-foreground">No slots scheduled this week.</p>
              ) : (
                <ul className="space-y-1">
                  {d.thisWeek.slots.map((s) => (
                    <li key={s.id} className="flex justify-between gap-2">
                      <span className="truncate">
                        {s.title}
                        {s.sponsors.length > 0 && (
                          <span className="text-muted-foreground"> · {s.sponsors.join(", ")}</span>
                        )}
                      </span>
                      <span className="shrink-0 text-muted-foreground">{formatDate(s.date, "EEE M/d")}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div>
              <p className="mb-1 text-xs uppercase text-muted-foreground">Deliverables due</p>
              {d.thisWeek.due.length === 0 ? (
                <p className="text-muted-foreground">Nothing due this week.</p>
              ) : (
                <ul className="space-y-1">
                  {d.thisWeek.due.map((x) => (
                    <li key={x.id} className="flex justify-between gap-2">
                      <Link href={`/deliverables/${x.id}`} className="truncate hover:underline">
                        {x.label}
                      </Link>
                      <span className="shrink-0 text-muted-foreground">{formatDate(x.date, "EEE M/d")}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Monthly fulfillment */}
      <div className="space-y-2">
        <h2 className="text-sm font-medium text-muted-foreground">
          Monthly fulfillment · {formatMonth(`${month}-01`)}
        </h2>
        <FulfillmentSummary data={d.fulfillment} />
      </div>

      {/* Revenue — previous · current · projected next */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Revenue</CardTitle>
          <p className="text-sm text-muted-foreground">
            Previous month, current month, and projected next month.
          </p>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <RevCol title="Previous" month={prevMonth} r={revPrev} />
          <RevCol title="Current" month={month} r={revCur} highlight />
          <RevCol title="Projected next" month={nextMonth} r={revNext} projected />
        </CardContent>
      </Card>

      {/* Monthly revenue table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Monthly revenue</CardTitle>
          <p className="text-sm text-muted-foreground">
            Billed vs. collected since {formatMonth(`${fromMonth}-01`)}.
          </p>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Month</TableHead>
                <TableHead className="text-right">Billed</TableHead>
                <TableHead className="text-right">Collected</TableHead>
                <TableHead className="text-right">Outstanding</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...revenueSeries].reverse().map((r) => (
                <TableRow key={r.month}>
                  <TableCell className="font-medium">
                    {formatMonth(`${r.month}-01`)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatCurrency(r.billed)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-success">
                    {formatCurrency(r.collected)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {r.outstanding > 0 ? (
                      <span className="text-warning">
                        {formatCurrency(r.outstanding)}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function AttnRow({ show, href, label }: { show: boolean; href: string; label: string }) {
  if (!show) return null;
  return (
    <Link
      href={href}
      className="flex items-center justify-between gap-2 rounded-md border px-3 py-2 hover:bg-accent"
    >
      <span>{label}</span>
      <ArrowRight className="size-4 shrink-0 text-muted-foreground" />
    </Link>
  );
}

function RevCol({
  title,
  month,
  r,
  highlight,
  projected,
}: {
  title: string;
  month: string;
  r: { billed: number; collected: number; outstanding: number };
  highlight?: boolean;
  projected?: boolean;
}) {
  return (
    <div
      className={`rounded-lg border p-4${highlight ? " border-primary/40 bg-primary/5" : ""}`}
    >
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-xs font-medium uppercase text-muted-foreground">
          {title}
        </p>
        <p className="text-xs text-muted-foreground">
          {formatMonth(`${month}-01`)}
        </p>
      </div>
      <dl className="mt-2 space-y-1 text-sm">
        <div className="flex justify-between gap-2">
          <dt className="text-muted-foreground">
            {projected ? "Projected billing" : "Billed"}
          </dt>
          <dd className="font-medium tabular-nums">{formatCurrency(r.billed)}</dd>
        </div>
        {!projected && (
          <div className="flex justify-between gap-2">
            <dt className="text-muted-foreground">Collected</dt>
            <dd className="tabular-nums text-success">
              {formatCurrency(r.collected)}
            </dd>
          </div>
        )}
        <div className="flex justify-between gap-2">
          <dt className="text-muted-foreground">
            {projected ? "Expected" : "Outstanding"}
          </dt>
          <dd
            className={`tabular-nums${r.outstanding > 0 ? " text-warning" : " text-muted-foreground"}`}
          >
            {formatCurrency(r.outstanding)}
          </dd>
        </div>
      </dl>
    </div>
  );
}
