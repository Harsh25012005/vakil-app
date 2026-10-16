-- case_clients_case_index
-- Covering index for the composite foreign key case_clients (advocate_id, case_id) -> cases,
-- flagged by the performance advisor. Speeds up the cascade when a case is deleted.
create index case_clients_advocate_case_idx on public.case_clients (advocate_id, case_id);
