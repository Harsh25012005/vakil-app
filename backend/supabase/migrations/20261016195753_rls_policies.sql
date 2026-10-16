-- rls_policies
-- Grants decide whether a role can touch a table at all; RLS decides which rows.
-- anon (signed-out) gets nothing. authenticated gets its own rows only.
-- service_role keeps full access for dashboards and future jobs.

-- ---------------------------------------------------------------------------
-- advocates: read and update your own profile. Rows are created by the sign-up
-- hook and deleted by delete_account(), never directly by the app.
-- ---------------------------------------------------------------------------
revoke all on table public.advocates from anon, authenticated;
grant select on table public.advocates to authenticated;
grant update (full_name, phone, enrolment_no, practice_areas, avatar_url, theme, notification_prefs, onboarded_at)
  on table public.advocates to authenticated;
grant all on table public.advocates to service_role;

create policy "Advocates can read their own profile"
  on public.advocates for select
  to authenticated
  using ((select auth.uid()) = id);

create policy "Advocates can update their own profile"
  on public.advocates for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- ---------------------------------------------------------------------------
-- notifications: read, mark read, delete. Created server-side only.
-- ---------------------------------------------------------------------------
revoke all on table public.notifications from anon, authenticated;
grant select, delete on table public.notifications to authenticated;
grant update (read_at) on table public.notifications to authenticated;
grant all on table public.notifications to service_role;

create policy "Advocates can read their notifications"
  on public.notifications for select
  to authenticated
  using ((select auth.uid()) = advocate_id);

create policy "Advocates can mark their notifications read"
  on public.notifications for update
  to authenticated
  using ((select auth.uid()) = advocate_id)
  with check ((select auth.uid()) = advocate_id);

create policy "Advocates can delete their notifications"
  on public.notifications for delete
  to authenticated
  using ((select auth.uid()) = advocate_id);

-- ---------------------------------------------------------------------------
-- Everything else is plain owner-only CRUD on advocate_id.
-- ---------------------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array[
    'courts', 'case_types', 'clients', 'cases', 'case_clients', 'hearings',
    'device_tokens', 'notes', 'documents', 'fees', 'payments', 'tasks'
  ]
  loop
    execute format('revoke all on table public.%I from anon, authenticated', t);
    execute format('grant select, insert, update, delete on table public.%I to authenticated', t);
    execute format('grant all on table public.%I to service_role', t);

    execute format(
      'create policy "Advocates can read their own rows" on public.%I for select to authenticated
         using ((select auth.uid()) = advocate_id)', t);
    execute format(
      'create policy "Advocates can insert their own rows" on public.%I for insert to authenticated
         with check ((select auth.uid()) = advocate_id)', t);
    execute format(
      'create policy "Advocates can update their own rows" on public.%I for update to authenticated
         using ((select auth.uid()) = advocate_id)
         with check ((select auth.uid()) = advocate_id)', t);
    execute format(
      'create policy "Advocates can delete their own rows" on public.%I for delete to authenticated
         using ((select auth.uid()) = advocate_id)', t);
  end loop;
end;
$$;
