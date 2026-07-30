import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getSponsorDetail } from "@/lib/data/sponsors";
import { getPackagesForSelect } from "@/lib/data/packages";
import { updateSponsor } from "@/lib/actions/sponsors";
import { resolveEffectiveDeliverables } from "@/lib/domain/deliverable-rules";
import { PageHeader } from "@/components/layout/page-header";
import {
  SponsorForm,
  type SponsorFormDefaults,
} from "@/components/sponsors/sponsor-form";

export const metadata: Metadata = { title: "Edit sponsor — Wichita Life" };

export default async function EditSponsorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [detail, packages] = await Promise.all([
    getSponsorDetail(id),
    getPackagesForSelect(),
  ]);
  if (!detail) notFound();

  const { sponsor, subscription, packageRules, overrides } = detail;
  const num = (n: number | null | undefined) =>
    n === null || n === undefined ? undefined : String(n);

  // For an à la carte sponsor (subscription with no package), prefill the builder
  // with their current effective deliverables.
  const alaCarteRules =
    subscription && !subscription.package_id
      ? resolveEffectiveDeliverables(
          packageRules.map((r) => ({
            deliverable_type: r.deliverable_type,
            quantity: r.quantity,
            recurrence: r.recurrence,
          })),
          overrides.map((o) => ({
            deliverable_type: o.deliverable_type,
            quantity: o.quantity,
            recurrence: o.recurrence,
          })),
        ).map((e) => ({
          deliverable_type: e.deliverable_type,
          quantity: e.quantity,
          recurrence: e.recurrence,
        }))
      : undefined;

  const defaults: SponsorFormDefaults = {
    company_name: sponsor.company_name,
    status: sponsor.status,
    website: sponsor.website ?? undefined,
    industry: sponsor.industry ?? undefined,
    primary_contact_name: sponsor.primary_contact_name ?? undefined,
    primary_contact_email: sponsor.primary_contact_email ?? undefined,
    primary_contact_phone: sponsor.primary_contact_phone ?? undefined,
    billing_contact_name: sponsor.billing_contact_name ?? undefined,
    billing_contact_email: sponsor.billing_contact_email ?? undefined,
    notes: sponsor.notes ?? undefined,
    contract_start_date: sponsor.contract_start_date ?? undefined,
    contract_end_date: sponsor.contract_end_date ?? undefined,
    monthly_price: num(sponsor.monthly_price),
    billing_frequency: sponsor.billing_frequency,
    payment_method: sponsor.payment_method ?? "",
    stripe_subscription: sponsor.stripe_subscription,
    package_id: subscription
      ? subscription.package_id ?? "custom"
      : "none",
    custom_monthly_price: num(subscription?.custom_monthly_price),
    auto_generate_deliverables:
      subscription?.auto_generate_deliverables ?? true,
    rules: alaCarteRules,
  };

  const action = updateSponsor.bind(null, id);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title={`Edit ${sponsor.company_name}`}
        description="Update this sponsor's details and package assignment."
      />
      <SponsorForm
        action={action}
        packages={packages}
        defaults={defaults}
        submitLabel="Save changes"
        cancelHref={`/sponsors/${id}`}
      />
    </div>
  );
}
