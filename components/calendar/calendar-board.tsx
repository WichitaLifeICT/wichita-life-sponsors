"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, Trash2, Pencil, X } from "lucide-react";

import {
  createSlot,
  updateSlot,
  deleteSlot,
  assignDeliverable,
  unassignDeliverable,
} from "@/lib/actions/calendar";
import type {
  SlotWithAssignments,
  SlotFill,
  SponsorScheduling,
  UnscheduledDeliverable,
} from "@/lib/data/calendar";
import { SLOT_TYPE_OPTIONS } from "@/lib/labels";
import { SlotForm } from "@/components/calendar/slot-form";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { deliverableTypeLabel } from "@/lib/labels";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

const SLOT_LABEL = new Map<string, string>(SLOT_TYPE_OPTIONS);
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// Email ad-tier slot titles → the deliverable type they're meant to hold.
const TIER_TYPE: Record<string, string> = {
  Headline: "newsletter_headline",
  Feature: "newsletter_feature",
  Lower: "newsletter_lower",
  "Event banner": "event_banner",
};

const FILL_CLASSES: Record<SlotFill, string> = {
  empty: "border-l-muted-foreground/40 bg-muted/50 text-muted-foreground",
  partial: "border-l-warning bg-warning/10",
  full: "border-l-success bg-success/10",
  overbooked: "border-l-destructive bg-destructive/10",
};

function daysInMonth(month: string) {
  const [y, m] = month.split("-").map(Number);
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}
function firstWeekday(month: string) {
  const [y, m] = month.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).getUTCDay();
}

export function CalendarBoard({
  month,
  view,
  slots,
  scheduling,
  carryIn = [],
}: {
  month: string;
  view: "month" | "agenda";
  slots: SlotWithAssignments[];
  scheduling: SponsorScheduling[];
  carryIn?: UnscheduledDeliverable[];
}) {
  const unscheduled = scheduling.flatMap((g) => g.unscheduled);
  // Everything assignable onto this month's calendar: this month's unscheduled
  // items plus still-open items owed earlier (annual/quarterly carryover).
  const assignable = [...unscheduled, ...carryIn];
  const [newSlotDate, setNewSlotDate] = useState<string | null>(null);
  const [manageId, setManageId] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [assignId, setAssignId] = useState("");
  const [busy, setBusy] = useState(false);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [overridePrompt, setOverridePrompt] = useState<{
    deliverableId: string;
    slotId: string;
  } | null>(null);

  const manageSlot = slots.find((s) => s.id === manageId) ?? null;
  const matchType = manageSlot
    ? (manageSlot.deliverable_type ?? TIER_TYPE[manageSlot.title ?? ""])
    : undefined;
  const assignOptions = matchType
    ? [...assignable].sort(
        (a, b) =>
          (b.deliverable_type === matchType ? 1 : 0) -
          (a.deliverable_type === matchType ? 1 : 0),
      )
    : assignable;

  const slotsByDate = new Map<string, SlotWithAssignments[]>();
  for (const s of slots) {
    const arr = slotsByDate.get(s.scheduled_date) ?? [];
    arr.push(s);
    slotsByDate.set(s.scheduled_date, arr);
  }

  async function doAssign(deliverableId: string, slotId: string, override = false) {
    setBusy(true);
    try {
      const res = await assignDeliverable(deliverableId, slotId, override);
      if (res.needsOverride) {
        setOverridePrompt({ deliverableId, slotId });
      } else {
        setAssignId("");
      }
    } finally {
      setBusy(false);
    }
  }

  // Drop a dragged deliverable onto a slot (moves it, updating its day).
  function handleDropOnSlot(slotId: string) {
    const id = draggingId;
    setDraggingId(null);
    if (!id) return;
    const target = slots.find((s) => s.id === slotId);
    // No-op if it's already in this exact slot.
    if (target?.assignments.some((a) => a.deliverableId === id)) return;
    void doAssign(id, slotId);
  }

  const chipLabel = (s: SlotWithAssignments) =>
    s.title ||
    (s.deliverable_type ? deliverableTypeLabel(s.deliverable_type) : null) ||
    SLOT_LABEL.get(s.slot_type) ||
    s.slot_type;

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_18rem]">
      <div className="min-w-0 space-y-4">
        <div className="flex justify-end">
          <Button size="sm" onClick={() => setNewSlotDate(`${month}-01`)}>
            <Plus className="size-4" />
            New slot
          </Button>
        </div>
        {view === "month" ? (
          <MonthGrid
            month={month}
            slotsByDate={slotsByDate}
            onNewSlot={setNewSlotDate}
            onOpenSlot={(id) => {
              setManageId(id);
              setEditing(false);
            }}
            chipLabel={chipLabel}
            dragging={draggingId !== null}
            onDragStartDeliverable={setDraggingId}
            onDragEndDeliverable={() => setDraggingId(null)}
            onDropOnSlot={handleDropOnSlot}
          />
        ) : (
          <AgendaView
            slots={slots}
            onOpenSlot={(id) => {
              setManageId(id);
              setEditing(false);
            }}
            chipLabel={chipLabel}
          />
        )}
      </div>

      {/* Per-sponsor scheduling status */}
      <aside className="space-y-2">
        <div className="rounded-lg border bg-card">
          <div className="border-b px-3 py-2 text-sm font-medium">
            This month by sponsor
          </div>
          <div className="max-h-[32rem] space-y-2 overflow-y-auto p-2">
            {scheduling.length === 0 ? (
              <p className="px-2 py-4 text-center text-sm text-muted-foreground">
                No deliverables this month yet. Generate them, or add an ad-hoc one.
              </p>
            ) : (
              scheduling.map((g) => {
                const done = g.remaining === 0;
                return (
                  <div key={g.sponsorId} className="rounded-md border bg-background p-2">
                    <div className="flex items-center justify-between gap-2">
                      <Link
                        href={`/sponsors/${g.sponsorId}`}
                        className="truncate text-sm font-medium hover:underline"
                      >
                        {g.sponsorName}
                      </Link>
                      <Badge variant={done ? "success" : "warning"}>
                        {done ? "All scheduled" : `${g.scheduled}/${g.owed}`}
                      </Badge>
                    </div>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {g.byType.map((t) => (
                        <span
                          key={t.deliverable_type}
                          className={cn(
                            "rounded px-1.5 py-0.5 text-[11px]",
                            t.scheduled >= t.owed
                              ? "bg-success/10 text-success"
                              : "bg-warning/10 text-warning",
                          )}
                          title={deliverableTypeLabel(t.deliverable_type)}
                        >
                          {deliverableTypeLabel(t.deliverable_type)} {t.scheduled}/{t.owed}
                        </span>
                      ))}
                    </div>
                    {g.remaining > 0 && (
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        {g.remaining} still to schedule — open a slot to assign.
                      </p>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
        {carryIn.length > 0 && (
          <div className="rounded-lg border bg-card">
            <div className="border-b px-3 py-2 text-sm font-medium">
              Still to place from earlier
              <p className="text-xs font-normal text-muted-foreground">
                Annual / quarterly items owed in a past month. Drag onto any
                day’s slot, or open a slot and assign.
              </p>
            </div>
            <div className="max-h-64 space-y-1 overflow-y-auto p-2">
              {carryIn.map((d) => (
                <div
                  key={d.id}
                  draggable
                  onDragStart={() => setDraggingId(d.id)}
                  onDragEnd={() => setDraggingId(null)}
                  className="flex cursor-grab items-center justify-between gap-2 rounded-md border bg-background px-2 py-1.5 text-xs active:cursor-grabbing"
                  title={`${d.sponsorName} · ${deliverableTypeLabel(d.deliverable_type)} — drag onto a slot`}
                >
                  <span className="truncate">
                    <span className="font-medium">{d.sponsorName}</span>{" "}
                    <span className="text-muted-foreground">
                      · {deliverableTypeLabel(d.deliverable_type)}
                    </span>
                  </span>
                  <span className="shrink-0 text-[10px] text-muted-foreground">
                    {d.service_month.slice(0, 7)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
        <p className="px-1 text-xs text-muted-foreground">
          Green = fully scheduled. Amber = still owes scheduling. Drag a
          sponsor chip onto another day’s slot to move it, use{" "}
          <strong>Add deliverable</strong> to place an extra ad, or overbook a slot
          when assigning.
        </p>
      </aside>

      {/* New slot dialog */}
      <Dialog
        open={newSlotDate !== null}
        onOpenChange={(o) => !o && setNewSlotDate(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New content slot</DialogTitle>
          </DialogHeader>
          <SlotForm
            action={createSlot}
            defaults={{ scheduled_date: newSlotDate ?? undefined, capacity: 1 }}
            submitLabel="Create slot"
            onCancel={() => setNewSlotDate(null)}
          />
        </DialogContent>
      </Dialog>

      {/* Manage slot dialog */}
      <Dialog
        open={manageId !== null}
        onOpenChange={(o) => {
          if (!o) {
            setManageId(null);
            setEditing(false);
          }
        }}
      >
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          {manageSlot && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {chipLabel(manageSlot)}
                  <Badge
                    variant={
                      manageSlot.fill === "overbooked"
                        ? "destructive"
                        : manageSlot.fill === "full"
                          ? "success"
                          : manageSlot.fill === "partial"
                            ? "warning"
                            : "outline"
                    }
                  >
                    {manageSlot.assignments.length}/{manageSlot.capacity}
                  </Badge>
                </DialogTitle>
                <p className="text-sm text-muted-foreground">
                  {formatDate(manageSlot.scheduled_date)} ·{" "}
                  {manageSlot.deliverable_type
                    ? deliverableTypeLabel(manageSlot.deliverable_type)
                    : SLOT_LABEL.get(manageSlot.slot_type)}
                </p>
              </DialogHeader>

              {editing ? (
                <SlotForm
                  action={updateSlot.bind(null, manageSlot.id)}
                  defaults={{
                    deliverable_type:
                      manageSlot.deliverable_type ??
                      TIER_TYPE[manageSlot.title ?? ""] ??
                      undefined,
                    title: manageSlot.title ?? undefined,
                    scheduled_date: manageSlot.scheduled_date,
                    capacity: manageSlot.capacity,
                    notes: manageSlot.notes ?? undefined,
                  }}
                  submitLabel="Save changes"
                  onCancel={() => setEditing(false)}
                />
              ) : (
                <div className="space-y-4">
                  {/* Assigned deliverables */}
                  <div>
                    <p className="mb-2 text-xs uppercase text-muted-foreground">
                      Assigned
                    </p>
                    {manageSlot.assignments.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        No deliverables assigned yet.
                      </p>
                    ) : (
                      <ul className="space-y-1">
                        {manageSlot.assignments.map((a) => (
                          <li
                            key={a.assignmentId}
                            className="flex items-center justify-between rounded-md border px-2 py-1.5 text-sm"
                          >
                            <Link
                              href={`/deliverables/${a.deliverableId}`}
                              className="hover:underline"
                            >
                              <span className="font-medium">{a.sponsorName}</span>
                              <span className="text-muted-foreground">
                                {" · "}
                                {deliverableTypeLabel(a.deliverableType)}
                              </span>
                            </Link>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-7"
                              aria-label="Remove"
                              disabled={busy}
                              onClick={() => unassignDeliverable(a.deliverableId)}
                            >
                              <X className="size-4" />
                            </Button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  {/* Assign a deliverable */}
                  <div className="space-y-2">
                    <p className="text-xs uppercase text-muted-foreground">
                      Assign a deliverable
                    </p>
                    {assignable.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        No unscheduled deliverables to place.
                      </p>
                    ) : (
                      <div className="flex gap-2">
                        <select
                          value={assignId}
                          onChange={(e) => setAssignId(e.target.value)}
                          className="flex h-9 w-full rounded-md border border-input bg-transparent px-2 text-sm"
                        >
                          <option value="">Choose…</option>
                          {assignOptions.map((d) => (
                            <option key={d.id} value={d.id}>
                              {matchType && d.deliverable_type === matchType ? "★ " : ""}
                              {d.sponsorName} · {deliverableTypeLabel(d.deliverable_type)}
                              {d.service_month.slice(0, 7) !== month
                                ? ` (owed ${d.service_month.slice(0, 7)})`
                                : ""}
                            </option>
                          ))}
                        </select>
                        <Button
                          disabled={!assignId || busy}
                          onClick={() => doAssign(assignId, manageSlot.id)}
                        >
                          Assign
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Slot actions */}
                  <div className="flex justify-between border-t pt-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEditing(true)}
                    >
                      <Pencil className="size-4" />
                      Edit slot
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" size="sm" className="text-destructive">
                          <Trash2 className="size-4" />
                          Delete
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete this slot?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Any deliverables assigned here will be unscheduled (not
                            deleted). This can’t be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <form action={deleteSlot.bind(null, manageSlot.id, month)}>
                            <Button type="submit" variant="destructive">
                              Delete slot
                            </Button>
                          </form>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Capacity override confirm */}
      <AlertDialog
        open={overridePrompt !== null}
        onOpenChange={(o) => !o && setOverridePrompt(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Slot is at capacity</AlertDialogTitle>
            <AlertDialogDescription>
              This slot is already full. Assign anyway and overbook it?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setOverridePrompt(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (overridePrompt) {
                  const { deliverableId, slotId } = overridePrompt;
                  setOverridePrompt(null);
                  doAssign(deliverableId, slotId, true);
                }
              }}
            >
              Overbook
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function MonthGrid({
  month,
  slotsByDate,
  onNewSlot,
  onOpenSlot,
  chipLabel,
  dragging,
  onDragStartDeliverable,
  onDragEndDeliverable,
  onDropOnSlot,
}: {
  month: string;
  slotsByDate: Map<string, SlotWithAssignments[]>;
  onNewSlot: (date: string) => void;
  onOpenSlot: (id: string) => void;
  chipLabel: (s: SlotWithAssignments) => string;
  dragging: boolean;
  onDragStartDeliverable: (deliverableId: string) => void;
  onDragEndDeliverable: () => void;
  onDropOnSlot: (slotId: string) => void;
}) {
  const total = daysInMonth(month);
  const offset = firstWeekday(month);
  const cells = Array.from({ length: 42 }, (_, i) => i - offset + 1);

  return (
    <div className="overflow-hidden rounded-lg border bg-card">
      <div className="grid grid-cols-7 border-b bg-muted/40 text-center text-xs font-medium text-muted-foreground">
        {WEEKDAYS.map((d) => (
          <div key={d} className="py-2">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {cells.map((day, i) => {
          const inMonth = day >= 1 && day <= total;
          const dateStr = inMonth
            ? `${month}-${String(day).padStart(2, "0")}`
            : null;
          const daySlots = dateStr ? slotsByDate.get(dateStr) ?? [] : [];
          return (
            <div
              key={i}
              className={cn(
                "group min-h-24 border-b border-r p-1 last:border-r-0",
                !inMonth && "bg-muted/20",
              )}
            >
              {inMonth && (
                <>
                  <div className="mb-1 flex items-center justify-between">
                    <span className="px-1 text-xs text-muted-foreground">{day}</span>
                    <button
                      onClick={() => onNewSlot(dateStr!)}
                      className="rounded p-0.5 text-muted-foreground opacity-0 hover:bg-accent group-hover:opacity-100"
                      aria-label={`Add slot on ${dateStr}`}
                    >
                      <Plus className="size-3.5" />
                    </button>
                  </div>
                  <div className="space-y-1">
                    {daySlots.map((s) => (
                      <div
                        key={s.id}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => {
                          e.preventDefault();
                          onDropOnSlot(s.id);
                        }}
                        className={cn(
                          "rounded border-l-2 text-xs",
                          FILL_CLASSES[s.fill],
                          dragging &&
                            "outline-dashed outline-1 outline-offset-[-1px] outline-primary/50",
                        )}
                      >
                        <button
                          onClick={() => onOpenSlot(s.id)}
                          className="block w-full truncate px-1.5 py-1 text-left"
                          title={`${chipLabel(s)} — ${s.assignments.length}/${s.capacity}`}
                        >
                          <span className="font-medium">{chipLabel(s)}</span>{" "}
                          <span className="tabular-nums">
                            {s.assignments.length}/{s.capacity}
                          </span>
                        </button>
                        {s.assignments.length > 0 && (
                          <div className="flex flex-wrap gap-0.5 px-1 pb-1">
                            {s.assignments.map((a) => (
                              <span
                                key={a.assignmentId}
                                draggable
                                onDragStart={() =>
                                  onDragStartDeliverable(a.deliverableId)
                                }
                                onDragEnd={onDragEndDeliverable}
                                className="max-w-full cursor-grab truncate rounded bg-background/70 px-1 py-0.5 text-[10px] active:cursor-grabbing"
                                title={`${a.sponsorName} · ${deliverableTypeLabel(a.deliverableType)} — drag to another day's slot to move`}
                              >
                                {a.sponsorName}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AgendaView({
  slots,
  onOpenSlot,
  chipLabel,
}: {
  slots: SlotWithAssignments[];
  onOpenSlot: (id: string) => void;
  chipLabel: (s: SlotWithAssignments) => string;
}) {
  if (slots.length === 0) {
    return (
      <div className="rounded-lg border bg-card p-8 text-center text-sm text-muted-foreground">
        No content slots this month. Use “New slot” to add one.
      </div>
    );
  }
  return (
    <div className="divide-y rounded-lg border bg-card">
      {slots.map((s) => (
        <button
          key={s.id}
          onClick={() => onOpenSlot(s.id)}
          className="flex w-full items-center justify-between gap-3 p-3 text-left hover:bg-accent/50"
        >
          <div className="min-w-0">
            <p className="font-medium">{chipLabel(s)}</p>
            <p className="text-sm text-muted-foreground">
              {formatDate(s.scheduled_date)} ·{" "}
              {s.assignments.map((a) => a.sponsorName).join(", ") || "Open"}
            </p>
          </div>
          <Badge
            variant={
              s.fill === "overbooked"
                ? "destructive"
                : s.fill === "full"
                  ? "success"
                  : s.fill === "partial"
                    ? "warning"
                    : "outline"
            }
          >
            {s.assignments.length}/{s.capacity}
          </Badge>
        </button>
      ))}
    </div>
  );
}
