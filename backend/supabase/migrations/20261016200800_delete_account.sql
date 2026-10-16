-- delete_account
-- FR-SET-05: "Delete account" in Settings > Help. Deletes the caller's auth user; every
-- table cascades from advocates -> auth.users, so all their data goes with it.
-- The app calls this RPC, then removes the user's Storage files (their JWT is still valid
-- until it expires), then signs out.
--
-- Deleting from auth.users needs elevated rights, so the work is done by a
-- SECURITY DEFINER helper in the private (non-exposed) schema. It takes no arguments and
-- only ever deletes auth.uid(), so a user can delete nobody but themselves.
-- The app calls the SECURITY INVOKER wrapper public.delete_account().

create or replace function private.delete_current_user()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'Not signed in' using errcode = '42501';
  end if;
  delete from auth.users where id = uid;
end;
$$;

create or replace function public.delete_account()
returns void
language sql
security invoker
set search_path = ''
as $$
  select private.delete_current_user();
$$;

revoke execute on function public.delete_account() from public, anon;
revoke execute on function private.delete_current_user() from public, anon, authenticated;

grant execute on function public.delete_account() to authenticated;

-- delete_account() calls into the private schema, so signed-in users need USAGE on it and
-- EXECUTE on that one function. The private schema is not exposed by the Data API.
grant usage on schema private to authenticated;
grant execute on function private.delete_current_user() to authenticated;
