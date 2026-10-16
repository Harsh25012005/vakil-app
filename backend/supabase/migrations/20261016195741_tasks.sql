-- tasks
-- To-dos, optionally tied to a case (FR-TASK).

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  advocate_id uuid not null default auth.uid() references public.advocates (id) on delete cascade,
  case_id uuid,
  title text not null check (btrim(title) <> ''),
  due_date date,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- case_id is nullable; MATCH SIMPLE skips the check for general (case-less) tasks.
  constraint tasks_case_fkey foreign key (advocate_id, case_id) references public.cases (advocate_id, id) on delete cascade
);

alter table public.tasks enable row level security;

create trigger tasks_set_updated_at
  before update on public.tasks
  for each row execute function private.set_updated_at();
