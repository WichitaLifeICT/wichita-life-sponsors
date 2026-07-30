import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { getSponsorDetail } from "@/lib/data/sponsors";
import { updateSubscriptionOverrides } from "@/lib/actions/subscriptions";
import { resolveEffectiveDeliverables } from "@/lib/domain/deliverable-rules";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { CustomizePackageForm } from "@/components/sponsors/customize-package-form";
import { Boxes } from "lucide-react";

export const metadata: Metadata = { title: "Customize package — Wichita Life" };

export default async function CustomizePackagePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const detail = await getSponsorDetail(id);
  if (!detail) notFound();

  const { sponsor, subscription, pkg, packageRules, overrides } = detail;

  if (!subscription) {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <PageHeader title={`Manage deliverables · ${sponsor.company_name}`} />
        <EmptyState
          icon={Boxes}
          title="No deliverables set up yet"
          description="On the sponsor, choose a package or “Custom (à la carte)” first — then you can build their exact deliverable list here."
          action={
            <Button asChild>
              <Link href={`/sponsors/${id}/edit`}>Edit sponsor</Link>
            </Button>
          }
        />
      </div>
    );
  }

  const effective = resolveEffectiveDeliverables(
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
  );

  const action = updateSubscriptionOverrides.bind(null, id, subscription.id);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title={`Manage deliverables · ${sponsor.company_name}`}
        description="Build this sponsor's exact deliverable list — à la carte, or as tweaks to their package."
      />
      <CustomizePackageForm
        action={action}
        sponsorId={id}
        packageName={pkg?.name ?? "À la carte (no standard package)"}
        packageRules={packageRules.map((r) => ({
          deliverable_type: r.deliverable_type,
          quantity: r.quantity,
          recurrence: r.recurrence,
        }))}
        effectiveRules={effective.map((e) => ({
          deliverable_type: e.deliverable_type,
          quantity: e.quantity,
          recurrence: e.recurrence,
        }))}
        customPrice={
          subscription.custom_monthly_price != null
            ? String(subscription.custom_monthly_price)
            : undefined
        }
        autoGenerate={subscription.auto_generate_deliverables}
      />
    </div>
  );
}
