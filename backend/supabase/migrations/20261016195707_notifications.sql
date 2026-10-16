-- notifications
-- In-app notification centre (FR-NOTIF-05). 60-day retention.
-- Rows are written by the database (sign-up welcome) or future scheduled jobs; the app
-- only reads them, marks them read and deletes them.

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  advocate_id uuid not null default auth.uid() references public.advocates (id) on delete cascade,
  type text not null check (type in ('reminder', 'needs_update', 'info')),
  title text not null,
  body text not null default '',
  deep_link text,
  read_at timestamptz,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.notifications enable row level security;

create trigger notifications_set_updated_at
  before update on public.notifications
  for each row execute function private.set_updated_at();
