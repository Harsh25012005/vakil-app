-- case_types
-- Each advocate's case types (seeded from DEFAULT_CASE_TYPES at sign-up, editable).

create table public.case_types (
  id uuid primary key default gen_random_uuid(),
  advocate_id uuid not null default auth.uid() references public.advocates (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 2 and 80),
  sort_order integer not null default 0,
  is_hidden boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint case_types_advocate_id_id_key unique (advocate_id, id)
);

create unique index case_types_advocate_name_key on public.case_types (advocate_id, lower(name));

alter table public.case_types enable row level security;

create trigger case_types_set_updated_at
  before update on public.case_types
  for each row execute function private.set_updated_at();
