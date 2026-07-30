"use client";

import { useCallback } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { X, LayoutGrid, Table2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DELIVERABLE_TYPE_OPTIONS } from "@/lib/labels";
import { humanize } from "@/lib/format";

const STATUSES = [
  "not_scheduled",
  "waiting_on_assets",
  "scheduled",
  "drafting",
  "ready_for_review",
  "approved",
  "published",
  "skipped",
  "carried_forward",
  "canceled",
];

const ASSETS = ["not_needed", "missing", "partial", "received"];

export function DeliverableFilters({
  sponsors,
  view,
}: {
  sponsors: { id: string; name: string }[];
  view: "table" | "board";
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const get = (k: string) => params.get(k) ?? "";

  const setParam = useCallback(
    (key: string, value: string | null) => {
      const next = new URLSearchParams(params.toString());
      if (!value || value === "all" || value === "") next.delete(key);
      else next.set(key, value);
      router.push(`${pathname}?${next.toString()}`);
    },
    [params, pathname, router],
  );

  const toggle = (key: string) =>
    setParam(key, get(key) === "1" ? null : "1");

  const setView = (v: "table" | "board") => setParam("view", v === "table" ? null : v);

  const hasFilters =
    get("sponsor") ||
    get("type") ||
    get("status") ||
    get("asset") ||
    get("scheduled") ||
    get("overdue") ||
    get("carried");

  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-center">
      <Select value={get("sponsor") || "all"} onValueChange={(v) => setParam("sponsor", v)}>
        <SelectTrigger className="w-full lg:w-[160px]" aria-label="Sponsor filter">
          <SelectValue placeholder="Sponsor" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All sponsors</SelectItem>
          {sponsors.map((s) => (
            <SelectItem key={s.id} value={s.id}>
              {s.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={get("type") || "all"} onValueChange={(v) => setParam("type", v)}>
        <SelectTrigger className="w-full lg:w-[160px]" aria-label="Type filter">
          <SelectValue placeholder="Type" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All types</SelectItem>
          {DELIVERABLE_TYPE_OPTIONS.map(([v, l]) => (
            <SelectItem key={v} value={v}>
              {l}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={get("status") || "all"} onValueChange={(v) => setParam("status", v)}>
        <SelectTrigger className="w-full lg:w-[160px]" aria-label="Status filter">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All statuses</SelectItem>
          {STATUSES.map((s) => (
            <SelectItem key={s} value={s}>
              {humanize(s)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={get("asset") || "all"} onValueChange={(v) => setParam("asset", v)}>
        <SelectTrigger className="w-full lg:w-[150px]" aria-label="Asset filter">
          <SelectValue placeholder="Assets" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All assets</SelectItem>
          {ASSETS.map((a) => (
            <SelectItem key={a} value={a}>
              {humanize(a)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Button
        type="button"
        variant={get("scheduled") === "unscheduled" ? "default" : "outline"}
        size="sm"
        onClick={() =>
          setParam("scheduled", get("scheduled") === "unscheduled" ? null : "unscheduled")
        }
      >
        Unscheduled
      </Button>
      <Button
        type="button"
        variant={get("overdue") === "1" ? "default" : "outline"}
        size="sm"
        onClick={() => toggle("overdue")}
      >
        Overdue
      </Button>
      <Button
        type="button"
        variant={get("carried") === "1" ? "default" : "outline"}
        size="sm"
        onClick={() => toggle("carried")}
      >
        Carried forward
      </Button>

      {hasFilters && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-muted-foreground"
          onClick={() => {
            const next = new URLSearchParams();
            const month = get("month");
            const v = get("view");
            if (month) next.set("month", month);
            if (v) next.set("view", v);
            router.push(`${pathname}?${next.toString()}`);
          }}
        >
          <X className="size-4" />
          Clear
        </Button>
      )}

      <div className="lg:ml-auto flex items-center gap-1 rounded-md border p-0.5">
        <Button
          type="button"
          variant={view === "table" ? "secondary" : "ghost"}
          size="sm"
          onClick={() => setView("table")}
          aria-label="Table view"
        >
          <Table2 className="size-4" />
          Table
        </Button>
        <Button
          type="button"
          variant={view === "board" ? "secondary" : "ghost"}
          size="sm"
          onClick={() => setView("board")}
          aria-label="Board view"
        >
          <LayoutGrid className="size-4" />
          Board
        </Button>
      </div>
    </div>
  );
}
