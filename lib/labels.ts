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
 * Selectable deliverable-type options (value + human label) for dropdowns. Email
 * ad slots come first since they are Wichita Life's primary inventory. The old
 * generic "newsletter_placement" is intentionally NOT offered — "Email — Headline"
 * is the same thing — but legacy rows still display via LEGACY_LABELS below.
 */
export const DELIVERABLE_TYPE_OPTIONS: readonly (readonly [string, string])[] = [
  ["newsletter_headline", "Email — Headline"],
  ["newsletter_feature", "Email — Feature"],
  ["newsletter_lower", "Email — Lower"],
  ["event_banner", "Email — Event banner"],
  ["deep_dive_sponsored", "Deep Dive (sponsored)"],
  ["dedicated_email", "Dedicated email"],
  ["social_post", "Social post"],
  ["social_story", "Social story"],
  ["social_reel", "Social reel"],
  ["website_banner", "Website banner"],
  ["podcast_mention", "Podcast mention"],
  ["event_sponsorship", "Event sponsorship"],
  ["custom", "Custom"],
] as const;

// Legacy/consolidated values that are no longer offered but may exist in data.
const LEGACY_LABELS: Record<string, string> = {
  newsletter_placement: "Email — Headline",
};

/**
 * Map a deliverable_type to the legacy content-slot `slot_type` used for
 * grouping (newsletter vs social). Slots now carry a deliverable_type directly;
 * this keeps slot_type populated so the newsletter/social filters still work.
 */
export const DELIVERABLE_TO_SLOT_TYPE: Record<string, SlotType> = {
  newsletter_headline: "newsletter",
  newsletter_feature: "newsletter",
  newsletter_lower: "newsletter",
  event_banner: "newsletter",
  newsletter_placement: "newsletter",
  deep_dive_sponsored: "newsletter",
  dedicated_email: "dedicated_email",
  social_post: "instagram_post",
  social_story: "instagram_story",
  social_reel: "instagram_reel",
  website_banner: "website",
  podcast_mention: "podcast",
  event_sponsorship: "event",
  custom: "custom",
};

export function slotTypeForDeliverable(type: string): SlotType {
  return DELIVERABLE_TO_SLOT_TYPE[type] ?? "custom";
}

/** Email ad tiers (calendar auto-schedule) → their deliverable_type. */
export const EMAIL_TIER_DELIVERABLE_TYPE: Record<string, string> = {
  Headline: "newsletter_headline",
  Feature: "newsletter_feature",
  Lower: "newsletter_lower",
  "Event banner": "event_banner",
  "Deep Dive": "deep_dive_sponsored",
};

/**
 * Email ad tiers form a hierarchy: a higher slot can fulfill a lower-tier
 * deliverable (Headline > Feature > Lower). event_banner / deep_dive are
 * standalone and only match themselves exactly.
 */
export const EMAIL_TIER_RANK: Record<string, number> = {
  newsletter_headline: 3,
  newsletter_feature: 2,
  newsletter_lower: 1,
};

/**
 * Can a slot of `slotType` fulfill a deliverable of `deliverableType`? True for
 * an exact match, or when both are email tiers and the slot's tier is at least
 * the deliverable's (e.g. a Headline slot fulfills a Feature or Lower).
 */
export function slotFulfillsDeliverable(
  slotType: string | null | undefined,
  deliverableType: string | null | undefined,
): boolean {
  if (!slotType || !deliverableType) return false;
  if (slotType === deliverableType) return true;
  const slotRank = EMAIL_TIER_RANK[slotType];
  const delRank = EMAIL_TIER_RANK[deliverableType];
  if (slotRank != null && delRank != null) return slotRank >= delRank;
  return false;
}

const DELIVERABLE_TYPE_LABELS: Record<string, string> = {
  ...Object.fromEntries(DELIVERABLE_TYPE_OPTIONS),
  ...LEGACY_LABELS,
};

/** Friendly label for a deliverable type (falls back to humanized value). */
export function deliverableTypeLabel(value: string | null | undefined): string {
  if (!value) return "—";
  return DELIVERABLE_TYPE_LABELS[value] ?? humanize(value);
}
