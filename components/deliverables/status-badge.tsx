import { Badge, type BadgeProps } from "@/components/ui/badge";
import { humanize } from "@/lib/format";

export const STATUS_VARIANT: Record<string, BadgeProps["variant"]> = {
  published: "success",
  approved: "success",
  scheduled: "secondary",
  ready_for_review: "secondary",
  drafting: "secondary",
  waiting_on_assets: "warning",
  not_scheduled: "outline",
  carried_forward: "warning",
  skipped: "outline",
  canceled: "destructive",
};

export const ASSET_VARIANT: Record<string, BadgeProps["variant"]> = {
  received: "success",
  partial: "warning",
  missing: "destructive",
  not_needed: "outline",
};

export function DeliverableStatusBadge({ status }: { status: string }) {
  return <Badge variant={STATUS_VARIANT[status] ?? "outline"}>{humanize(status)}</Badge>;
}

export function AssetStatusBadge({ status }: { status: string }) {
  // Asset tracking is de-emphasized: an empty "missing"/"not_needed" state is
  // noise (there's nothing to store), so only surface a badge when an asset has
  // actually been received or is partially in.
  if (!status || status === "missing" || status === "not_needed") return null;
  return <Badge variant={ASSET_VARIANT[status] ?? "outline"}>{humanize(status)}</Badge>;
}
