-- =============================================================================
-- Calendar day blocks: mark a day as off (a holiday or any custom-named day) so
-- no posts go out that day. One block per date per org. Safe to re-run.
-- =============================================================================

create table if not exists calendar_blocks (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references organizations(id) on delete cascade,
  block_date       date not null,
  name             text not null default 'Holiday',
  created_at       timestamptz not null default now(),
  unique (organization_id, block_date)
);

create index if not exists idx_calendar_blocks_org_date
  on calendar_blocks(organization_id, block_date);

alter table calendar_blocks enable row level security;
drop policy if exists org_isolation on calendar_blocks;
create policy org_isolation on calendar_blocks
  for all to authenticated
  using (organization_id = public.auth_org_id())
  with check (organization_id = public.auth_org_id());
