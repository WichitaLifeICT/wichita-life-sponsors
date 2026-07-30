import Link from "next/link";
import { Users, DollarSign, AlertCircle, CalendarClock } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { formatCurrencyShort } from "@/lib/format";
import { CONTRACT_EXPIRY_WARNING_DAYS } from "@/lib/config";
import type { SponsorsSummary } from "@/lib/data/sponsors";

export function SponsorSummaryCards({ summary }: { summary: SponsorsSummary }) {
  const cards = [
    {
      label: "Active sponsors",
      value: String(summary.activeCount),
      icon: Users,
      href: "/sponsors?status=active",
    },
    {
      label: "Contracted monthly revenue",
      value: formatCurrencyShort(summary.contractedMonthlyRevenue),
      icon: DollarSign,
      href: null,
    },
    {
      label: "Unpaid sponsors",
      value: String(summary.unpaidCount),
      icon: AlertCircle,
      href: "/sponsors?payment=unpaid",
    },
    {
      label: `Expiring within ${CONTRACT_EXPIRY_WARNING_DAYS} days`,
      value: String(summary.expiringSoonCount),
      icon: CalendarClock,
      href: "/sponsors?expiring=1",
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((c) => {
        const Icon = c.icon;
        const inner = (
          <Card className={c.href ? "transition-colors hover:bg-accent" : ""}>
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted">
                <Icon className="size-5 text-muted-foreground" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">{c.label}</p>
                <p className="text-2xl font-semibold tracking-tight">
                  {c.value}
                </p>
              </div>
            </CardContent>
          </Card>
        );
        return c.href ? (
          <Link key={c.label} href={c.href} className="block">
            {inner}
          </Link>
        ) : (
          <div key={c.label}>{inner}</div>
        );
      })}
    </div>
  );
}
