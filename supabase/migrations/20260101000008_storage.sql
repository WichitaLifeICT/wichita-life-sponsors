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
