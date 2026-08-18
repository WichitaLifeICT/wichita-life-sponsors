"use client";

import { useState, useTransition } from "react";

import { setDeliverableCompletion } from "@/lib/actions/deliverables";

/** Checkbox + completion-date control used per row in a deliverables list. */
export function DeliverableCompleteControl({
  id,
  complete,
  publishedDate,
  returnTo,
}: {
  id: string;
  complete: boolean;
  publishedDate: string | null;
  returnTo?: string;
}) {
  const [pending, startTransition] = useTransition();
  const [done, setDone] = useState(complete);
  const [date, setDate] = useState(
    publishedDate ?? new Date().toISOString().slice(0, 10),
  );

  const save = (nextDone: boolean, nextDate: string) =>
    startTransition(() => {
      void setDeliverableCompletion(id, nextDone, nextDate, returnTo);
    });

  return (
    <div className="flex items-center justify-end gap-1.5">
      <label className="flex items-center gap-1 text-xs text-muted-foreground">
        <input
          type="checkbox"
          checked={done}
          disabled={pending}
          onChange={(e) => {
            setDone(e.target.checked);
            save(e.target.checked, date);
          }}
          className="size-4 rounded border-input"
        />
        Done
      </label>
      <input
        type="date"
        value={date}
        disabled={pending || !done}
        onChange={(e) => {
          setDate(e.target.value);
          if (done && /^\d{4}-\d{2}-\d{2}$/.test(e.target.value)) {
            save(true, e.target.value);
          }
        }}
        className="h-7 rounded-md border border-input bg-transparent px-1.5 text-xs disabled:opacity-50"
        aria-label="Completion date"
      />
    </div>
  );
}
