-- drop_unused_columns
-- Step 2: removes columns the app never reads or writes (run in the SQL editor; destructive DDL
-- is not applied automatically). Columns an eCourts CNR lookup will fill (case_number, case_year,
-- judge_name, court_room, petitioner/respondent, opposite_counsel, stage) and the device_tokens table
-- (future push reminders) are kept on purpose.

-- advocates.phone is also listed in the column-level UPDATE grant; dropping the column removes it.
alter table public.advocates drop column phone;
alter table public.courts drop column short_name, drop column district, drop column state;
alter table public.case_clients drop column role;
alter table public.notifications drop column sent_at;
drop index if exists public.hearings_next_hearing_idx;
alter table public.hearings drop constraint hearings_next_hearing_fkey, drop column next_hearing_id;
alter table public.cases drop column our_side, drop column priority, drop column description;
