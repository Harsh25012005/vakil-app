-- api_functions
-- RPC endpoints (POST /rest/v1/rpc/<name>) for the operations that must be atomic or
-- that aggregate. Plain reads and writes go straight to the tables through the Data API.
-- All of them are SECURITY INVOKER: they run as the signed-in user, so RLS still applies.

-- ---------------------------------------------------------------------------
-- create_case: case + client links + optional first hearing, in one transaction
-- (FR-CASE-01..06). p_case uses table column names. Returns the new case id.
-- ---------------------------------------------------------------------------
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
    filing_date, our_side, petitioner_name, respondent_name, opposite_counsel, stage, priority, description
  )
  values (
    v.title, v.case_number, v.case_year, v.cnr_number, v.case_type_id, v.court_id, v.court_room, v.judge_name,
    v.filing_date, v.our_side, v.petitioner_name, v.respondent_name, v.opposite_counsel, v.stage,
    coalesce(v.priority, 'normal'), v.description
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

-- ---------------------------------------------------------------------------
-- record_outcome: closes a hearing and schedules the next one atomically
-- (FR-HEAR-02..05). "reserved" moves the case to Reserved for order; a reserved case
-- that gets a new date goes back to Active.
-- ---------------------------------------------------------------------------
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

    update public.hearings set next_hearing_id = n.id where id = h.id returning * into h;
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

-- ---------------------------------------------------------------------------
-- dashboard_stats: counts for the Home screen (FR-DASH-01..05). Today = IST.
-- ---------------------------------------------------------------------------
create or replace function public.dashboard_stats()
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  with
  t as (select public.today_ist() as d),
  live as (select * from public.cases where archived_at is null),
  live_hearings as (
    select h.* from public.hearings h join live c on c.id = h.case_id
  ),
  week as (
    select h.hearing_date, count(*) as n
    from live_hearings h, t
    where h.hearing_date between t.d and t.d + 6
    group by h.hearing_date
  )
  select jsonb_build_object(
    'weekCounts', coalesce((select jsonb_object_agg(to_char(hearing_date, 'YYYY-MM-DD'), n) from week), '{}'::jsonb),
    'stats', jsonb_build_object(
      'active', (select count(*) from live where status = 'active'),
      'today', (select count(*) from live_hearings h, t where h.hearing_date = t.d),
      'thisWeek', (select coalesce(sum(n), 0) from week),
      'overdue', (
        select count(*) from live c, t
        where c.status = 'active' and (c.next_hearing_at is null or c.next_hearing_at < t.d)
      )
    ),
    'needsUpdate', (select count(*) from live_hearings h, t where h.completed_at is null and h.hearing_date < t.d),
    'unreadNotifications', (select count(*) from public.notifications where read_at is null)
  );
$$;

-- ---------------------------------------------------------------------------
-- search_all: global search across cases, clients and notes (FR-SRCH-01).
-- ---------------------------------------------------------------------------
create or replace function public.search_all(p_q text)
returns jsonb
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  pattern text;
begin
  if p_q is null or btrim(p_q) = '' then
    return jsonb_build_object('cases', '[]'::jsonb, 'clients', '[]'::jsonb, 'notes', '[]'::jsonb);
  end if;
  -- Treat the query as plain text: escape LIKE wildcards.
  pattern := '%' || replace(replace(replace(btrim(p_q), '\', '\\'), '%', '\%'), '_', '\_') || '%';

  return jsonb_build_object(
    'cases', coalesce((
      select jsonb_agg(x) from (
        select c.id, c.title, c.case_number as "caseNumber", ct.name as court
        from public.cases c
        left join public.courts ct on ct.id = c.court_id
        where c.archived_at is null
          and concat_ws(' ', c.title, c.case_number, c.cnr_number, c.petitioner_name, c.respondent_name) ilike pattern
        order by c.updated_at desc
        limit 8
      ) x
    ), '[]'::jsonb),
    'clients', coalesce((
      select jsonb_agg(x) from (
        select cl.id, cl.full_name as "fullName", cl.phone
        from public.clients cl
        where concat_ws(' ', cl.full_name, cl.phone, cl.email) ilike pattern
        order by cl.full_name
        limit 8
      ) x
    ), '[]'::jsonb),
    'notes', coalesce((
      select jsonb_agg(x) from (
        select n.id, n.case_id as "caseId", n.title, n.body, c.title as "caseTitle"
        from public.notes n
        join public.cases c on c.id = n.case_id
        where concat_ws(' ', n.title, n.body) ilike pattern
        order by n.updated_at desc
        limit 8
      ) x
    ), '[]'::jsonb)
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- move_list_item: move a court or case type one place up (-1) or down (+1)
-- in the advocate's list. Renumbers sort_order 1..n so ties never get stuck.
-- ---------------------------------------------------------------------------
create or replace function public.move_list_item(p_list text, p_id uuid, p_dir integer)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if p_list not in ('courts', 'case_types') then
    raise exception 'Unknown list %', p_list using errcode = '22023';
  end if;
  if p_dir not in (-1, 1) then
    raise exception 'Direction must be -1 or 1' using errcode = '22023';
  end if;

  execute format($sql$
    with ordered as (
      select id, row_number() over (order by sort_order, created_at, id)::integer as rn
      from public.%1$I
    ),
    me as (select rn from ordered where id = $1),
    swapped as (
      select o.id, case when o.rn = me.rn then me.rn + $2 else me.rn end as new_rn
      from ordered o, me
      where o.rn in (me.rn, me.rn + $2)
    )
    update public.%1$I t
    set sort_order = coalesce(s.new_rn, o.rn)
    from ordered o
    left join swapped s on s.id = o.id
    where t.id = o.id
      and (select count(*) from swapped) = 2
  $sql$, p_list)
  using p_id, p_dir;
end;
$$;

-- ---------------------------------------------------------------------------
-- Grants: signed-in users only.
-- ---------------------------------------------------------------------------
revoke execute on function public.create_case(jsonb, uuid[], date, text) from public, anon;
revoke execute on function public.record_outcome(uuid, text, text, date, time, text) from public, anon;
revoke execute on function public.dashboard_stats() from public, anon;
revoke execute on function public.search_all(text) from public, anon;
revoke execute on function public.move_list_item(text, uuid, integer) from public, anon;

grant execute on function public.create_case(jsonb, uuid[], date, text) to authenticated, service_role;
grant execute on function public.record_outcome(uuid, text, text, date, time, text) to authenticated, service_role;
grant execute on function public.dashboard_stats() to authenticated, service_role;
grant execute on function public.search_all(text) to authenticated, service_role;
grant execute on function public.move_list_item(text, uuid, integer) to authenticated, service_role;
