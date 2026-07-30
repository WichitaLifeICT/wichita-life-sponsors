import type { Metadata } from "next";

import { createPackage } from "@/lib/actions/packages";
import { PageHeader } from "@/components/layout/page-header";
import { PackageForm } from "@/components/packages/package-form";

export const metadata: Metadata = { title: "New package — Wichita Life" };

export default function NewPackagePage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title="New package"
        description="Define a sponsorship level and the deliverables it includes."
      />
      <PackageForm action={createPackage} submitLabel="Create package" />
    </div>
  );
}
