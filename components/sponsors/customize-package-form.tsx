"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";

import type { SubscriptionActionState } from "@/lib/actions/subscriptions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RulesEditor, type RuleRow } from "@/components/packages/rules-editor";
import { humanize } from "@/lib/format";

type Action = (
  prev: SubscriptionActionState,
  formData: FormData,
) => Promise<SubscriptionActionState>;

export function CustomizePackageForm({
  action,
  sponsorId,
  packageName,
  packageRules,
  effectiveRules,
  customPrice,
  autoGenerate,
}: {
  action: Action;
  sponsorId: string;
  packageName: string;
  packageRules: { deliverable_type: string; quantity: number; recurrence: string }[];
  effectiveRules: RuleRow[];
  customPrice?: string;
  autoGenerate: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, { error: null });

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
          <CardTitle className="text-base">
            Standard “{packageName}” package
          </CardTitle>
        </CardHeader>
        <CardContent>
          {packageRules.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              This package has no deliverables defined.
            </p>
          ) : (
            <ul className="space-y-0.5 text-sm text-muted-foreground">
              {packageRules.map((r, i) => (
                <li key={i} className="flex justify-between gap-2">
                  <span>{humanize(r.deliverable_type)}</span>
                  <span>
                    {r.quantity}× {humanize(r.recurrence).toLowerCase()}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            This sponsor&apos;s deliverables
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Adjust quantities, add, or remove deliverables. Anything different
            from the standard package is saved as an override and flagged as
            customized.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-2 text-xs text-muted-foreground sm:grid-cols-[1fr_90px_1fr_auto]">
            <span>Type</span>
            <span>Qty</span>
            <span>Recurrence</span>
            <span className="sr-only">Actions</span>
          </div>
          <RulesEditor initialRules={effectiveRules} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Pricing &amp; generation</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="custom_monthly_price">
              Custom monthly price (override)
            </Label>
            <Input
              id="custom_monthly_price"
              name="custom_monthly_price"
              type="number"
              min="0"
              step="0.01"
              placeholder="Leave blank to use package price"
              defaultValue={customPrice}
            />
          </div>
          <label className="flex items-center gap-2 self-end pb-2 text-sm">
            <input
              type="checkbox"
              name="auto_generate_deliverables"
              defaultChecked={autoGenerate}
              className="size-4 rounded border-input"
            />
            Auto-generate monthly deliverables
          </label>
        </CardContent>
      </Card>

      <div className="flex items-center justify-end gap-2">
        <Button variant="outline" asChild>
          <Link href={`/sponsors/${sponsorId}`}>Cancel</Link>
        </Button>
        <Button type="submit" disabled={pending}>
          {pending && <Loader2 className="animate-spin" />}
          Save customization
        </Button>
      </div>
    </form>
  );
}
