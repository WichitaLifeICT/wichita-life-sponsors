"use client";

import { useActionState, useState } from "react";
import { Loader2 } from "lucide-react";

import {
  createProduct,
  updateProduct,
  type DistActionState,
} from "@/lib/actions/distribution";
import type { DistributionProduct } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const CATEGORIES = ["puzzle", "hat", "apparel", "print", "other"];
const selectClass =
  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm";

export function ProductDialog({
  product,
  trigger,
}: {
  product?: DistributionProduct;
  trigger: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const action = product
    ? updateProduct.bind(null, product.id)
    : createProduct;
  const [state, formAction, pending] = useActionState<DistActionState, FormData>(
    action,
    { error: null },
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <form action={formAction} className="space-y-4">
          <DialogHeader>
            <DialogTitle>{product ? "Edit product" : "New product"}</DialogTitle>
          </DialogHeader>
          {state.error && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {state.error}
            </p>
          )}
          <div className="space-y-2">
            <Label htmlFor="p_name">Name</Label>
            <Input id="p_name" name="name" defaultValue={product?.name} required />
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="p_cat">Category</Label>
              <select
                id="p_cat"
                name="category"
                defaultValue={product?.category ?? "puzzle"}
                className={selectClass}
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c[0].toUpperCase() + c.slice(1)}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="p_retail">Retail price</Label>
              <Input
                id="p_retail"
                name="retail_price"
                type="number"
                min="0"
                step="0.01"
                defaultValue={product?.retail_price ?? ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="p_wholesale">Wholesale price</Label>
              <Input
                id="p_wholesale"
                name="wholesale_price"
                type="number"
                min="0"
                step="0.01"
                defaultValue={product?.wholesale_price ?? ""}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending && <Loader2 className="animate-spin" />}
              {product ? "Save" : "Create product"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
