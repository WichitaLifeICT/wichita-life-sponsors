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
