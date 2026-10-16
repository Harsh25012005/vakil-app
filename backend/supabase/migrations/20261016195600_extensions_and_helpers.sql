-- extensions_and_helpers
-- Shared building blocks used by every later migration.
--
-- Architecture: there is no app server. The mobile app talks to Supabase directly
-- (Auth, Data API / PostgREST, RPC, Storage) with the publishable key only.
-- Security therefore lives in the database: RLS on every table, explicit grants,
-- and composite foreign keys so a row can only reference rows of the same advocate.

-- Private schema: never exposed through the Data API, and API roles get no USAGE on it,
-- so nothing in here can be called by the app. Holds trigger functions and the
-- SECURITY DEFINER sign-up hook.
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

-- Keeps updated_at current on every UPDATE.
create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

revoke execute on function private.set_updated_at() from public, anon, authenticated;

-- Today's calendar date in IST. Hearing dates are IST calendar dates (FRS 8).
create or replace function public.today_ist()
returns date
language sql
stable
set search_path = ''
as $$
  select (now() at time zone 'Asia/Kolkata')::date;
$$;

revoke execute on function public.today_ist() from public, anon;
grant execute on function public.today_ist() to authenticated, service_role;
