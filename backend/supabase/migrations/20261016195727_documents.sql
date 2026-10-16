-- documents
-- Metadata for files in the private "case-docs" bucket (storage_buckets migration).
-- Storage path: {advocate_id}/{case_id}/{uuid}.{ext}
-- Soft delete (deleted_at) so the app's Undo can bring a document back with its file.

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  advocate_id uuid not null default auth.uid() references public.advocates (id) on delete cascade,
  case_id uuid not null,
  file_name text not null check (btrim(file_name) <> ''),
  category text not null default 'other' check (category in ('petition', 'order', 'evidence', 'vakalatnama', 'other')),
  mime_type text not null,
  size_bytes bigint not null check (size_bytes between 0 and 20971520), -- MAX_FILE_BYTES (20 MB)
  storage_path text not null unique,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint documents_case_fkey foreign key (advocate_id, case_id) references public.cases (advocate_id, id) on delete cascade,
  -- The file must live in the owner's folder of the bucket.
  constraint documents_storage_path_check check (split_part(storage_path, '/', 1) = advocate_id::text)
);

alter table public.documents enable row level security;

create trigger documents_set_updated_at
  before update on public.documents
  for each row execute function private.set_updated_at();
