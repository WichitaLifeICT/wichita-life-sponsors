-- =============================================================================
-- Add the "Deep Dive (sponsored)" deliverable type.
-- A sponsored long-form segment that runs in the Wednesday email only.
-- Safe to re-run.
--
-- Note: ALTER TYPE ... ADD VALUE must run OUTSIDE a transaction. The Supabase
-- SQL editor runs statements individually, so this works as-is.
-- =============================================================================

alter type deliverable_type add value if not exists 'deep_dive_sponsored';
