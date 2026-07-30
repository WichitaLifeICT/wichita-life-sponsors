import { togglePeriodPaid, updatePeriodAmount } from "@/lib/actions/billing";
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
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/format";
import type { PeriodRow } from "@/lib/data/billing";

export function PeriodLedger({
  sponsorId,
  rows,
}: {
  sponsorId: string;
  rows: PeriodRow[];
}) {
  return (
    <div className="rounded-lg border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Period</TableHead>
            <TableHead>Dates</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => (
            <TableRow key={r.periodStart}>
              <TableCell className="font-medium">{r.label}</TableCell>
              <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                {formatDate(r.periodStart)} – {formatDate(r.periodEnd)}
              </TableCell>
              <TableCell>
                <form
                  action={updatePeriodAmount.bind(
                    null,
                    sponsorId,
                    r.periodStart,
                    r.periodEnd,
                  )}
                  className="flex items-center gap-1"
                >
                  <Input
                    name="amount"
                    type="number"
                    step="0.01"
                    min="0"
                    defaultValue={r.amount}
                    className="h-8 w-28"
                    aria-label={`Amount for ${r.label}`}
                  />
                  <Button type="submit" size="sm" variant="ghost">
                    Save
                  </Button>
                </form>
              </TableCell>
              <TableCell>
                {r.paid ? (
                  <Badge variant="success">
                    Paid{r.paidDate ? ` · ${formatDate(r.paidDate)}` : ""}
                  </Badge>
                ) : (
                  <Badge variant="outline">Unpaid</Badge>
                )}
              </TableCell>
              <TableCell className="text-right">
                <form
                  action={togglePeriodPaid.bind(
                    null,
                    sponsorId,
                    r.periodStart,
                    r.periodEnd,
                    r.amount,
                    r.paid,
                  )}
                >
                  <Button
                    type="submit"
                    size="sm"
                    variant={r.paid ? "outline" : "default"}
                  >
                    {r.paid ? "Mark unpaid" : "Mark paid"}
                  </Button>
                </form>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
