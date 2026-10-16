-- hearings
-- One row per hearing date. A hearing is "completed" once an outcome is recorded;
-- record_outcome() (api_functions migration) closes it and creates the next one atomically.

create table public.hearings (
  id uuid primary key default gen_random_uuid(),
  advocate_id uuid not null default auth.uid() references public.advocates (id) on delete cascade,
  case_id uuid not null,
  hearing_date date not null,
  hearing_time time,
  purpose text,
  court_room text,
  outcome text check (outcome in ('adjourned', 'heard', 'arguments_done', 'evidence', 'reserved', 'disposed', 'not_reached', 'other')),
  outcome_notes text,
  next_hearing_id uuid,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint hearings_advocate_id_id_key unique (advocate_id, id),
  constraint hearings_case_fkey foreign key (advocate_id, case_id) references public.cases (advocate_id, id) on delete cascade,
  constraint hearings_next_hearing_fkey foreign key (advocate_id, next_hearing_id)
    references public.hearings (advocate_id, id) on delete set null (next_hearing_id),
  constraint hearings_completed_needs_outcome check (completed_at is null or outcome is not null)
);

alter table public.hearings enable row level security;

create trigger hearings_set_updated_at
  before update on public.hearings
  for each row execute function private.set_updated_at();
