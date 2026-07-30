import { Card, CardContent } from "@/components/ui/card";
import type { MonthlyFulfillment } from "@/lib/data/deliverables";

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border bg-card px-4 py-3">
      <p className="text-2xl font-semibold tabular-nums">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

export function FulfillmentSummary({ data }: { data: MonthlyFulfillment }) {
  return (
    <div className="space-y-3">
      <Card>
        <CardContent className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium">Monthly fulfillment</p>
            <p className="text-xs text-muted-foreground">
              {data.published} of {data.total} deliverables published
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="h-2 w-40 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-success transition-all"
                style={{ width: `${data.completionPct}%` }}
              />
            </div>
            <span className="text-sm font-semibold tabular-nums">
              {data.completionPct}%
            </span>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Stat label="Owed" value={data.total} />
        <Stat label="Published" value={data.published} />
        <Stat label="Scheduled" value={data.scheduled} />
        <Stat label="Waiting on assets" value={data.waitingOnAssets} />
        <Stat label="Not scheduled" value={data.notScheduled} />
        <Stat label="Carried forward" value={data.carriedForward} />
      </div>
    </div>
  );
}
