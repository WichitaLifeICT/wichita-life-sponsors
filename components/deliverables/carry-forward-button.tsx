"use client";

import { ArrowRightCircle } from "lucide-react";

import { carryForwardDeliverable } from "@/lib/actions/generation";
import { Button } from "@/components/ui/button";

/** Carries a deliverable into the next month (preserving its original month). */
export function CarryForwardButton({ id }: { id: string }) {
  const action = carryForwardDeliverable.bind(null, id, undefined);
  return (
    <form action={action}>
      <Button
        type="submit"
        variant="ghost"
        size="sm"
        title="Carry into next month (keeps original service month)"
      >
        <ArrowRightCircle className="size-4" />
        Carry forward
      </Button>
    </form>
  );
}
