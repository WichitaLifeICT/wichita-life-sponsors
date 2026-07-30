"use client";

import { useActionState } from "react";
import { Loader2 } from "lucide-react";

import type { SlotActionState } from "@/lib/actions/calendar";
import { SLOT_TYPE_OPTIONS } from "@/lib/labels";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const selectClass =
  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

type Action = (
  prev: SlotActionState,
  formData: FormData,
) => Promise<SlotActionState>;

export interface SlotFormDefaults {
  slot_type?: string;
  title?: string;
  scheduled_date?: string;
  capacity?: number;
  notes?: string;
}

export function SlotForm({
  action,
  defaults = {},
  submitLabel = "Save slot",
  onCancel,
}: {
  action: Action;
  defaults?: SlotFormDefaults;
  submitLabel?: string;
  onCancel?: () => void;
}) {
  const [state, formAction, pending] = useActionState<SlotActionState, FormData>(
    action,
    { error: null },
  );

  return (
    <form action={formAction} className="space-y-4">
      {state.error && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.error}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="slot_type">Type</Label>
          <select
            id="slot_type"
            name="slot_type"
            defaultValue={defaults.slot_type ?? "newsletter"}
            className={selectClass}
          >
            {SLOT_TYPE_OPTIONS.map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="scheduled_date">Date</Label>
          <Input
            id="scheduled_date"
            name="scheduled_date"
            type="date"
            defaultValue={defaults.scheduled_date}
            required
          />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="title">Title (optional)</Label>
          <Input
            id="title"
            name="title"
            defaultValue={defaults.title}
            placeholder="e.g. Wichita Life Newsletter"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="capacity">Capacity (sponsor spots)</Label>
          <Input
            id="capacity"
            name="capacity"
            type="number"
            min={1}
            max={50}
            defaultValue={defaults.capacity ?? 1}
            required
          />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="notes">Notes (optional)</Label>
          <Textarea id="notes" name="notes" rows={2} defaultValue={defaults.notes} />
        </div>
      </div>

      <div className="flex justify-end gap-2">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={pending}>
          {pending && <Loader2 className="animate-spin" />}
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
