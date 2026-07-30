import type { Metadata } from "next";
import Link from "next/link";
import { Truck } from "lucide-react";

import { getLocations, getProducts } from "@/lib/data/distribution";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { LocationDialog } from "@/components/distribution/location-dialog";
import { DropoffForm } from "@/components/distribution/dropoff-form";

export const metadata: Metadata = { title: "New drop-off — Wichita Life" };

export default async function NewDropoffPage() {
  const [locations, products] = await Promise.all([getLocations(), getProducts()]);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title="New drop-off"
        description="Record products delivered to a location, wholesale or consignment."
      />
      {locations.length === 0 ? (
        <EmptyState
          icon={Truck}
          title="Add a location first"
          description="You need at least one location before recording a drop-off."
          action={
            <LocationDialog
              trigger={<Button>Add a location</Button>}
            />
          }
        />
      ) : (
        <DropoffForm locations={locations} products={products} />
      )}
      {locations.length > 0 && (
        <p className="text-center text-xs text-muted-foreground">
          Need a new location or product?{" "}
          <Link href="/distribution?tab=locations" className="underline">
            Manage them here
          </Link>
          .
        </p>
      )}
    </div>
  );
}
