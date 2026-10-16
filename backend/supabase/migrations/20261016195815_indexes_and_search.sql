-- indexes_and_search
-- Every query is scoped to one advocate, so indexes lead with advocate_id. That also
-- covers the advocate_id foreign key used when an account is deleted.

-- Lists and pickers
create index courts_advocate_sort_idx on public.courts (advocate_id, sort_order);
create index case_types_advocate_sort_idx on public.case_types (advocate_id, sort_order);
create index clients_advocate_name_idx on public.clients (advocate_id, full_name);

-- Cases: next-date list, status filters, and the composite foreign keys.
create index cases_advocate_next_hearing_idx on public.cases (advocate_id, next_hearing_at);
create index cases_advocate_status_idx on public.cases (advocate_id, status);
create index cases_advocate_court_idx on public.cases (advocate_id, court_id);
create index cases_advocate_case_type_idx on public.cases (advocate_id, case_type_id);

-- Case <-> client links, looked up from the client side (the PK covers the case side).
create index case_clients_advocate_client_idx on public.case_clients (advocate_id, client_id);

-- Hearings: calendar range queries and per-case timeline.
create index hearings_advocate_date_idx on public.hearings (advocate_id, hearing_date);
create index hearings_advocate_case_idx on public.hearings (advocate_id, case_id);
create index hearings_next_hearing_idx on public.hearings (advocate_id, next_hearing_id) where next_hearing_id is not null;

-- P1 modules
create index notes_advocate_case_idx on public.notes (advocate_id, case_id);
create index documents_advocate_case_idx on public.documents (advocate_id, case_id);
create index payments_advocate_case_idx on public.payments (advocate_id, case_id);
create index tasks_advocate_case_idx on public.tasks (advocate_id, case_id);
create index notifications_advocate_created_idx on public.notifications (advocate_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Computed fields (PostgREST): callable as columns, e.g.
--   GET /rest/v1/cases?select=*&search_text=ilike.*shah*
--   GET /rest/v1/hearings?select=*,last_outcome
-- They run as the caller, so RLS applies inside them too.
-- ---------------------------------------------------------------------------

-- Haystack for case search (FR-CASE-08): title, numbers, parties, court and client names.
create or replace function public.search_text(public.cases)
returns text
language sql
stable
set search_path = ''
as $$
  select concat_ws(' ',
    $1.title, $1.case_number, $1.cnr_number, $1.petitioner_name, $1.respondent_name,
    (select c.name from public.courts c where c.id = $1.court_id),
    (select string_agg(cl.full_name, ' ')
       from public.case_clients cc
       join public.clients cl on cl.id = cc.client_id
      where cc.case_id = $1.id)
  );
$$;

-- Outcome of the previous completed hearing of the same case ("Last: Adjourned").
create or replace function public.last_outcome(public.hearings)
returns text
language sql
stable
set search_path = ''
as $$
  select h.outcome
  from public.hearings h
  where h.case_id = $1.case_id
    and h.completed_at is not null
    and h.id <> $1.id
    and h.hearing_date <= $1.hearing_date
  order by h.hearing_date desc, h.completed_at desc
  limit 1;
$$;

revoke execute on function public.search_text(public.cases) from public, anon;
revoke execute on function public.last_outcome(public.hearings) from public, anon;
grant execute on function public.search_text(public.cases) to authenticated, service_role;
grant execute on function public.last_outcome(public.hearings) to authenticated, service_role;
