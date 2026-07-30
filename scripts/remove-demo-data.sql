-- =============================================================================
-- Remove all demo/sample data. Only rows flagged is_demo = true are deleted;
-- anything real you've entered is left alone. Foreign-key cascades remove the
-- related child rows automatically.
--
-- You can also do this with one click in the app: Settings → Data management →
-- "Remove demo data". This SQL is the manual equivalent.
-- =============================================================================

delete from sponsors where is_demo = true;                 -- + subscriptions, deliverables, invoices, payments, assets, billing periods
delete from packages where is_demo = true;                 -- + package deliverable rules
delete from content_slots where is_demo = true;            -- + slot assignments
delete from distribution_locations where is_demo = true;   -- + drop-offs and their items
delete from distribution_products where is_demo = true;

-- Optional: the seeded generation-run marker (not flagged demo)
-- delete from generation_runs where service_month = date '2026-08-01' and created_count = 9;
