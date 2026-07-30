"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { Plus, Trash2, Loader2 } from "lucide-react";

import { createDropoff, type DistActionState } from "@/lib/actions/distribution";
import type { DistributionLocation, DistributionProduct } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const selectClass =
  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm";

interface Row {
  product_id: string;
  product_name: string;
  quantity: number;
  unit_wholesale_price: number;
  unit_retail_price: number;
}

export function DropoffForm({
  locations,
  products,
}: {
  locations: DistributionLocation[];
  products: DistributionProduct[];
}) {
  const [state, formAction, pending] = useActionState<DistActionState, FormData>(
    createDropoff,
    { error: null },
  );
  const [dealType, setDealType] = useState("wholesale");
  const [rows, setRows] = useState<Row[]>([]);

  const addRow = () =>
    setRows((p) => [
      ...p,
      { product_id: "", product_name: "", quantity: 1, unit_wholesale_price: 0, unit_retail_price: 0 },
    ]);
  const update = (i: number, patch: Partial<Row>) =>
    setRows((p) => p.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  const remove = (i: number) => setRows((p) => p.filter((_, idx) => idx !== i));

  const onPickProduct = (i: number, productId: string) => {
    const prod = products.find((p) => p.id === productId);
    if (prod) {
      update(i, {
        product_id: prod.id,
        product_name: prod.name,
        unit_wholesale_price: prod.wholesale_price,
        unit_retail_price: prod.retail_price,
      });
    } else {
      update(i, { product_id: "", product_name: "" });
    }
  };

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="items" value={JSON.stringify(rows)} />

      {state.error && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.error}
        </p>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Drop-off details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="location_id">Location</Label>
            <select id="location_id" name="location_id" className={selectClass} required defaultValue="">
              <option value="" disabled>
                Choose a location…
              </option>
              {locations.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="delivered_date">Date delivered</Label>
            <Input id="delivered_date" name="delivered_date" type="date" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="deal_type">Deal type</Label>
            <select
              id="deal_type"
              name="deal_type"
              value={dealType}
              onChange={(e) => setDealType(e.target.value)}
              className={selectClass}
            >
              <option value="wholesale">Wholesale (paid up front)</option>
              <option value="consignment">Consignment (share of sales)</option>
            </select>
          </div>
          {dealType === "consignment" && (
            <div className="space-y-2">
              <Label htmlFor="consignment_rate">Your share (0–1)</Label>
              <Input
                id="consignment_rate"
                name="consignment_rate"
                type="number"
                min="0"
                max="1"
                step="0.05"
                defaultValue="0.7"
              />
            </div>
          )}
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" name="notes" rows={2} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Products dropped off</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {rows.length === 0 && (
            <p className="rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground">
              Add the products you dropped off.
            </p>
          )}
          {rows.map((row, i) => (
            <div
              key={i}
              className="grid grid-cols-1 gap-2 rounded-md border p-3 sm:grid-cols-[1fr_70px_110px_110px_auto]"
            >
              <select
                value={row.product_id || "custom"}
                onChange={(e) =>
                  e.target.value === "custom"
                    ? update(i, { product_id: "", product_name: "" })
                    : onPickProduct(i, e.target.value)
                }
                className={selectClass}
                aria-label="Product"
              >
                <option value="custom">Custom / one-off…</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              {!row.product_id && (
                <Input
                  placeholder="Name"
                  value={row.product_name}
                  onChange={(e) => update(i, { product_name: e.target.value })}
                  className="sm:col-span-1"
                  aria-label="Product name"
                />
              )}
              <Input
                type="number"
                min={0}
                value={row.quantity}
                onChange={(e) => update(i, { quantity: Number(e.target.value) || 0 })}
                aria-label="Quantity"
                title="Quantity"
              />
              <Input
                type="number"
                min={0}
                step="0.01"
                value={row.unit_wholesale_price}
                onChange={(e) =>
                  update(i, { unit_wholesale_price: Number(e.target.value) || 0 })
                }
                aria-label="Wholesale price per unit"
                title="Wholesale $/unit"
              />
              <Input
                type="number"
                min={0}
                step="0.01"
                value={row.unit_retail_price}
                onChange={(e) =>
                  update(i, { unit_retail_price: Number(e.target.value) || 0 })
                }
                aria-label="Retail price per unit"
                title="Retail $/unit"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => remove(i)}
                aria-label="Remove"
                className="text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          ))}
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <Button type="button" variant="outline" size="sm" onClick={addRow}>
              <Plus className="size-4" />
              Add product
            </Button>
            <span>Columns: product · qty · wholesale $/unit · retail $/unit</span>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button variant="outline" asChild>
          <Link href="/distribution">Cancel</Link>
        </Button>
        <Button type="submit" disabled={pending}>
          {pending && <Loader2 className="animate-spin" />}
          Save drop-off
        </Button>
      </div>
    </form>
  );
}
