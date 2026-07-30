-- =============================================================================
-- Add Wichita Life email ad-slot deliverable types.
-- Safe to re-run. Run this in the Supabase SQL editor before using the new
-- types in the app (the app writes these enum values to the database).
--
-- Note: ALTER TYPE ... ADD VALUE must run OUTSIDE a transaction. The Supabase
-- SQL editor runs statements individually, so this works as-is.
-- =============================================================================

alter type deliverable_type add value if not exists 'newsletter_headline';
alter type deliverable_type add value if not exists 'newsletter_feature';
alter type deliverable_type add value if not exists 'newsletter_lower';
alter type deliverable_type add value if not exists 'event_banner';
