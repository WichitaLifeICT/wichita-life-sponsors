-- =============================================================================
-- Flexible-schedule deliverables: annual / one-time items that are owed for a
-- period (e.g. "6 social posts over the year") and can be placed on the calendar
-- any time within it. They are a schedulable pool, NOT tied to a single month,
-- so they must not be counted as "behind" just because their service month has
-- passed. Safe to re-run.
-- =============================================================================

alter table deliverables
  add column if not exists flexible_schedule boolean not null default false;
