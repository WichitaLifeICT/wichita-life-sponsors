"use client";

import { useActionState, useState } from "react";
import { Plus, Loader2 } from "lucide-react";

import {
  addManualDeliverable,
  type ManualDeliverableState,
} from "@/lib/actions/generation";
import { DELIVERABLE_TYPE_OPTIONS } from "@/lib/labels";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function AddDeliverableDialog({
  sponsors,
  defaultMonth, // YYYY-MM
  lockedSponsor,
  returnTo,
  trigger,
}: {
  sponsors: { id: string; name: string }[];
  defaultMonth: string;
  lockedSponsor?: { id: string; name: string };
  returnTo?: string;
  trigger?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState<ManualDeliverableState, FormData>(
    addManualDeliverable,
    { error: null },
  );
  const [sponsorId, setSponsorId] = useState(lockedSponsor?.id ?? "");
  const [type, setType] = useState("newsletter_headline");
  const [completed, setCompleted] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="outline">
            <Plus className="size-4" />
            Add deliverable
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <form action={formAction} className="space-y-4">
          <DialogHeader>
            <DialogTitle>Add a deliverable</DialogTitle>
            <DialogDescription>
              Manually add a one-off deliverable outside of monthly generation.
            </DialogDescription>
          </DialogHeader>

          {state.error && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {state.error}
            </p>
          )}

          {returnTo && <input type="hidden" name="return_to" value={returnTo} />}

          {lockedSponsor ? (
            <input type="hidden" name="sponsor_id" value={lockedSponsor.id} />
          ) : (
            <div className="space-y-2">
              <Label>Sponsor</Label>
              <Select value={sponsorId} onValueChange={setSponsorId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a sponsor" />
                </SelectTrigger>
                <SelectContent>
                  {sponsors.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <input type="hidden" name="sponsor_id" value={sponsorId} />
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DELIVERABLE_TYPE_OPTIONS.map(([v, l]) => (
                    <SelectItem key={v} value={v}>
                      {l}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <input type="hidden" name="deliverable_type" value={type} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="service_month">Service month</Label>
              <Input
                id="service_month"
                name="service_month"
                type="month"
                defaultValue={defaultMonth}
                required
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="title">Title (optional)</Label>
              <Input id="title" name="title" placeholder="e.g. Grand opening promo" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="due_date">Due date (optional)</Label>
              <Input id="due_date" name="due_date" type="date" />
            </div>
          </div>

          <div className="space-y-2 rounded-md border bg-muted/30 p-3">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="completed"
                checked={completed}
                onChange={(e) => setCompleted(e.target.checked)}
                className="size-4 rounded border-input"
              />
              Mark as already completed (take credit)
            </label>
            {completed && (
              <div className="space-y-1">
                <Label htmlFor="completed_date">Completion date</Label>
                <Input
                  id="completed_date"
                  name="completed_date"
                  type="date"
                  defaultValue={new Date().toISOString().slice(0, 10)}
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={pending || !sponsorId}>
              {pending && <Loader2 className="animate-spin" />}
              Add deliverable
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
