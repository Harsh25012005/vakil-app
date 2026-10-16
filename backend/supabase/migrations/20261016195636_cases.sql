-- cases
-- The core record. next_hearing_at / last_hearing_at are denormalised and kept in sync
-- by the hearing_triggers migration so list screens never have to aggregate hearings.

create table public.cases (
  id uuid primary key default gen_random_uuid(),
  advocate_id uuid not null default auth.uid() references public.advocates (id) on delete cascade,
  title text not null check (btrim(title) <> ''),
  case_number text,
  case_year integer check (case_year between 1900 and 2200),
  cnr_number text,
  case_type_id uuid not null,
  court_id uuid not null,
  court_room text,
  judge_name text,
  filing_date date,
  our_side text not null check (our_side in ('petitioner', 'respondent', 'complainant', 'accused', 'appellant', 'other')),
  petitioner_name text,
  respondent_name text,
  opposite_counsel text,
  stage text,
  status text not null default 'active' check (status in ('active', 'reserved', 'disposed', 'closed')),
  disposal_date date,
  disposal_result text check (disposal_result in ('allowed', 'dismissed', 'settled', 'withdrawn', 'other')),
  priority text not null default 'normal' check (priority in ('normal', 'high', 'urgent')),
  description text,
  next_hearing_at date,
  last_hearing_at date,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint cases_advocate_id_id_key unique (advocate_id, id),
  -- Composite keys: the court and case type must belong to the same advocate.
  -- NO ACTION (not RESTRICT) so deleting an advocate can cascade through cases and courts together.
  constraint cases_court_fkey foreign key (advocate_id, court_id) references public.courts (advocate_id, id),
  constraint cases_case_type_fkey foreign key (advocate_id, case_type_id) references public.case_types (advocate_id, id),
  -- FR-CASE-13: a disposed case needs a disposal date and result.
  constraint cases_disposal_check check (status <> 'disposed' or (disposal_date is not null and disposal_result is not null))
);

alter table public.cases enable row level security;

create trigger cases_set_updated_at
  before update on public.cases
  for each row execute function private.set_updated_at();
