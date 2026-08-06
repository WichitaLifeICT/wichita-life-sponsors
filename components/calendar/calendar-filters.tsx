"use client";

import { useCallback } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CalendarDays, List } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DELIVERABLE_TYPE_OPTIONS } from "@/lib/labels";

export function CalendarFilters({ view }: { view: "month" | "agenda" }) {
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

  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-center">
      <Select value={get("type") || "all"} onValueChange={(v) => setParam("type", v)}>
        <SelectTrigger className="w-full lg:w-[170px]" aria-label="Slot type filter">
          <SelectValue placeholder="Slot type" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All slot types</SelectItem>
          {DELIVERABLE_TYPE_OPTIONS.map(([v, l]) => (
            <SelectItem key={v} value={v}>
              {l}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={get("group") || "all"} onValueChange={(v) => setParam("group", v)}>
        <SelectTrigger className="w-full lg:w-[150px]" aria-label="Channel filter">
          <SelectValue placeholder="Channel" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All channels</SelectItem>
          <SelectItem value="newsletter">Newsletter / email</SelectItem>
          <SelectItem value="social">Social</SelectItem>
        </SelectContent>
      </Select>

      <Button
        type="button"
        variant={get("fill") === "open" ? "default" : "outline"}
        size="sm"
        onClick={() => setParam("fill", get("fill") === "open" ? null : "open")}
      >
        Open only
      </Button>
      <Button
        type="button"
        variant={get("fill") === "filled" ? "default" : "outline"}
        size="sm"
        onClick={() => setParam("fill", get("fill") === "filled" ? null : "filled")}
      >
        Filled only
      </Button>

      <div className="lg:ml-auto flex items-center gap-1 rounded-md border p-0.5">
        <Button
          type="button"
          variant={view === "month" ? "secondary" : "ghost"}
          size="sm"
          onClick={() => setParam("view", null)}
        >
          <CalendarDays className="size-4" />
          Month
        </Button>
        <Button
          type="button"
          variant={view === "agenda" ? "secondary" : "ghost"}
          size="sm"
          onClick={() => setParam("view", "agenda")}
        >
          <List className="size-4" />
          Agenda
        </Button>
      </div>
    </div>
  );
}
