"use client";

import { useActionState } from "react";
import { Loader2 } from "lucide-react";

import {
  updateDeliverableFields,
  type DeliverableFieldsState,
} from "@/lib/actions/deliverables";
import { DELIVERABLE_STATUSES } from "@/lib/labels";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { humanize } from "@/lib/format";
import type { Deliverable } from "@/types/database";

const ASSET_STATUSES = ["not_needed", "missing", "partial", "received"];

const selectClass =
  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function DeliverableDetailForm({ deliverable }: { deliverable: Deliverable }) {
  const action = updateDeliverableFields.bind(null, deliverable.id);
  const [state, formAction, pending] = useActionState<DeliverableFieldsState, FormData>(
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
          <Label htmlFor="status">Status</Label>
          <select
            id="status"
            name="status"
            defaultValue={deliverable.status}
            className={selectClass}
          >
            {DELIVERABLE_STATUSES.map((s) => (
              <option key={s} value={s}>
                {humanize(s)}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="asset_status">Asset status</Label>
          <select
            id="asset_status"
            name="asset_status"
            defaultValue={deliverable.asset_status}
            className={selectClass}
          >
            {ASSET_STATUSES.map((s) => (
              <option key={s} value={s}>
                {humanize(s)}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="due_date">Due date</Label>
          <Input
            id="due_date"
            name="due_date"
            type="date"
            defaultValue={deliverable.due_date ?? ""}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="scheduled_date">Scheduled date</Label>
          <Input
            id="scheduled_date"
            name="scheduled_date"
            type="date"
            defaultValue={deliverable.scheduled_date ?? ""}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="published_date">Published date</Label>
          <Input
            id="published_date"
            name="published_date"
            type="date"
            defaultValue={deliverable.published_date ?? ""}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="content_channel">Content channel</Label>
          <Input
            id="content_channel"
            name="content_channel"
            defaultValue={deliverable.content_channel ?? ""}
            placeholder="e.g. Thursday email"
          />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="content_url">Content URL</Label>
          <Input
            id="content_url"
            name="content_url"
            type="url"
            defaultValue={deliverable.content_url ?? ""}
            placeholder="https://…"
          />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="notes">Internal notes</Label>
          <Textarea
            id="notes"
            name="notes"
            rows={3}
            defaultValue={deliverable.notes ?? ""}
          />
        </div>
      </div>

      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending && <Loader2 className="animate-spin" />}
          Save
        </Button>
      </div>
    </form>
  );
}
