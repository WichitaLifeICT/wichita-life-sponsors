-- =============================================================================
-- Add Stripe as a payment method + a per-sponsor "is this a Stripe subscription"
-- flag. Run in the Supabase SQL editor. Safe to re-run.
-- (ALTER TYPE ... ADD VALUE must run outside a transaction — the SQL editor is fine.)
-- =============================================================================

alter type payment_method add value if not exists 'stripe';

alter table sponsors
  add column if not exists stripe_subscription boolean not null default false;
