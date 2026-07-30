"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";

function shift(month: string, by: number): string {
  const [y, m] = month.split("-").map(Number);
  const zero = y * 12 + (m - 1) + by;
  const ny = Math.floor(zero / 12);
  const nm = (zero % 12) + 1;
  return `${String(ny).padStart(4, "0")}-${String(nm).padStart(2, "0")}`;
}

function label(month: string): string {
  const [y, m] = month.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** Month navigation that drives the ?month=YYYY-MM query param. */
export function MonthPicker({ month }: { month: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const go = (m: string) => {
    const next = new URLSearchParams(params.toString());
    next.set("month", m);
    router.push(`${pathname}?${next.toString()}`);
  };

  return (
    <div className="flex items-center gap-1">
      <Button
        variant="outline"
        size="icon"
        aria-label="Previous month"
        onClick={() => go(shift(month, -1))}
      >
        <ChevronLeft className="size-4" />
      </Button>
      <div className="min-w-[10rem] text-center text-sm font-medium">
        {label(month)}
      </div>
      <Button
        variant="outline"
        size="icon"
        aria-label="Next month"
        onClick={() => go(shift(month, 1))}
      >
        <ChevronRight className="size-4" />
      </Button>
    </div>
  );
}
