-- case_clients
-- Many-to-many link between cases and clients.

create table public.case_clients (
  case_id uuid not null,
  client_id uuid not null,
  advocate_id uuid not null default auth.uid() references public.advocates (id) on delete cascade,
  role text not null default 'primary',
  created_at timestamptz not null default now(),
  primary key (case_id, client_id),
  constraint case_clients_case_fkey foreign key (advocate_id, case_id) references public.cases (advocate_id, id) on delete cascade,
  constraint case_clients_client_fkey foreign key (advocate_id, client_id) references public.clients (advocate_id, id) on delete cascade
);

alter table public.case_clients enable row level security;
