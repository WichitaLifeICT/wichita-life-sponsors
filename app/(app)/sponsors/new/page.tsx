import type { Metadata } from "next";

import { getPackagesForSelect } from "@/lib/data/packages";
import { createSponsor } from "@/lib/actions/sponsors";
import { PageHeader } from "@/components/layout/page-header";
import { SponsorForm } from "@/components/sponsors/sponsor-form";

export const metadata: Metadata = { title: "New sponsor — Wichita Life" };

export default async function NewSponsorPage() {
  const packages = await getPackagesForSelect();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title="New sponsor"
        description="Add a sponsor and optionally assign a package."
      />
      <SponsorForm
        action={createSponsor}
        packages={packages}
        submitLabel="Create sponsor"
      />
    </div>
  );
}
