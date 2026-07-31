-- =============================================================================
-- Add a per-sponsor analytics link (e.g. a Google Sheet of partner analytics).
-- Safe to re-run.
-- =============================================================================

alter table sponsors add column if not exists analytics_url text;
