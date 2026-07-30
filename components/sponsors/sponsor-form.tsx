"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";

import type { SponsorActionState } from "@/lib/actions/sponsors";
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
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type Action = (
  prev: SponsorActionState,
  formData: FormData,
) => Promise<SponsorActionState>;

export interface SponsorFormDefaults {
  company_name?: string;
  status?: string;
  website?: string;
  industry?: string;
  primary_contact_name?: string;
  primary_contact_email?: string;
  primary_contact_phone?: string;
  billing_contact_name?: string;
  billing_contact_email?: string;
  notes?: string;
  contract_start_date?: string;
  contract_end_date?: string;
  monthly_price?: string;
  billing_frequency?: string;
  payment_method?: string;
  stripe_subscription?: boolean;
  package_id?: string;
  custom_monthly_price?: string;
  auto_generate_deliverables?: boolean;
}

const STATUS = [
  ["lead", "Lead"],
  ["active", "Active"],
  ["paused", "Paused"],
  ["expired", "Expired"],
  ["archived", "Archived"],
] as const;

const FREQUENCY = [
  ["monthly", "Monthly"],
  ["quarterly", "Quarterly"],
  ["annually", "Annually"],
  ["one_time", "One time"],
  ["custom", "Custom"],
] as const;

const PAYMENT_METHOD = [
  ["", "Not set"],
  ["stripe", "Stripe"],
  ["ach", "ACH / bank transfer"],
  ["credit_card", "Credit card"],
  ["check", "Check"],
  ["cash", "Cash"],
  ["other", "Other"],
] as const;

function FieldError({ errors }: { errors?: string[] }) {
  if (!errors?.length) return null;
  return <p className="text-xs text-destructive">{errors[0]}</p>;
}

export function SponsorForm({
  action,
  packages,
  defaults = {},
  submitLabel = "Save sponsor",
  cancelHref = "/sponsors",
}: {
  action: Action;
  packages: { id: string; name: string }[];
  defaults?: SponsorFormDefaults;
  submitLabel?: string;
  cancelHref?: string;
}) {
  const [state, formAction, pending] = useActionState(action, { error: null });
  const fe = state.fieldErrors ?? {};

  // Controlled values for Radix selects (mirrored into hidden inputs).
  const [status, setStatus] = useState(defaults.status ?? "lead");
  const [frequency, setFrequency] = useState(
    defaults.billing_frequency ?? "monthly",
  );
  const [paymentMethod, setPaymentMethod] = useState(
    defaults.payment_method ?? "",
  );
  const [packageId, setPackageId] = useState(defaults.package_id ?? "none");

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

      {/* Company details */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Company details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="company_name">Company name *</Label>
            <Input
              id="company_name"
              name="company_name"
              defaultValue={defaults.company_name}
              required
            />
            <FieldError errors={fe.company_name} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger id="status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS.map(([v, l]) => (
                  <SelectItem key={v} value={v}>
                    {l}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <input type="hidden" name="status" value={status} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="industry">Industry</Label>
            <Input id="industry" name="industry" defaultValue={defaults.industry} />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="website">Website</Label>
            <Input
              id="website"
              name="website"
              placeholder="https://…"
              defaultValue={defaults.website}
            />
          </div>
        </CardContent>
      </Card>

      {/* Contacts */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Contacts</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="primary_contact_name">Primary contact name</Label>
            <Input
              id="primary_contact_name"
              name="primary_contact_name"
              defaultValue={defaults.primary_contact_name}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="primary_contact_phone">Primary contact phone</Label>
            <Input
              id="primary_contact_phone"
              name="primary_contact_phone"
              defaultValue={defaults.primary_contact_phone}
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="primary_contact_email">Primary contact email</Label>
            <Input
              id="primary_contact_email"
              name="primary_contact_email"
              type="email"
              defaultValue={defaults.primary_contact_email}
            />
            <FieldError errors={fe.primary_contact_email} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="billing_contact_name">Billing contact name</Label>
            <Input
              id="billing_contact_name"
              name="billing_contact_name"
              defaultValue={defaults.billing_contact_name}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="billing_contact_email">Billing contact email</Label>
            <Input
              id="billing_contact_email"
              name="billing_contact_email"
              type="email"
              defaultValue={defaults.billing_contact_email}
            />
            <FieldError errors={fe.billing_contact_email} />
          </div>
        </CardContent>
      </Card>

      {/* Contract & pricing */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Contract &amp; pricing</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="contract_start_date">Contract start</Label>
            <Input
              id="contract_start_date"
              name="contract_start_date"
              type="date"
              defaultValue={defaults.contract_start_date}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="contract_end_date">Contract end</Label>
            <Input
              id="contract_end_date"
              name="contract_end_date"
              type="date"
              defaultValue={defaults.contract_end_date}
            />
            <FieldError errors={fe.contract_end_date} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="monthly_price">Price</Label>
            <Input
              id="monthly_price"
              name="monthly_price"
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              defaultValue={defaults.monthly_price}
            />
            <FieldError errors={fe.monthly_price} />
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
          <div className="space-y-2">
            <Label htmlFor="payment_method">Payment method</Label>
            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
              <SelectTrigger id="payment_method">
                <SelectValue placeholder="Not set" />
              </SelectTrigger>
              <SelectContent>
                {PAYMENT_METHOD.filter(([v]) => v !== "").map(([v, l]) => (
                  <SelectItem key={v} value={v}>
                    {l}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <input type="hidden" name="payment_method" value={paymentMethod} />
            {paymentMethod === "stripe" && (
              <label className="flex items-center gap-2 pt-1 text-sm">
                <input
                  type="checkbox"
                  name="stripe_subscription"
                  defaultChecked={defaults.stripe_subscription ?? false}
                  className="size-4 rounded border-input"
                />
                Recurring Stripe subscription
              </label>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Package assignment */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Package assignment</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="package_id">Package</Label>
            <Select value={packageId} onValueChange={setPackageId}>
              <SelectTrigger id="package_id">
                <SelectValue placeholder="No package" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No package</SelectItem>
                <SelectItem value="custom">Custom (à la carte)</SelectItem>
                {packages.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <input type="hidden" name="package_id" value={packageId} />
            <p className="text-xs text-muted-foreground">
              Pick a package, or choose <strong>Custom (à la carte)</strong> to
              build any mix of deliverables. Then use{" "}
              <strong>Manage deliverables</strong> on the sponsor to set the exact
              list (e.g. 2 emails, or 2 emails + 1 social, or an event banner).
            </p>
          </div>
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
              defaultValue={defaults.custom_monthly_price}
            />
            <FieldError errors={fe.custom_monthly_price} />
          </div>
          <label className="flex items-center gap-2 text-sm sm:col-span-2">
            <input
              type="checkbox"
              name="auto_generate_deliverables"
              defaultChecked={defaults.auto_generate_deliverables ?? true}
              className="size-4 rounded border-input"
            />
            Automatically generate this sponsor&apos;s monthly deliverables
          </label>
        </CardContent>
      </Card>

      {/* Notes */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Notes</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            name="notes"
            rows={4}
            placeholder="Internal notes about this sponsor…"
            defaultValue={defaults.notes}
          />
        </CardContent>
      </Card>

      <div className="flex items-center justify-end gap-2">
        <Button variant="outline" asChild>
          <Link href={cancelHref}>Cancel</Link>
        </Button>
        <Button type="submit" disabled={pending}>
          {pending && <Loader2 className="animate-spin" />}
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
