import { humanize } from "@/lib/format";
import type { DeliverableStatus, SlotType } from "@/types/database";

/** Content slot types (value + label). Client-safe (no server imports). */
export const SLOT_TYPE_OPTIONS: readonly (readonly [SlotType, string])[] = [
  ["newsletter", "Newsletter (email)"],
  ["dedicated_email", "Dedicated email"],
  ["instagram_post", "Instagram post"],
  ["instagram_story", "Instagram story"],
  ["instagram_reel", "Instagram reel"],
  ["facebook_post", "Facebook post"],
  ["podcast", "Podcast"],
  ["website", "Website"],
  ["event", "Event"],
  ["custom", "Custom"],
] as const;

/** All deliverable statuses in workflow order. Client-safe (no server imports). */
export const DELIVERABLE_STATUSES: DeliverableStatus[] = [
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

/**
 * Canonical deliverable-type options (value + human label), used by both the
 * rules editor dropdown and anywhere deliverables are displayed. Email ad slots
 * come first since they are Wichita Life's primary inventory.
 */
export const DELIVERABLE_TYPE_OPTIONS: readonly (readonly [string, string])[] = [
  ["newsletter_headline", "Email — Headline"],
  ["newsletter_feature", "Email — Feature"],
  ["newsletter_lower", "Email — Lower"],
  ["event_banner", "Email — Event banner"],
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

const DELIVERABLE_TYPE_LABELS: Record<string, string> = Object.fromEntries(
  DELIVERABLE_TYPE_OPTIONS,
);

/** Friendly label for a deliverable type (falls back to humanized value). */
export function deliverableTypeLabel(value: string | null | undefined): string {
  if (!value) return "—";
  return DELIVERABLE_TYPE_LABELS[value] ?? humanize(value);
}
