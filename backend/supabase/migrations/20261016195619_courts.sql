-- courts
-- Each advocate's own court list (seeded at sign-up, editable in Settings).
-- Courts are hidden, never deleted, so existing cases keep them (FR-SET-03).

create table public.courts (
  id uuid primary key default gen_random_uuid(),
  advocate_id uuid not null default auth.uid() references public.advocates (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 2 and 120),
  short_name text,
  city text not null default '',
  district text,
  state text,
  sort_order integer not null default 0,
  is_hidden boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Target for composite foreign keys: a case can only point at a court of the same advocate.
  constraint courts_advocate_id_id_key unique (advocate_id, id)
);

-- One court per name per advocate, case-insensitive.
create unique index courts_advocate_name_key on public.courts (advocate_id, lower(name));

alter table public.courts enable row level security;

create trigger courts_set_updated_at
  before update on public.courts
  for each row execute function private.set_updated_at();
