"use client";

import { useMemo, useState } from "react";

import { updateDropoffItems } from "@/lib/actions/distribution";
import type { DistributionDropoffItem } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency } from "@/lib/format";

interface Row {
  id: string;
  product_name: string;
  quantity: number;
  unit_retail_price: number;
  quantity_sold: number;
  quantity_returned: number;
}

export function RecordSales({
  dropoffId,
  items,
}: {
  dropoffId: string;
  items: DistributionDropoffItem[];
}) {
  const [rows, setRows] = useState<Row[]>(
    items.map((i) => ({
      id: i.id,
      product_name: i.product_name,
      quantity: i.quantity,
      unit_retail_price: i.unit_retail_price,
      quantity_sold: i.quantity_sold,
      quantity_returned: i.quantity_returned,
    })),
  );

  const payload = useMemo(
    () =>
      JSON.stringify(
        rows.map((r) => ({
          id: r.id,
          quantity_sold: r.quantity_sold,
          quantity_returned: r.quantity_returned,
        })),
      ),
    [rows],
  );

  const update = (i: number, patch: Partial<Row>) =>
    setRows((p) => p.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));

  return (
    <form action={updateDropoffItems.bind(null, dropoffId)} className="space-y-3">
      <input type="hidden" name="items" value={payload} />
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product</TableHead>
              <TableHead className="text-center">Dropped</TableHead>
              <TableHead className="text-center">Sold</TableHead>
              <TableHead className="text-center">Returned</TableHead>
              <TableHead className="text-center">On shelf</TableHead>
              <TableHead className="text-right">Revenue</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r, i) => {
              const onShelf = Math.max(0, r.quantity - r.quantity_sold - r.quantity_returned);
              return (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.product_name}</TableCell>
                  <TableCell className="text-center tabular-nums">{r.quantity}</TableCell>
                  <TableCell className="text-center">
                    <Input
                      type="number"
                      min={0}
                      max={r.quantity}
                      value={r.quantity_sold}
                      onChange={(e) => update(i, { quantity_sold: Number(e.target.value) || 0 })}
                      className="mx-auto h-8 w-20"
                      aria-label={`Sold for ${r.product_name}`}
                    />
                  </TableCell>
                  <TableCell className="text-center">
                    <Input
                      type="number"
                      min={0}
                      max={r.quantity}
                      value={r.quantity_returned}
                      onChange={(e) => update(i, { quantity_returned: Number(e.target.value) || 0 })}
                      className="mx-auto h-8 w-20"
                      aria-label={`Returned for ${r.product_name}`}
                    />
                  </TableCell>
                  <TableCell className="text-center tabular-nums">{onShelf}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatCurrency(r.quantity_sold * r.unit_retail_price)}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
      <div className="flex justify-end">
        <Button type="submit">Save sales</Button>
      </div>
    </form>
  );
}
