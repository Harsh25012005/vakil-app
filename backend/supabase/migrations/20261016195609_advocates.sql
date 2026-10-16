-- advocates
-- One row per signed-up user (id = auth.users.id). Created by the sign-up hook in
-- the auth_signup migration; the app only reads and updates it.

create table public.advocates (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default '',
  phone text,
  email text,
  enrolment_no text,
  practice_areas text[] not null default '{}',
  avatar_url text,
  theme text not null default 'dark' check (theme in ('dark', 'light', 'system')),
  -- Keys match the app's NotificationPrefs type so the JSON round-trips unchanged.
  notification_prefs jsonb not null default jsonb_build_object(
    'eveningEnabled', true,
    'eveningTime', '20:00',
    'morningEnabled', true,
    'morningTime', '08:00',
    'needsUpdateEnabled', true
  ),
  onboarded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.advocates is 'Profile of the signed-in advocate. Every other table hangs off this one.';

alter table public.advocates enable row level security;

create trigger advocates_set_updated_at
  before update on public.advocates
  for each row execute function private.set_updated_at();
