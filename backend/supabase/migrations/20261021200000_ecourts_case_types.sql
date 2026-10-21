-- ecourts_case_types
-- Every eCourts case type (code + name), shared and read-only to the app, so the case type pickers
-- load at once from the database instead of calling eCourtsIndia (which rate-limits). Filled by the
-- ecourts Edge Function (action "caseTypes", service key) and refreshed monthly.

create table public.ecourts_case_types (
  code text primary key,
  name text not null,
  updated_at timestamptz not null default now()
);

comment on table public.ecourts_case_types is 'Every eCourts case type (code, name) for the case type pickers. Filled by the ecourts Edge Function.';

alter table public.ecourts_case_types enable row level security;

create policy "Signed-in users can read eCourts case types" on public.ecourts_case_types
  for select to authenticated using (true);

revoke insert, update, delete, truncate on public.ecourts_case_types from anon, authenticated;
revoke select on public.ecourts_case_types from anon;
