import type { Metadata } from "next";
import Link from "next/link";
import {
  Users,
  DollarSign,
  AlertCircle,
  CalendarClock,
  CalendarX,
  ImageOff,
  FileWarning,
  Boxes,
  ArrowRight,
} from "lucide-react";

import { getSessionContext } from "@/lib/data/session";
import { getDashboardData } from "@/lib/data/dashboard";
import { currentServiceMonth } from "@/lib/domain/dates";
import { formatCurrency, formatCurrencyShort, formatDate, formatMonth } from "@/lib/format";
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

  const [session, d] = await Promise.all([
    getSessionContext(),
    getDashboardData(month),
  ]);
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
        <StatCard label="Missing assets" value={String(d.cards.missingAssets)} icon={ImageOff} href={`/deliverables${m}&asset=missing`} alert={d.cards.missingAssets > 0} />
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
            <AttnRow show={d.needsAttention.missingAssetsUpcoming > 0} href={`/deliverables${m}&asset=missing`} label={`${d.needsAttention.missingAssetsUpcoming} upcoming placement(s) missing assets`} />
            {d.needsAttention.expiring.map((e) => (
              <AttnRow key={e.id} show href={`/sponsors/${e.id}`} label={`${e.name} — contract expires in ${e.days} day(s)`} />
            ))}
            {d.needsAttention.noPackage.map((n) => (
              <AttnRow key={n.id} show href={`/sponsors/${n.id}`} label={`${n.name} — active but has no package`} />
            ))}
            {d.needsAttention.pastDue === 0 &&
              d.needsAttention.unpaidSponsors === 0 &&
              d.needsAttention.missingAssetsUpcoming === 0 &&
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

      {/* Revenue */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Revenue</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Rev label="Contracted monthly" value={formatCurrency(d.revenue.contracted)} />
          <Rev label="Collected (all periods)" value={formatCurrency(d.revenue.collected)} />
          <Rev label="Outstanding" value={formatCurrency(d.revenue.outstanding)} />
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

function Rev({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}
