-- =============================================================================
-- How a deal is compensated: cash, trade (barter), or both — plus free-text
-- details (e.g. what the trade covers). Safe to re-run.
-- =============================================================================

alter table sponsors add column if not exists deal_type text;
alter table sponsors add column if not exists deal_notes text;
