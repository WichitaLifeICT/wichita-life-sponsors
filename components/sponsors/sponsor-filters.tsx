"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search, X, Loader2 } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SPONSOR_PAYMENT_STATUS_LABEL } from "@/lib/domain/billing";

const STATUS_OPTIONS = [
  ["all", "All statuses"],
  ["active", "Active"],
  ["lead", "Lead"],
  ["paused", "Paused"],
  ["expired", "Expired"],
  ["archived", "Archived"],
] as const;

const PAYMENT_OPTIONS = [
  ["all", "All payments"],
  ["unpaid", "Unpaid (any)"],
  ...(Object.entries(SPONSOR_PAYMENT_STATUS_LABEL) as [string, string][]),
] as const;

const SORT_OPTIONS = [
  ["company_asc", "Company (A–Z)"],
  ["company_desc", "Company (Z–A)"],
  ["value_desc", "Value (high–low)"],
  ["value_asc", "Value (low–high)"],
  ["end_asc", "Contract end (soonest)"],
  ["status_asc", "Status"],
] as const;

export function SponsorFilters({
  packages,
}: {
  packages: { id: string; name: string }[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();

  const get = (k: string, d = "") => params.get(k) ?? d;
  const [search, setSearch] = useState(get("q"));
  const firstRender = useRef(true);

  const push = useCallback(
    (next: URLSearchParams) => {
      next.delete("page"); // any filter change resets pagination
      startTransition(() => {
        router.push(`${pathname}?${next.toString()}`);
      });
    },
    [pathname, router],
  );

  const setParam = useCallback(
    (key: string, value: string | null) => {
      const next = new URLSearchParams(params.toString());
      if (!value || value === "all" || value === "") next.delete(key);
      else next.set(key, value);
      push(next);
    },
    [params, push],
  );

  // Debounce the search box.
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    const t = setTimeout(() => setParam("q", search.trim() || null), 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const expiring = get("expiring") === "1";
  const hasFilters =
    !!get("q") ||
    !!get("status") ||
    !!get("packageId") ||
    !!get("payment") ||
    expiring;

  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:flex-wrap">
      <div className="relative w-full lg:max-w-xs">
        <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search company…"
          className="pl-8"
          aria-label="Search sponsors"
        />
        {pending && (
          <Loader2 className="absolute right-2.5 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
        )}
      </div>

      <Select
        value={get("status", "all")}
        onValueChange={(v) => setParam("status", v)}
      >
        <SelectTrigger className="w-full lg:w-[150px]" aria-label="Status filter">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {STATUS_OPTIONS.map(([v, l]) => (
            <SelectItem key={v} value={v}>
              {l}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={get("packageId", "all")}
        onValueChange={(v) => setParam("packageId", v)}
      >
        <SelectTrigger className="w-full lg:w-[160px]" aria-label="Package filter">
          <SelectValue placeholder="Package" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All packages</SelectItem>
          <SelectItem value="none">No package</SelectItem>
          {packages.map((p) => (
            <SelectItem key={p.id} value={p.id}>
              {p.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={get("payment", "all")}
        onValueChange={(v) => setParam("payment", v)}
      >
        <SelectTrigger className="w-full lg:w-[160px]" aria-label="Payment filter">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {PAYMENT_OPTIONS.map(([v, l]) => (
            <SelectItem key={v} value={v}>
              {l}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Button
        type="button"
        variant={expiring ? "default" : "outline"}
        onClick={() => setParam("expiring", expiring ? null : "1")}
      >
        Expiring soon
      </Button>

      <Select
        value={get("sort", "company_asc")}
        onValueChange={(v) => setParam("sort", v)}
      >
        <SelectTrigger className="w-full lg:w-[190px] lg:ml-auto" aria-label="Sort">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {SORT_OPTIONS.map(([v, l]) => (
            <SelectItem key={v} value={v}>
              {l}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {hasFilters && (
        <Button
          type="button"
          variant="ghost"
          onClick={() => startTransition(() => router.push(pathname))}
          className="text-muted-foreground"
        >
          <X className="size-4" />
          Clear
        </Button>
      )}
    </div>
  );
}
