-- fees_and_payments
-- Agreed fee (one row per case) and payments received against it (FR-FEE). INR.

create table public.fees (
  id uuid primary key default gen_random_uuid(),
  advocate_id uuid not null default auth.uid() references public.advocates (id) on delete cascade,
  case_id uuid not null,
  agreed_amount numeric(12, 2) not null default 0 check (agreed_amount >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint fees_advocate_case_key unique (advocate_id, case_id),
  constraint fees_case_fkey foreign key (advocate_id, case_id) references public.cases (advocate_id, id) on delete cascade
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  advocate_id uuid not null default auth.uid() references public.advocates (id) on delete cascade,
  case_id uuid not null,
  amount numeric(12, 2) not null check (amount > 0),
  paid_on date not null,
  mode text not null check (mode in ('cash', 'upi', 'bank', 'cheque')),
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint payments_case_fkey foreign key (advocate_id, case_id) references public.cases (advocate_id, id) on delete cascade
);

alter table public.fees enable row level security;
alter table public.payments enable row level security;

create trigger fees_set_updated_at
  before update on public.fees
  for each row execute function private.set_updated_at();

create trigger payments_set_updated_at
  before update on public.payments
  for each row execute function private.set_updated_at();
