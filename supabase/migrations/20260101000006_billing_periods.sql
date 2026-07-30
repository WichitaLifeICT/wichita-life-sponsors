-- =============================================================================
-- Billing periods: a simple "mark paid per period" ledger (no invoicing).
-- Periods are generated in the app from each sponsor's contract start date and
-- billing frequency; this table stores the amount + paid mark for each one.
-- Run in the Supabase SQL editor. Safe to re-run.
-- =============================================================================

create table if not exists billing_periods (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references organizations(id) on delete cascade,
  sponsor_id       uuid not null references sponsors(id) on delete cascade,
  period_start     date not null,
  period_end       date not null,
  amount           numeric(12,2) not null default 0,
  paid             boolean not null default false,
  paid_date        date,
  method           payment_method,
  notes            text,
  is_demo          boolean not null default false,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (sponsor_id, period_start)
);

create index if not exists idx_billing_periods_org on billing_periods(organization_id);
create index if not exists idx_billing_periods_sponsor on billing_periods(sponsor_id);

-- updated_at trigger
drop trigger if exists trg_billing_periods_updated_at on billing_periods;
create trigger trg_billing_periods_updated_at
  before update on billing_periods
  for each row execute function public.set_updated_at();

-- Row Level Security (organization-scoped, same pattern as every other table)
alter table billing_periods enable row level security;
drop policy if exists org_isolation on billing_periods;
create policy org_isolation on billing_periods
  for all to authenticated
  using (organization_id = public.auth_org_id())
  with check (organization_id = public.auth_org_id());
