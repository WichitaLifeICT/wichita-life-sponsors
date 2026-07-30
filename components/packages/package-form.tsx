"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";

import type { PackageActionState } from "@/lib/actions/packages";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RulesEditor, type RuleRow } from "@/components/packages/rules-editor";

type Action = (
  prev: PackageActionState,
  formData: FormData,
) => Promise<PackageActionState>;

const FREQUENCY = [
  ["monthly", "Monthly"],
  ["quarterly", "Quarterly"],
  ["annually", "Annually"],
  ["one_time", "One time"],
  ["custom", "Custom"],
] as const;

export interface PackageFormDefaults {
  name?: string;
  description?: string;
  base_price?: string;
  billing_frequency?: string;
  active?: boolean;
  rules?: RuleRow[];
}

export function PackageForm({
  action,
  defaults = {},
  submitLabel = "Save package",
}: {
  action: Action;
  defaults?: PackageFormDefaults;
  submitLabel?: string;
}) {
  const [state, formAction, pending] = useActionState(action, { error: null });
  const [frequency, setFrequency] = useState(
    defaults.billing_frequency ?? "monthly",
  );
  const fe = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="space-y-6">
      {state.error && (
        <p
          role="alert"
          className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {state.error}
        </p>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Package details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="name">Package name *</Label>
            <Input id="name" name="name" defaultValue={defaults.name} required />
            {fe.name?.[0] && (
              <p className="text-xs text-destructive">{fe.name[0]}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="base_price">Base price</Label>
            <Input
              id="base_price"
              name="base_price"
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              defaultValue={defaults.base_price}
            />
            {fe.base_price?.[0] && (
              <p className="text-xs text-destructive">{fe.base_price[0]}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="billing_frequency">Billing frequency</Label>
            <Select value={frequency} onValueChange={setFrequency}>
              <SelectTrigger id="billing_frequency">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FREQUENCY.map(([v, l]) => (
                  <SelectItem key={v} value={v}>
                    {l}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <input type="hidden" name="billing_frequency" value={frequency} />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="description">Description / internal notes</Label>
            <Textarea
              id="description"
              name="description"
              rows={3}
              defaultValue={defaults.description}
            />
          </div>
          <label className="flex items-center gap-2 text-sm sm:col-span-2">
            <input
              type="checkbox"
              name="active"
              defaultChecked={defaults.active ?? true}
              className="size-4 rounded border-input"
            />
            Active (available to assign to sponsors)
          </label>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Included deliverables</CardTitle>
          <div className="grid grid-cols-1 gap-2 text-xs text-muted-foreground sm:grid-cols-[1fr_90px_1fr_auto]">
            <span>Type</span>
            <span>Qty</span>
            <span>Recurrence</span>
            <span className="sr-only">Actions</span>
          </div>
        </CardHeader>
        <CardContent>
          <RulesEditor initialRules={defaults.rules} />
        </CardContent>
      </Card>

      <div className="flex items-center justify-end gap-2">
        <Button variant="outline" asChild>
          <Link href="/packages">Cancel</Link>
        </Button>
        <Button type="submit" disabled={pending}>
          {pending && <Loader2 className="animate-spin" />}
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
