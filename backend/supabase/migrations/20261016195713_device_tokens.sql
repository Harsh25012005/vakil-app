-- device_tokens
-- Expo push tokens, for server-sent reminders (FR-NOTIF-01).

create table public.device_tokens (
  id uuid primary key default gen_random_uuid(),
  advocate_id uuid not null default auth.uid() references public.advocates (id) on delete cascade,
  expo_push_token text not null,
  platform text not null check (platform in ('ios', 'android', 'web')),
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint device_tokens_advocate_token_key unique (advocate_id, expo_push_token)
);

alter table public.device_tokens enable row level security;

create trigger device_tokens_set_updated_at
  before update on public.device_tokens
  for each row execute function private.set_updated_at();
