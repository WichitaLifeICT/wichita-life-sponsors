"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { GripVertical, MoreVertical } from "lucide-react";

import { updateDeliverableStatus } from "@/lib/actions/deliverables";
import type { DeliverableStatus } from "@/types/database";
import { deliverableTypeLabel } from "@/lib/labels";
import { AssetStatusBadge } from "@/components/deliverables/status-badge";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import type { MonthlyDeliverableRow } from "@/lib/data/deliverables";

const COLUMNS: { status: DeliverableStatus; label: string }[] = [
  { status: "not_scheduled", label: "Not scheduled" },
  { status: "waiting_on_assets", label: "Waiting on assets" },
  { status: "scheduled", label: "Scheduled" },
  { status: "drafting", label: "Drafting" },
  { status: "ready_for_review", label: "Ready for review" },
  { status: "approved", label: "Approved" },
  { status: "published", label: "Published" },
];

export function BoardView({ rows }: { rows: MonthlyDeliverableRow[] }) {
  // Seeded from props; the parent passes a key so navigation remounts with
  // fresh server data, while optimistic moves persist within the same view.
  const [items, setItems] = useState(rows);
  const [dragOver, setDragOver] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const move = (id: string, status: DeliverableStatus) => {
    setItems((prev) =>
      prev.map((d) => (d.id === id ? { ...d, status } : d)),
    );
    startTransition(() => updateDeliverableStatus(id, status));
  };

  return (
    <div className="flex gap-3 overflow-x-auto pb-2">
      {COLUMNS.map((col) => {
        const cards = items.filter((d) => d.status === col.status);
        return (
          <div
            key={col.status}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(col.status);
            }}
            onDragLeave={() => setDragOver((s) => (s === col.status ? null : s))}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(null);
              const id = e.dataTransfer.getData("text/plain");
              if (id) move(id, col.status);
            }}
            className={cn(
              "flex w-72 shrink-0 flex-col rounded-lg border bg-muted/30 transition-colors",
              dragOver === col.status && "ring-2 ring-ring",
            )}
          >
            <div className="flex items-center justify-between border-b px-3 py-2">
              <span className="text-sm font-medium">{col.label}</span>
              <span className="rounded-full bg-muted px-2 text-xs tabular-nums text-muted-foreground">
                {cards.length}
              </span>
            </div>
            <div className="flex min-h-16 flex-1 flex-col gap-2 p-2">
              {cards.map((d) => (
                <div
                  key={d.id}
                  draggable
                  onDragStart={(e) => e.dataTransfer.setData("text/plain", d.id)}
                  className="group rounded-md border bg-card p-2 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-1">
                    <div className="flex items-start gap-1.5">
                      <GripVertical className="mt-0.5 size-4 shrink-0 cursor-grab text-muted-foreground opacity-0 group-hover:opacity-100" />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">
                          {d.sponsorName}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {deliverableTypeLabel(d.deliverable_type)}
                        </p>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-6 shrink-0"
                          aria-label="Move deliverable"
                        >
                          <MoreVertical className="size-3.5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Move to…</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {COLUMNS.filter((c) => c.status !== d.status).map((c) => (
                          <DropdownMenuItem
                            key={c.status}
                            onSelect={() => move(d.id, c.status)}
                          >
                            {c.label}
                          </DropdownMenuItem>
                        ))}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild>
                          <Link href={`/deliverables/${d.id}`}>Open detail</Link>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <AssetStatusBadge status={d.asset_status} />
                    {d.due_date && (
                      <span className="text-xs text-muted-foreground">
                        Due {formatDate(d.due_date)}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
