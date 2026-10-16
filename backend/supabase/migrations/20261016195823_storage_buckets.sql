-- storage_buckets
-- case-docs: private case documents, path {advocate_id}/{case_id}/{uuid}.{ext}, 20 MB max.
--            Read through short-lived signed URLs.
-- avatars:   profile photos, path {advocate_id}/{file}. Public read (URL is unguessable),
--            writes only into your own folder.

insert into storage.buckets (id, name, public, file_size_limit)
values ('case-docs', 'case-docs', false, 20971520)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'])
on conflict (id) do nothing;

-- The first folder of every object path is the owner's user id.
-- Upsert needs INSERT + SELECT + UPDATE, so all four are granted on both buckets.

create policy "Advocates can read their own files"
  on storage.objects for select
  to authenticated
  using (
    bucket_id in ('case-docs', 'avatars')
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "Advocates can upload into their own folder"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id in ('case-docs', 'avatars')
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "Advocates can update their own files"
  on storage.objects for update
  to authenticated
  using (
    bucket_id in ('case-docs', 'avatars')
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id in ('case-docs', 'avatars')
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "Advocates can delete their own files"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id in ('case-docs', 'avatars')
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
