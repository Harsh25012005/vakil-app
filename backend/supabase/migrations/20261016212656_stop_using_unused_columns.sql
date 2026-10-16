-- stop_using_unused_columns
-- Step 1 of removing unused columns: create_case and record_outcome stop writing
-- cases.our_side/priority/description and hearings.next_hearing_id, and our_side becomes optional,
-- so the app no longer depends on them. The drop_unused_columns migration then removes them.

create or replace function public.create_case(
  p_case jsonb,
  p_client_ids uuid[] default '{}',
  p_next_hearing_date date default null,
  p_next_hearing_purpose text default null
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v public.cases;
  v_id uuid;
begin
  v := jsonb_populate_record(null::public.cases, p_case);

  insert into public.cases (
    title, case_number, case_year, cnr_number, case_type_id, court_id, court_room, judge_name,
    filing_date, petitioner_name, respondent_name, opposite_counsel, stage
  )
  values (
    v.title, v.case_number, v.case_year, v.cnr_number, v.case_type_id, v.court_id, v.court_room, v.judge_name,
    v.filing_date, v.petitioner_name, v.respondent_name, v.opposite_counsel, v.stage
  )
  returning id into v_id;

  insert into public.case_clients (case_id, client_id)
  select v_id, cid from unnest(coalesce(p_client_ids, '{}')) as cid
  on conflict do nothing;

  -- FR-CASE-04: a next date creates the first hearing (past dates allowed).
  if p_next_hearing_date is not null then
    insert into public.hearings (case_id, hearing_date, purpose, court_room)
    values (v_id, p_next_hearing_date, coalesce(nullif(btrim(p_next_hearing_purpose), ''), v.stage), v.court_room);
  end if;

  return v_id;
end;
$$;

create or replace function public.record_outcome(
  p_hearing_id uuid,
  p_outcome text,
  p_notes text default null,
  p_next_date date default null,
  p_next_time time default null,
  p_next_purpose text default null
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  h public.hearings;
  n public.hearings;
  c public.cases;
begin
  update public.hearings
  set outcome = p_outcome,
      outcome_notes = nullif(btrim(p_notes), ''),
      completed_at = now()
  where id = p_hearing_id
  returning * into h;

  if not found then
    raise exception 'Hearing not found' using errcode = 'P0002';
  end if;

  select * into c from public.cases where id = h.case_id;

  if p_next_date is not null then
    insert into public.hearings (case_id, hearing_date, hearing_time, purpose, court_room)
    values (h.case_id, p_next_date, p_next_time, nullif(btrim(p_next_purpose), ''), coalesce(h.court_room, c.court_room))
    returning * into n;
  end if;

  if p_outcome = 'reserved' then
    update public.cases set status = 'reserved' where id = c.id;
  elsif c.status = 'reserved' and n.id is not null then
    update public.cases set status = 'active' where id = c.id;
  end if;

  return jsonb_build_object(
    'hearing', to_jsonb(h),
    'next', case when n.id is null then null else to_jsonb(n) end,
    'caseId', h.case_id
  );
end;
$$;

alter table public.cases alter column our_side drop not null;
