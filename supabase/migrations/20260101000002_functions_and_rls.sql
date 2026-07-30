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
