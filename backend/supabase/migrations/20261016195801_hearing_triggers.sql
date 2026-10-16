-- hearing_triggers
-- Keeps cases.next_hearing_at / last_hearing_at in sync with the hearings table (FRS 7):
--   next_hearing_at = earliest hearing with no outcome yet (may be in the past: overdue)
--   last_hearing_at = latest hearing with an outcome
-- Runs as the calling user, so RLS still applies to the case update.

create or replace function private.sync_case_hearing_dates()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  case_ids uuid[] := '{}';
begin
  if tg_op <> 'INSERT' then
    case_ids := array_append(case_ids, old.case_id);
  end if;
  if tg_op <> 'DELETE' then
    case_ids := array_append(case_ids, new.case_id);
  end if;

  update public.cases c
  set
    next_hearing_at = (
      select min(h.hearing_date) from public.hearings h
      where h.case_id = c.id and h.completed_at is null
    ),
    last_hearing_at = (
      select max(h.hearing_date) from public.hearings h
      where h.case_id = c.id and h.completed_at is not null
    )
  where c.id = any (case_ids);

  return null;
end;
$$;

revoke execute on function private.sync_case_hearing_dates() from public, anon, authenticated;

create trigger hearings_sync_case_dates_ins_del
  after insert or delete on public.hearings
  for each row execute function private.sync_case_hearing_dates();

-- Only when something that affects the dates changes (not on notes / purpose edits).
create trigger hearings_sync_case_dates_upd
  after update on public.hearings
  for each row
  when (
    old.hearing_date is distinct from new.hearing_date
    or old.completed_at is distinct from new.completed_at
    or old.case_id is distinct from new.case_id
  )
  execute function private.sync_case_hearing_dates();
