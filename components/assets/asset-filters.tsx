"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { humanize } from "@/lib/format";

const TYPES = ["logo", "photo", "brand_guide", "ad_copy", "contract", "invoice", "report", "other"];

export function AssetFilters({
  sponsors,
}: {
  sponsors: { id: string; name: string }[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const get = (k: string) => params.get(k) ?? "";

  const setParam = (key: string, value: string) => {
    const next = new URLSearchParams(params.toString());
    if (!value || value === "all") next.delete(key);
    else next.set(key, value);
    router.push(`${pathname}?${next.toString()}`);
  };

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
      <Select value={get("sponsor") || "all"} onValueChange={(v) => setParam("sponsor", v)}>
        <SelectTrigger className="w-full sm:w-[200px]" aria-label="Sponsor filter">
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
        <SelectTrigger className="w-full sm:w-[180px]" aria-label="Type filter">
          <SelectValue placeholder="Type" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All types</SelectItem>
          {TYPES.map((t) => (
            <SelectItem key={t} value={t}>
              {humanize(t)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
