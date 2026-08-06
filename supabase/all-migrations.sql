-- =============================================================================
-- Wichita Life — ALL migrations, concatenated & idempotent.
-- Run this whole file in the Supabase SQL editor anytime to be fully up to date.
-- Safe to re-run. If you see an error mentioning 'transaction block', run the
-- 'alter type ... add value' lines by themselves first, then run this again.
-- =============================================================================


-- >>> 20260101000001_schema.sql <<<
-- =============================================================================
-- Wichita Life Sponsor Management — Schema (enums, tables, indexes)
-- Migration 1 of 2. Safe to re-run (idempotent).
-- =============================================================================
-- Postgres 15+ (Supabase). gen_random_uuid() is available in core.

-- -----------------------------------------------------------------------------
-- Enumerated types
-- Wrapped in DO blocks so re-running this file does not error.
-- To ADD a value later:  ALTER TYPE <name> ADD VALUE IF NOT EXISTS '<value>';
-- -----------------------------------------------------------------------------
do $$ begin create type user_role as enum ('owner','admin','team_member'); exception when duplicate_object then null; end $$;
do $$ begin create type sponsor_status as enum ('lead','active','paused','expired','archived'); exception when duplicate_object then null; end $$;
do $$ begin create type billing_frequency as enum ('monthly','quarterly','annually','one_time','custom'); exception when duplicate_object then null; end $$;
do $$ begin create type deliverable_type as enum ('newsletter_placement','dedicated_email','social_post','social_story','social_reel','website_banner','podcast_mention','event_sponsorship','custom'); exception when duplicate_object then null; end $$;
do $$ begin create type recurrence as enum ('monthly','quarterly','annually','one_time','custom'); exception when duplicate_object then null; end $$;
do $$ begin create type subscription_status as enum ('active','paused','ended'); exception when duplicate_object then null; end $$;
do $$ begin create type deliverable_status as enum ('not_scheduled','scheduled','waiting_on_assets','drafting','ready_for_review','approved','published','skipped','carried_forward','canceled'); exception when duplicate_object then null; end $$;
do $$ begin create type asset_status as enum ('not_needed','missing','partial','received'); exception when duplicate_object then null; end $$;
do $$ begin create type slot_type as enum ('newsletter','dedicated_email','instagram_post','instagram_story','instagram_reel','facebook_post','podcast','website','event','custom'); exception when duplicate_object then null; end $$;
do $$ begin create type invoice_status as enum ('not_created','draft','sent','partially_paid','paid','overdue','void'); exception when duplicate_object then null; end $$;
do $$ begin create type payment_method as enum ('ach','credit_card','check','cash','other'); exception when duplicate_object then null; end $$;
do $$ begin create type sponsor_asset_type as enum ('logo','photo','brand_guide','ad_copy','contract','invoice','report','other'); exception when duplicate_object then null; end $$;

-- -----------------------------------------------------------------------------
-- organizations
-- -----------------------------------------------------------------------------
create table if not exists organizations (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  slug        text not null unique,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- profiles  (one row per Supabase auth user)
-- -----------------------------------------------------------------------------
create table if not exists profiles (
  id               uuid primary key references auth.users(id) on delete cascade,
  organization_id  uuid not null references organizations(id) on delete cascade,
  full_name        text,
  role             user_role not null default 'team_member',
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index if not exists idx_profiles_org on profiles(organization_id);

-- -----------------------------------------------------------------------------
-- sponsors
-- -----------------------------------------------------------------------------
create table if not exists sponsors (
  id                     uuid primary key default gen_random_uuid(),
  organization_id        uuid not null references organizations(id) on delete cascade,
  company_name           text not null,
  status                 sponsor_status not null default 'lead',
  website                text,
  industry               text,
  primary_contact_name   text,
  primary_contact_email  text,
  primary_contact_phone  text,
  billing_contact_name   text,
  billing_contact_email  text,
  notes                  text,
  contract_start_date    date,
  contract_end_date      date,
  monthly_price          numeric(12,2),
  billing_frequency      billing_frequency not null default 'monthly',
  payment_method         payment_method,
  logo_url               text,
  is_demo                boolean not null default false,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);
create index if not exists idx_sponsors_org on sponsors(organization_id);
create index if not exists idx_sponsors_status on sponsors(organization_id, status);
create index if not exists idx_sponsors_contract_end on sponsors(organization_id, contract_end_date);

-- -----------------------------------------------------------------------------
-- packages
-- -----------------------------------------------------------------------------
create table if not exists packages (
  id                 uuid primary key default gen_random_uuid(),
  organization_id    uuid not null references organizations(id) on delete cascade,
  name               text not null,
  description        text,
  base_price         numeric(12,2) not null default 0,
  billing_frequency  billing_frequency not null default 'monthly',
  active             boolean not null default true,
  is_demo            boolean not null default false,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
create index if not exists idx_packages_org on packages(organization_id);

-- -----------------------------------------------------------------------------
-- package_deliverable_rules
-- -----------------------------------------------------------------------------
create table if not exists package_deliverable_rules (
  id                uuid primary key default gen_random_uuid(),
  organization_id   uuid not null references organizations(id) on delete cascade,
  package_id        uuid not null references packages(id) on delete cascade,
  deliverable_type  deliverable_type not null,
  quantity          integer not null default 1 check (quantity >= 0),
  recurrence        recurrence not null default 'monthly',
  notes             text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index if not exists idx_pkg_rules_org on package_deliverable_rules(organization_id);
create index if not exists idx_pkg_rules_package on package_deliverable_rules(package_id);

-- -----------------------------------------------------------------------------
-- sponsor_subscriptions  (connect a sponsor to a package)
-- -----------------------------------------------------------------------------
create table if not exists sponsor_subscriptions (
  id                          uuid primary key default gen_random_uuid(),
  organization_id             uuid not null references organizations(id) on delete cascade,
  sponsor_id                  uuid not null references sponsors(id) on delete cascade,
  package_id                  uuid references packages(id) on delete set null,
  custom_monthly_price        numeric(12,2),
  start_date                  date not null,
  end_date                    date,
  status                      subscription_status not null default 'active',
  auto_generate_deliverables  boolean not null default true,
  notes                       text,
  is_demo                     boolean not null default false,
  created_at                  timestamptz not null default now(),
  updated_at                  timestamptz not null default now()
);
create index if not exists idx_subs_org on sponsor_subscriptions(organization_id);
create index if not exists idx_subs_sponsor on sponsor_subscriptions(sponsor_id);
create index if not exists idx_subs_status on sponsor_subscriptions(organization_id, status);

-- -----------------------------------------------------------------------------
-- subscription_deliverable_overrides  (per-sponsor customization)
--   Interpretation: an override row SETS the effective quantity for that
--   deliverable type on that subscription (0 = remove), replacing the package
--   rule for that type. Types with no override use the package rule.
-- -----------------------------------------------------------------------------
create table if not exists subscription_deliverable_overrides (
  id                        uuid primary key default gen_random_uuid(),
  organization_id           uuid not null references organizations(id) on delete cascade,
  sponsor_subscription_id   uuid not null references sponsor_subscriptions(id) on delete cascade,
  deliverable_type          deliverable_type not null,
  quantity                  integer not null default 1 check (quantity >= 0),
  recurrence                recurrence not null default 'monthly',
  notes                     text,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now(),
  unique (sponsor_subscription_id, deliverable_type)
);
create index if not exists idx_overrides_org on subscription_deliverable_overrides(organization_id);
create index if not exists idx_overrides_sub on subscription_deliverable_overrides(sponsor_subscription_id);

-- -----------------------------------------------------------------------------
-- deliverables
--   service_month           = month currently being fulfilled in (first of month)
--   original_service_month  = month it was first owed (preserved on carry-forward)
--   sequence / quantity_total = "N of M" for generated deliverables
-- -----------------------------------------------------------------------------
create table if not exists deliverables (
  id                       uuid primary key default gen_random_uuid(),
  organization_id          uuid not null references organizations(id) on delete cascade,
  sponsor_id               uuid not null references sponsors(id) on delete cascade,
  sponsor_subscription_id  uuid references sponsor_subscriptions(id) on delete set null,
  deliverable_type         deliverable_type not null,
  title                    text,
  service_month            date not null,
  original_service_month   date not null,
  sequence                 integer,
  quantity_total           integer,
  due_date                 date,
  scheduled_date           date,
  published_date           date,
  status                   deliverable_status not null default 'not_scheduled',
  content_channel          text,
  content_url              text,
  asset_status             asset_status not null default 'not_needed',
  notes                    text,
  is_demo                  boolean not null default false,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);
create index if not exists idx_deliverables_org on deliverables(organization_id);
create index if not exists idx_deliverables_sponsor on deliverables(sponsor_id);
create index if not exists idx_deliverables_service_month on deliverables(organization_id, service_month);
create index if not exists idx_deliverables_status on deliverables(organization_id, status);
create index if not exists idx_deliverables_due on deliverables(organization_id, due_date);
create index if not exists idx_deliverables_scheduled on deliverables(organization_id, scheduled_date);

-- Idempotency guard: a given subscription/type/month/sequence is generated once.
-- Manual deliverables (null subscription) are exempt and can be added freely.
create unique index if not exists uq_deliverables_generated
  on deliverables (sponsor_subscription_id, deliverable_type, original_service_month, sequence)
  where sponsor_subscription_id is not null and sequence is not null;

-- -----------------------------------------------------------------------------
-- deliverable_status_history  (audit trail)
-- -----------------------------------------------------------------------------
create table if not exists deliverable_status_history (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references organizations(id) on delete cascade,
  deliverable_id   uuid not null references deliverables(id) on delete cascade,
  from_status      deliverable_status,
  to_status        deliverable_status not null,
  changed_by       uuid references profiles(id) on delete set null,
  changed_at       timestamptz not null default now(),
  note             text
);
create index if not exists idx_delhist_deliverable on deliverable_status_history(deliverable_id);
create index if not exists idx_delhist_org on deliverable_status_history(organization_id);

-- -----------------------------------------------------------------------------
-- generation_runs  (records when monthly generation was executed)
-- -----------------------------------------------------------------------------
create table if not exists generation_runs (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references organizations(id) on delete cascade,
  service_month    date not null,
  run_by           uuid references profiles(id) on delete set null,
  created_count    integer not null default 0,
  skipped_count    integer not null default 0,
  created_at       timestamptz not null default now()
);
create index if not exists idx_genruns_org_month on generation_runs(organization_id, service_month);

-- -----------------------------------------------------------------------------
-- content_slots  (newsletter / social inventory)
-- -----------------------------------------------------------------------------
create table if not exists content_slots (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references organizations(id) on delete cascade,
  slot_type        slot_type not null,
  title            text,
  scheduled_date   date not null,
  capacity         integer not null default 1 check (capacity > 0),
  notes            text,
  is_demo          boolean not null default false,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index if not exists idx_slots_org_date on content_slots(organization_id, scheduled_date);
create index if not exists idx_slots_type on content_slots(organization_id, slot_type);

-- -----------------------------------------------------------------------------
-- deliverable_slot_assignments
-- -----------------------------------------------------------------------------
create table if not exists deliverable_slot_assignments (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references organizations(id) on delete cascade,
  deliverable_id   uuid not null references deliverables(id) on delete cascade,
  content_slot_id  uuid not null references content_slots(id) on delete cascade,
  position         integer not null default 0,
  created_at       timestamptz not null default now(),
  unique (deliverable_id)
);
create index if not exists idx_assign_slot on deliverable_slot_assignments(content_slot_id);
create index if not exists idx_assign_org on deliverable_slot_assignments(organization_id);

-- -----------------------------------------------------------------------------
-- invoices
-- -----------------------------------------------------------------------------
create table if not exists invoices (
  id                    uuid primary key default gen_random_uuid(),
  organization_id       uuid not null references organizations(id) on delete cascade,
  sponsor_id            uuid not null references sponsors(id) on delete cascade,
  invoice_number        text,
  service_period_start  date,
  service_period_end    date,
  invoice_date          date,
  due_date              date,
  amount                numeric(12,2) not null default 0,
  status                invoice_status not null default 'draft',
  invoice_url           text,
  notes                 text,
  is_demo               boolean not null default false,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);
create index if not exists idx_invoices_org on invoices(organization_id);
create index if not exists idx_invoices_sponsor on invoices(sponsor_id);
create index if not exists idx_invoices_status on invoices(organization_id, status);
create index if not exists idx_invoices_due on invoices(organization_id, due_date);
create unique index if not exists uq_invoice_number
  on invoices(organization_id, invoice_number) where invoice_number is not null;

-- -----------------------------------------------------------------------------
-- payments
-- -----------------------------------------------------------------------------
create table if not exists payments (
  id                uuid primary key default gen_random_uuid(),
  organization_id   uuid not null references organizations(id) on delete cascade,
  sponsor_id        uuid not null references sponsors(id) on delete cascade,
  invoice_id        uuid references invoices(id) on delete set null,
  amount            numeric(12,2) not null,
  payment_date      date not null,
  payment_method    payment_method,
  reference_number  text,
  notes             text,
  is_demo           boolean not null default false,
  created_at        timestamptz not null default now()
);
create index if not exists idx_payments_org on payments(organization_id);
create index if not exists idx_payments_invoice on payments(invoice_id);
create index if not exists idx_payments_sponsor on payments(sponsor_id);

-- -----------------------------------------------------------------------------
-- sponsor_assets
-- -----------------------------------------------------------------------------
create table if not exists sponsor_assets (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references organizations(id) on delete cascade,
  sponsor_id       uuid not null references sponsors(id) on delete cascade,
  deliverable_id   uuid references deliverables(id) on delete set null,
  asset_type       sponsor_asset_type not null default 'other',
  name             text,
  file_url         text,
  external_url     text,
  file_size        bigint,
  mime_type        text,
  is_demo          boolean not null default false,
  created_at       timestamptz not null default now()
);
create index if not exists idx_assets_org on sponsor_assets(organization_id);
create index if not exists idx_assets_sponsor on sponsor_assets(sponsor_id);
create index if not exists idx_assets_deliverable on sponsor_assets(deliverable_id);


-- >>> 20260101000002_functions_and_rls.sql <<<
-- =============================================================================
-- Wichita Life Sponsor Management — Functions, Triggers, Row Level Security
-- Migration 2 of 2. Safe to re-run (idempotent).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- updated_at maintenance
-- -----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare t text;
begin
  foreach t in array array[
    'organizations','profiles','sponsors','packages','package_deliverable_rules',
    'sponsor_subscriptions','subscription_deliverable_overrides','deliverables',
    'content_slots','invoices'
  ] loop
    execute format('drop trigger if exists trg_%1$s_updated_at on %1$s;', t);
    execute format(
      'create trigger trg_%1$s_updated_at before update on %1$s
         for each row execute function public.set_updated_at();', t);
  end loop;
end $$;

-- -----------------------------------------------------------------------------
-- auth_org_id(): the signed-in user's organization.
-- SECURITY DEFINER so it reads profiles without tripping RLS (no recursion).
-- -----------------------------------------------------------------------------
create or replace function public.auth_org_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select organization_id from public.profiles where id = auth.uid();
$$;

-- -----------------------------------------------------------------------------
-- handle_new_user(): create a profile when a Supabase auth user is created.
--   * Links the new user to the existing (seeded) organization.
--   * The very first user becomes 'owner'; later users default to 'team_member'.
--   * If no organization exists yet, one is created (SaaS-friendly bootstrap).
-- -----------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org_id   uuid;
  v_is_first boolean;
begin
  select id into v_org_id from public.organizations order by created_at asc limit 1;

  if v_org_id is null then
    insert into public.organizations (name, slug)
    values ('My Organization', 'org-' || substr(new.id::text, 1, 8))
    returning id into v_org_id;
  end if;

  select not exists (select 1 from public.profiles) into v_is_first;

  insert into public.profiles (id, organization_id, full_name, role)
  values (
    new.id,
    v_org_id,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    (case when v_is_first then 'owner' else 'team_member' end)::user_role
  );

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- -----------------------------------------------------------------------------
-- Row Level Security
-- -----------------------------------------------------------------------------

-- Enable RLS on every table.
do $$
declare t text;
begin
  foreach t in array array[
    'organizations','profiles','sponsors','packages','package_deliverable_rules',
    'sponsor_subscriptions','subscription_deliverable_overrides','deliverables',
    'deliverable_status_history','generation_runs','content_slots',
    'deliverable_slot_assignments','invoices','payments','sponsor_assets'
  ] loop
    execute format('alter table %I enable row level security;', t);
  end loop;
end $$;

-- Standard org-scoped tables: one policy for ALL commands.
-- A row is visible/writable only if it belongs to the caller's organization.
do $$
declare t text;
begin
  foreach t in array array[
    'sponsors','packages','package_deliverable_rules','sponsor_subscriptions',
    'subscription_deliverable_overrides','deliverables','deliverable_status_history',
    'generation_runs','content_slots','deliverable_slot_assignments','invoices',
    'payments','sponsor_assets'
  ] loop
    execute format('drop policy if exists org_isolation on %I;', t);
    execute format(
      'create policy org_isolation on %I
         for all to authenticated
         using (organization_id = public.auth_org_id())
         with check (organization_id = public.auth_org_id());', t);
  end loop;
end $$;

-- organizations: a user sees and edits only their own organization.
drop policy if exists org_select on organizations;
create policy org_select on organizations
  for select to authenticated
  using (id = public.auth_org_id());

drop policy if exists org_update on organizations;
create policy org_update on organizations
  for update to authenticated
  using (id = public.auth_org_id())
  with check (id = public.auth_org_id());

-- profiles: a user sees profiles in their org and updates only their own row.
drop policy if exists profiles_select on profiles;
create policy profiles_select on profiles
  for select to authenticated
  using (organization_id = public.auth_org_id());

drop policy if exists profiles_update_own on profiles;
create policy profiles_update_own on profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid() and organization_id = public.auth_org_id());


-- >>> 20260101000003_email_slot_types.sql <<<
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


-- >>> 20260101000004_stripe_payment_method.sql <<<
-- =============================================================================
-- Add Stripe as a payment method + a per-sponsor "is this a Stripe subscription"
-- flag. Run in the Supabase SQL editor. Safe to re-run.
-- (ALTER TYPE ... ADD VALUE must run outside a transaction — the SQL editor is fine.)
-- =============================================================================

alter type payment_method add value if not exists 'stripe';

alter table sponsors
  add column if not exists stripe_subscription boolean not null default false;


-- >>> 20260101000006_billing_periods.sql <<<
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


-- >>> 20260101000007_distribution.sql <<<
-- =============================================================================
-- Distribution: wholesale & consignment tracking for physical products
-- (puzzles, hats, etc.) dropped off at retail locations.
-- Run in the Supabase SQL editor. Safe to re-run.
-- =============================================================================

do $$ begin create type distribution_deal_type as enum ('wholesale','consignment'); exception when duplicate_object then null; end $$;
do $$ begin create type distribution_product_category as enum ('puzzle','hat','apparel','print','other'); exception when duplicate_object then null; end $$;

-- Locations (shops / places you drop product) ---------------------------------
create table if not exists distribution_locations (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references organizations(id) on delete cascade,
  name             text not null,
  contact_name     text,
  contact_email    text,
  phone            text,
  address          text,
  notes            text,
  is_demo          boolean not null default false,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index if not exists idx_dist_locations_org on distribution_locations(organization_id);

-- Products (catalog) ----------------------------------------------------------
create table if not exists distribution_products (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references organizations(id) on delete cascade,
  name             text not null,
  category         distribution_product_category not null default 'other',
  retail_price     numeric(12,2) not null default 0,
  wholesale_price  numeric(12,2) not null default 0,
  active           boolean not null default true,
  is_demo          boolean not null default false,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index if not exists idx_dist_products_org on distribution_products(organization_id);

-- Drop-offs (a delivery event) ------------------------------------------------
create table if not exists distribution_dropoffs (
  id                 uuid primary key default gen_random_uuid(),
  organization_id    uuid not null references organizations(id) on delete cascade,
  location_id        uuid not null references distribution_locations(id) on delete cascade,
  deal_type          distribution_deal_type not null,
  delivered_date     date not null,
  consignment_rate   numeric(5,4) not null default 0.70,  -- your share for consignment
  paid               boolean not null default false,      -- wholesale: paid up front?
  paid_date          date,
  settled            boolean not null default false,      -- consignment: month settled?
  notes              text,
  is_demo            boolean not null default false,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
create index if not exists idx_dist_dropoffs_org on distribution_dropoffs(organization_id);
create index if not exists idx_dist_dropoffs_location on distribution_dropoffs(location_id);
create index if not exists idx_dist_dropoffs_date on distribution_dropoffs(organization_id, delivered_date);

-- Drop-off line items ---------------------------------------------------------
create table if not exists distribution_dropoff_items (
  id                   uuid primary key default gen_random_uuid(),
  organization_id      uuid not null references organizations(id) on delete cascade,
  dropoff_id           uuid not null references distribution_dropoffs(id) on delete cascade,
  product_id           uuid references distribution_products(id) on delete set null,
  product_name         text not null,
  quantity             integer not null default 0 check (quantity >= 0),
  unit_wholesale_price numeric(12,2) not null default 0,
  unit_retail_price    numeric(12,2) not null default 0,
  quantity_sold        integer not null default 0 check (quantity_sold >= 0),
  quantity_returned    integer not null default 0 check (quantity_returned >= 0),
  is_demo              boolean not null default false,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);
create index if not exists idx_dist_items_dropoff on distribution_dropoff_items(dropoff_id);
create index if not exists idx_dist_items_org on distribution_dropoff_items(organization_id);

-- updated_at triggers ---------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array[
    'distribution_locations','distribution_products',
    'distribution_dropoffs','distribution_dropoff_items'
  ] loop
    execute format('drop trigger if exists trg_%1$s_updated_at on %1$s;', t);
    execute format(
      'create trigger trg_%1$s_updated_at before update on %1$s
         for each row execute function public.set_updated_at();', t);
  end loop;
end $$;

-- Row Level Security ----------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array[
    'distribution_locations','distribution_products',
    'distribution_dropoffs','distribution_dropoff_items'
  ] loop
    execute format('alter table %I enable row level security;', t);
    execute format('drop policy if exists org_isolation on %I;', t);
    execute format(
      'create policy org_isolation on %I for all to authenticated
         using (organization_id = public.auth_org_id())
         with check (organization_id = public.auth_org_id());', t);
  end loop;
end $$;


-- >>> 20260101000008_storage.sql <<<
-- =============================================================================
-- Storage bucket for sponsor assets (private) + organization-scoped access.
-- Files are stored at path:  <organization_id>/<sponsor_id>/<filename>
-- so the first path folder identifies the owning organization.
-- Run in the Supabase SQL editor. Safe to re-run.
-- =============================================================================

insert into storage.buckets (id, name, public)
values ('sponsor-assets', 'sponsor-assets', false)
on conflict (id) do nothing;

-- Access is limited to files whose top-level folder matches the caller's org.
drop policy if exists "sponsor_assets_org_all" on storage.objects;
create policy "sponsor_assets_org_all" on storage.objects
  for all to authenticated
  using (
    bucket_id = 'sponsor-assets'
    and (storage.foldername(name))[1] = public.auth_org_id()::text
  )
  with check (
    bucket_id = 'sponsor-assets'
    and (storage.foldername(name))[1] = public.auth_org_id()::text
  );



-- =============================================================================
-- >>> 20260101000009_deep_dive.sql <<<
-- Add the "Deep Dive (sponsored)" deliverable type (Wednesday email only).
-- ALTER TYPE ... ADD VALUE must run outside a transaction.
-- =============================================================================

alter type deliverable_type add value if not exists 'deep_dive_sponsored';


-- =============================================================================
-- >>> 20260101000010_sponsor_analytics_url.sql <<<
-- Per-sponsor analytics link (e.g. a Google Sheet).
-- =============================================================================

alter table sponsors add column if not exists analytics_url text;


-- =============================================================================
-- >>> 20260101000011_deal_type.sql <<<
-- Deal compensation: cash / trade / both, plus free-text details.
-- =============================================================================

alter table sponsors add column if not exists deal_type text;
alter table sponsors add column if not exists deal_notes text;


-- =============================================================================
-- >>> 20260101000012_slot_deliverable_type.sql <<<
-- Content slots carry a deliverable_type (same vocabulary as deliverables).
-- =============================================================================

alter table content_slots
  add column if not exists deliverable_type deliverable_type;

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
