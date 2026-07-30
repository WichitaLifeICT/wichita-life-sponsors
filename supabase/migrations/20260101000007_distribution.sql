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
