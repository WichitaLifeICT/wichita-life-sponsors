import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getPackageDetail } from "@/lib/data/packages";
import { updatePackage } from "@/lib/actions/packages";
import { PageHeader } from "@/components/layout/page-header";
import { PackageForm } from "@/components/packages/package-form";

export const metadata: Metadata = { title: "Edit package — Wichita Life" };

export default async function EditPackagePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const detail = await getPackageDetail(id);
  if (!detail) notFound();

  const { pkg, rules } = detail;
  const action = updatePackage.bind(null, id);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title={`Edit ${pkg.name}`}
        description="Changes affect future deliverable generation only — existing deliverables are never rewritten."
      />
      <PackageForm
        action={action}
        submitLabel="Save changes"
        defaults={{
          name: pkg.name,
          description: pkg.description ?? undefined,
          base_price: String(pkg.base_price),
          billing_frequency: pkg.billing_frequency,
          active: pkg.active,
          rules: rules.map((r) => ({
            deliverable_type: r.deliverable_type,
            quantity: r.quantity,
            recurrence: r.recurrence,
            notes: r.notes ?? undefined,
          })),
        }}
      />
    </div>
  );
}
