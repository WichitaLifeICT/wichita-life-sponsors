"use client";

import { useState } from "react";
import { CalendarPlus } from "lucide-react";
import { useFormStatus } from "react-dom";

import { generateEmailSlots } from "@/lib/actions/calendar";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const WEEKDAYS = [
  ["0", "Sun"],
  ["1", "Mon"],
  ["2", "Tue"],
  ["3", "Wed"],
  ["4", "Thu"],
  ["5", "Fri"],
  ["6", "Sat"],
] as const;
const DEFAULT_ON = new Set(["1", "3", "4", "5"]);
// [value, weekday-only note]. A note means the tier is only created on that day.
const TIERS: readonly (readonly [string, string?])[] = [
  ["Headline"],
  ["Feature"],
  ["Lower"],
  ["Event banner"],
  ["Deep Dive", "Wed only"],
];

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Creating…" : "Create email slots"}
    </Button>
  );
}

export function GenerateEmailsDialog({ month }: { month: string }) {
  const [open, setOpen] = useState(false);
  const label = new Date(`${month}-01T12:00:00Z`).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <CalendarPlus className="size-4" />
          Auto-schedule emails
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form action={generateEmailSlots.bind(null, month)} className="space-y-4">
          <DialogHeader>
            <DialogTitle>Auto-schedule emails · {label}</DialogTitle>
            <DialogDescription>
              Creates a newsletter slot on each chosen weekday this month. Skips
              dates that already have one, and you can delete any single day (for
              holidays or days off).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label>Send days</Label>
            <div className="flex flex-wrap gap-2">
              {WEEKDAYS.map(([v, l]) => (
                <label
                  key={v}
                  className="flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-sm"
                >
                  <input
                    type="checkbox"
                    name="weekday"
                    value={v}
                    defaultChecked={DEFAULT_ON.has(v)}
                    className="size-4 rounded border-input"
                  />
                  {l}
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Ad slots per email</Label>
            <div className="flex flex-wrap gap-2">
              {TIERS.map(([t, note]) => (
                <label
                  key={t}
                  className="flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-sm"
                >
                  <input
                    type="checkbox"
                    name="tier"
                    value={t}
                    defaultChecked
                    className="size-4 rounded border-input"
                  />
                  {t}
                  {note && (
                    <span className="text-xs text-muted-foreground">({note})</span>
                  )}
                </label>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Each becomes its own clickable slot on the calendar (one sponsor per
              slot).
            </p>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <SubmitButton />
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
