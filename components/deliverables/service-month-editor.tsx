"use client";

import { useState, useTransition } from "react";

import { updateDeliverableServiceMonth } from "@/lib/actions/deliverables";

/** Inline month picker for a deliverable's service month (in a list row). */
export function ServiceMonthEditor({
  id,
  serviceMonth,
  returnTo,
}: {
  id: string;
  serviceMonth: string; // "YYYY-MM-01"
  returnTo?: string;
}) {
  const [pending, startTransition] = useTransition();
  const [month, setMonth] = useState(serviceMonth.slice(0, 7));

  return (
    <input
      type="month"
      value={month}
      disabled={pending}
      onChange={(e) => {
        const v = e.target.value;
        setMonth(v);
        if (/^\d{4}-\d{2}$/.test(v)) {
          startTransition(() => {
            void updateDeliverableServiceMonth(id, v, returnTo);
          });
        }
      }}
      className="h-7 rounded-md border border-input bg-transparent px-1.5 text-xs disabled:opacity-50"
      aria-label="Service month"
    />
  );
}
