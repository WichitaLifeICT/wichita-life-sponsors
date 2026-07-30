"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const DELIVERABLE_TYPE_OPTIONS = [
  ["newsletter_placement", "Newsletter placement"],
  ["dedicated_email", "Dedicated email"],
  ["social_post", "Social post"],
  ["social_story", "Social story"],
  ["social_reel", "Social reel"],
  ["website_banner", "Website banner"],
  ["podcast_mention", "Podcast mention"],
  ["event_sponsorship", "Event sponsorship"],
  ["custom", "Custom"],
] as const;

export const RECURRENCE_OPTIONS = [
  ["monthly", "Monthly"],
  ["quarterly", "Quarterly"],
  ["annually", "Annually"],
  ["one_time", "One time"],
  ["custom", "Custom"],
] as const;

export interface RuleRow {
  deliverable_type: string;
  quantity: number;
  recurrence: string;
  notes?: string;
}

export function RulesEditor({
  name = "rules",
  initialRules = [],
}: {
  name?: string;
  initialRules?: RuleRow[];
}) {
  const [rows, setRows] = useState<RuleRow[]>(initialRules);

  const update = (i: number, patch: Partial<RuleRow>) =>
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));

  const add = () =>
    setRows((prev) => [
      ...prev,
      { deliverable_type: "newsletter_placement", quantity: 1, recurrence: "monthly" },
    ]);

  const remove = (i: number) =>
    setRows((prev) => prev.filter((_, idx) => idx !== i));

  return (
    <div className="space-y-3">
      <input type="hidden" name={name} value={JSON.stringify(rows)} />

      {rows.length === 0 && (
        <p className="rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground">
          No deliverables yet. Add the recurring deliverables this package
          includes.
        </p>
      )}

      {rows.map((row, i) => (
        <div
          key={i}
          className="grid grid-cols-1 gap-2 rounded-md border p-3 sm:grid-cols-[1fr_90px_1fr_auto]"
        >
          <Select
            value={row.deliverable_type}
            onValueChange={(v) => update(i, { deliverable_type: v })}
          >
            <SelectTrigger aria-label="Deliverable type">
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

          <Input
            type="number"
            min={0}
            max={999}
            value={row.quantity}
            onChange={(e) =>
              update(i, { quantity: Number(e.target.value) || 0 })
            }
            aria-label="Quantity"
          />

          <Select
            value={row.recurrence}
            onValueChange={(v) => update(i, { recurrence: v })}
          >
            <SelectTrigger aria-label="Recurrence">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {RECURRENCE_OPTIONS.map(([v, l]) => (
                <SelectItem key={v} value={v}>
                  {l}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => remove(i)}
            aria-label="Remove deliverable"
            className="text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      ))}

      <Button type="button" variant="outline" size="sm" onClick={add}>
        <Plus className="size-4" />
        Add deliverable
      </Button>
    </div>
  );
}
