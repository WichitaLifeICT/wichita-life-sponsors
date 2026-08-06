-- =============================================================================
-- Line up content slots with deliverables: give each slot a deliverable_type
-- (same vocabulary as deliverables), so a slot's type matches the deliverable
-- it holds. slot_type is kept for grouping (newsletter vs social) and derived
-- from deliverable_type going forward. Safe to re-run.
-- =============================================================================

alter table content_slots
  add column if not exists deliverable_type deliverable_type;

-- Backfill the email ad-tier slots created by "Auto-schedule emails" (they were
-- stored as slot_type='newsletter' with the tier in the title).
update content_slots set deliverable_type = 'newsletter_headline'
  where deliverable_type is null and title = 'Headline';
update content_slots set deliverable_type = 'newsletter_feature'
  where deliverable_type is null and title = 'Feature';
update content_slots set deliverable_type = 'newsletter_lower'
  where deliverable_type is null and title = 'Lower';
update content_slots set deliverable_type = 'event_banner'
  where deliverable_type is null and title = 'Event banner';
update content_slots set deliverable_type = 'deep_dive_sponsored'
  where deliverable_type is null and title = 'Deep Dive';

-- Best-effort backfill for other legacy slot types.
update content_slots set deliverable_type = 'dedicated_email'
  where deliverable_type is null and slot_type = 'dedicated_email';
update content_slots set deliverable_type = 'social_post'
  where deliverable_type is null and slot_type = 'instagram_post';
update content_slots set deliverable_type = 'social_story'
  where deliverable_type is null and slot_type = 'instagram_story';
update content_slots set deliverable_type = 'social_reel'
  where deliverable_type is null and slot_type = 'instagram_reel';
update content_slots set deliverable_type = 'social_post'
  where deliverable_type is null and slot_type = 'facebook_post';
update content_slots set deliverable_type = 'website_banner'
  where deliverable_type is null and slot_type = 'website';
update content_slots set deliverable_type = 'podcast_mention'
  where deliverable_type is null and slot_type = 'podcast';
update content_slots set deliverable_type = 'event_sponsorship'
  where deliverable_type is null and slot_type = 'event';
