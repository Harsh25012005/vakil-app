-- auth_signup
-- Runs inside Supabase Auth when a user signs up (email + password or Google):
-- creates the advocate profile and seeds the starter court list, case types and a
-- welcome notification, so the app is usable the moment sign-up returns (FR-ONB-02).
--
-- SECURITY DEFINER because it is fired by the auth service, not by the user. It lives
-- in the private schema and takes no input except the new auth.users row.
-- user_metadata is only used to pre-fill the profile, never for authorisation.

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
begin
  insert into public.advocates (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(nullif(btrim(meta ->> 'full_name'), ''), nullif(btrim(meta ->> 'name'), ''), ''),
    nullif(coalesce(meta ->> 'avatar_url', meta ->> 'picture'), '')
  )
  on conflict (id) do nothing;

  -- Starter courts (mirrors SEED_COURTS in the app). Users can hide, rename and add more.
  insert into public.courts (advocate_id, name, city, sort_order)
  select new.id, c.name, c.city, c.ord
  from (values
    (1, 'City Civil Court, Ahmedabad', 'Ahmedabad'),
    (2, 'Metropolitan Magistrate Court', 'Ahmedabad'),
    (3, 'Family Court, Ahmedabad', 'Ahmedabad'),
    (4, 'Gujarat High Court', 'Ahmedabad'),
    (5, 'Sessions Court, Gandhinagar', 'Gandhinagar'),
    (6, 'Consumer Commission, Surat', 'Surat')
  ) as c (ord, name, city)
  on conflict do nothing;

  -- DEFAULT_CASE_TYPES from @vakil/shared.
  insert into public.case_types (advocate_id, name, sort_order)
  select new.id, t.name, t.ord
  from unnest(array[
    'Civil Suit', 'Criminal Case', 'NI Act 138', 'Family', 'MACT',
    'Writ', 'Appeal', 'Bail', 'Consumer', 'Other'
  ]) with ordinality as t (name, ord)
  on conflict do nothing;

  insert into public.notifications (advocate_id, type, title, body)
  values (new.id, 'info', 'Welcome to Vakil', 'Add your cases once and never miss a date again.');

  return new;
end;
$$;

revoke execute on function private.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();
