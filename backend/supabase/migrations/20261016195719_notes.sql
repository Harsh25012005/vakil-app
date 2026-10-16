-- notes
-- Free-text notes on a case. Up to MAX_PINNED_NOTES (3) pinned per case (FR-NOTE).

create table public.notes (
  id uuid primary key default gen_random_uuid(),
  advocate_id uuid not null default auth.uid() references public.advocates (id) on delete cascade,
  case_id uuid not null,
  title text,
  body text not null check (btrim(body) <> ''),
  is_pinned boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint notes_case_fkey foreign key (advocate_id, case_id) references public.cases (advocate_id, id) on delete cascade
);

alter table public.notes enable row level security;

create trigger notes_set_updated_at
  before update on public.notes
  for each row execute function private.set_updated_at();
