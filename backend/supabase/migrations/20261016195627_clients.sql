-- clients
-- People the advocate represents. A phone number is unique per advocate (FR-CLI-01).

create table public.clients (
  id uuid primary key default gen_random_uuid(),
  advocate_id uuid not null default auth.uid() references public.advocates (id) on delete cascade,
  full_name text not null check (char_length(btrim(full_name)) between 1 and 80),
  phone text not null check (btrim(phone) <> ''),
  alt_phone text,
  email text,
  address text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint clients_advocate_id_id_key unique (advocate_id, id),
  constraint clients_advocate_phone_key unique (advocate_id, phone)
);

alter table public.clients enable row level security;

create trigger clients_set_updated_at
  before update on public.clients
  for each row execute function private.set_updated_at();
