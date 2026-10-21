-- court_directory
-- One shared, read-only list of every court in India, for the Add case court search:
-- the Supreme Court, every High Court (and its main benches), and every district court complex.
-- SC and High Courts are seeded here; district court complexes are filled from the eCourts court
-- structure by the `ecourts` Edge Function (action "syncCourts", service key), state by state.
-- An advocate's own `courts` row links to its directory entry through courts.directory_id.

-- 'City Civil and Sessions Court, Ahmedabad' -> 'ccsca' (connector words skipped).
create or replace function private.initials(p text)
returns text
language sql
immutable
set search_path = ''
as $$
  select coalesce(string_agg(left(w, 1), '' order by n), '')
  from regexp_split_to_table(lower(regexp_replace(coalesce(p, ''), '[^A-Za-z ]', ' ', 'g')), '\s+')
       with ordinality as t(w, n)
  where w <> '' and w not in ('and', 'of', 'the', 'at', 'for', 'in');
$$;

create table public.court_directory (
  id text primary key,                 -- 'SC', 'HC:GJ', 'HC:MH:NAGPUR', 'DC:GJ:1:2'
  level text not null check (level in ('SC', 'HC', 'DC')),
  name text not null,
  short_name text,                     -- 'GHC', 'BHC'
  aliases text,                        -- more short forms, space separated
  bench text,                          -- High Court bench ('Nagpur'), null for the principal seat
  state_codes text[] not null default '{}', -- eCourts state codes the court serves (search scope)
  state_name text,                     -- covered state / UT names, comma separated
  district_code text,                  -- eCourts court-structure codes (district courts)
  district_name text,
  complex_code text,
  initials text generated always as (private.initials(name)) stored,
  search text generated always as (
    lower(name || ' ' || coalesce(short_name, '') || ' ' || coalesce(aliases, '') || ' ' ||
          coalesce(bench, '') || ' ' || coalesce(district_name, '') || ' ' || coalesce(state_name, ''))
  ) stored,
  updated_at timestamptz not null default now()
);

comment on table public.court_directory is
  'Every court in India (SC, High Courts, district court complexes) for the Add case court search. Read-only to the app; district courts are synced from eCourts by the ecourts Edge Function.';

create index court_directory_level_idx on public.court_directory (level, state_codes);

alter table public.court_directory enable row level security;

create policy "Signed-in users can read the court directory" on public.court_directory
  for select to authenticated using (true);

revoke insert, update, delete, truncate on public.court_directory from anon, authenticated;
revoke select on public.court_directory from anon;

-- An advocate's court picked from the directory.
alter table public.courts
  add column directory_id text references public.court_directory (id) on delete set null;
comment on column public.courts.directory_id is 'The court_directory entry this court was picked from (Add case court search).';
create unique index courts_advocate_directory_key on public.courts (advocate_id, directory_id) where directory_id is not null;

-- Case facts from eCourts shown on the overview and in the Today's hearings download.
alter table public.cases
  add column filing_number text,
  add column ecourts_status text,
  add column ecourts_synced_at timestamptz;
comment on column public.cases.filing_number is 'Filing number on eCourts (before registration), e.g. 1234/2025.';
comment on column public.cases.ecourts_status is 'Case status as eCourts shows it ("Pending", "Disposed").';
comment on column public.cases.ecourts_synced_at is 'When the case was last read from eCourts.';

-- Serial / item number on the day's cause list.
alter table public.hearings add column item_number text check (item_number is null or char_length(item_number) <= 20);
comment on column public.hearings.item_number is 'Item (serial) number of the case on that day''s cause list.';

-- create_case also stores the new eCourts fields.
create or replace function public.create_case(
  p_case jsonb,
  p_client_ids uuid[] default '{}',
  p_next_hearing_date date default null,
  p_next_hearing_purpose text default null
)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  v public.cases;
  v_id uuid;
begin
  v := jsonb_populate_record(null::public.cases, p_case);

  insert into public.cases (
    title, case_number, case_year, cnr_number, case_type_id, court_id, court_room, judge_name,
    filing_date, petitioner_name, respondent_name, opposite_counsel, stage,
    filing_number, ecourts_status, ecourts_synced_at
  )
  values (
    v.title, v.case_number, v.case_year, v.cnr_number, v.case_type_id, v.court_id, v.court_room, v.judge_name,
    v.filing_date, v.petitioner_name, v.respondent_name, v.opposite_counsel, v.stage,
    v.filing_number, v.ecourts_status, v.ecourts_synced_at
  )
  returning id into v_id;

  insert into public.case_clients (case_id, client_id)
  select v_id, cid from unnest(coalesce(p_client_ids, '{}')) as cid
  on conflict do nothing;

  -- FR-CASE-04: a next date creates the first hearing (past dates allowed).
  if p_next_hearing_date is not null then
    insert into public.hearings (case_id, hearing_date, purpose, court_room)
    values (v_id, p_next_hearing_date, coalesce(nullif(btrim(p_next_hearing_purpose), ''), v.stage), v.court_room);
  end if;

  return v_id;
end;
$$;

-- Court search: every word must match the name, a short form, the bench, district or state.
-- Common abbreviations are expanded (hc -> high court, ccc -> city civil ...), and a word also
-- matches the court's initials ("ghc" -> Gujarat High Court).
create or replace function public.search_courts(p_q text, p_limit integer default 30)
returns setof public.court_directory
language sql
stable
set search_path = ''
as $$
  with q as (
    select btrim(regexp_replace(lower(coalesce(p_q, '')), '[^a-z0-9& ]', ' ', 'g')) as raw
  ),
  words as (
    select w,
      case w
        when 'hc' then 'high court'
        when 'sc' then 'supreme court'
        when 'dc' then 'district'
        when 'ccc' then 'city civil'
        when 'fc' then 'family'
        when 'mm' then 'metropolitan'
        when 'cjm' then 'chief judicial'
        when 'jmfc' then 'judicial magistrate'
        when 'ahd' then 'ahmedabad'
        when 'amd' then 'ahmedabad'
        when 'bom' then 'bombay'
        when 'del' then 'delhi'
        when 'mum' then 'mumbai'
        when 'blr' then 'bengaluru'
        when 'p&h' then 'punjab'
        else null
      end as expanded
    from q, regexp_split_to_table(q.raw, '\s+') as w
    where w <> ''
  )
  select d.*
  from public.court_directory d, q
  where q.raw <> ''
    and not exists (
      select 1 from words x
      where not (
        d.search like '%' || x.w || '%'
        or (x.expanded is not null and d.search like '%' || x.expanded || '%')
        or d.initials like x.w || '%'
      )
    )
  order by
    (d.initials = replace(q.raw, ' ', '') or lower(coalesce(d.short_name, '')) = q.raw) desc,
    case d.level when 'SC' then 0 when 'HC' then 1 else 2 end,
    (lower(d.name) like q.raw || '%') desc,
    d.name
  limit least(greatest(coalesce(p_limit, 30), 1), 100);
$$;

grant execute on function public.search_courts(text, integer) to authenticated;
revoke execute on function public.search_courts(text, integer) from anon, public;

-- Seed: Supreme Court and High Courts (principal seats and main benches).
insert into public.court_directory (id, level, name, short_name, aliases, bench, state_codes, state_name) values
  ('SC', 'SC', 'Supreme Court of India', 'SC', 'sci supreme', null, '{}', 'India'),
  ('HC:UP', 'HC', 'Allahabad High Court', 'AHC', 'ald hc allahabad', null, '{UP}', 'Uttar Pradesh'),
  ('HC:UP:LUCKNOW', 'HC', 'Allahabad High Court, Lucknow Bench', 'AHC', 'lko lucknow', 'Lucknow', '{UP}', 'Uttar Pradesh'),
  ('HC:AP', 'HC', 'High Court of Andhra Pradesh', 'APHC', 'ap hc amaravati', null, '{AP}', 'Andhra Pradesh'),
  ('HC:MH', 'HC', 'Bombay High Court', 'BHC', 'bom hc mumbai', null, '{MH,GA,DN}', 'Maharashtra, Goa, Dadra and Nagar Haveli and Daman and Diu'),
  ('HC:MH:NAGPUR', 'HC', 'Bombay High Court, Nagpur Bench', 'BHC', 'bom nagpur', 'Nagpur', '{MH}', 'Maharashtra'),
  ('HC:MH:AURANGABAD', 'HC', 'Bombay High Court, Aurangabad Bench', 'BHC', 'bom aurangabad chhatrapati sambhajinagar', 'Aurangabad', '{MH}', 'Maharashtra'),
  ('HC:MH:GOA', 'HC', 'Bombay High Court, Goa Bench', 'BHC', 'bom goa panaji', 'Goa', '{GA}', 'Goa'),
  ('HC:WB', 'HC', 'Calcutta High Court', 'CHC', 'cal hc kolkata', null, '{WB,AN}', 'West Bengal, Andaman and Nicobar Islands'),
  ('HC:CG', 'HC', 'High Court of Chhattisgarh', 'CGHC', 'cg hc bilaspur', null, '{CG}', 'Chhattisgarh'),
  ('HC:DL', 'HC', 'Delhi High Court', 'DHC', 'del hc delhi', null, '{DL}', 'Delhi'),
  ('HC:AS', 'HC', 'Gauhati High Court', 'GauHC', 'guwahati gauhati hc', null, '{AS,AR,NL,MZ}', 'Assam, Arunachal Pradesh, Nagaland, Mizoram'),
  ('HC:GJ', 'HC', 'Gujarat High Court', 'GHC', 'gujhc guj hc ahmedabad sola', null, '{GJ}', 'Gujarat'),
  ('HC:HP', 'HC', 'High Court of Himachal Pradesh', 'HPHC', 'hp hc shimla', null, '{HP}', 'Himachal Pradesh'),
  ('HC:JK', 'HC', 'High Court of Jammu & Kashmir and Ladakh', 'JKHC', 'jk hc srinagar jammu', null, '{JK,LA}', 'Jammu and Kashmir, Ladakh'),
  ('HC:JH', 'HC', 'Jharkhand High Court', 'JHC', 'jh hc ranchi', null, '{JH}', 'Jharkhand'),
  ('HC:KA', 'HC', 'High Court of Karnataka', 'KarHC', 'khc ka hc bengaluru bangalore', null, '{KA}', 'Karnataka'),
  ('HC:KA:DHARWAD', 'HC', 'High Court of Karnataka, Dharwad Bench', 'KarHC', 'dharwad', 'Dharwad', '{KA}', 'Karnataka'),
  ('HC:KA:KALABURAGI', 'HC', 'High Court of Karnataka, Kalaburagi Bench', 'KarHC', 'kalaburagi gulbarga', 'Kalaburagi', '{KA}', 'Karnataka'),
  ('HC:KL', 'HC', 'High Court of Kerala', 'KerHC', 'khc kl hc ernakulam kochi', null, '{KL,LD}', 'Kerala, Lakshadweep'),
  ('HC:MP', 'HC', 'Madhya Pradesh High Court', 'MPHC', 'mp hc jabalpur', null, '{MP}', 'Madhya Pradesh'),
  ('HC:MP:INDORE', 'HC', 'Madhya Pradesh High Court, Indore Bench', 'MPHC', 'indore', 'Indore', '{MP}', 'Madhya Pradesh'),
  ('HC:MP:GWALIOR', 'HC', 'Madhya Pradesh High Court, Gwalior Bench', 'MPHC', 'gwalior', 'Gwalior', '{MP}', 'Madhya Pradesh'),
  ('HC:TN', 'HC', 'Madras High Court', 'MHC', 'mad hc chennai', null, '{TN,PY}', 'Tamil Nadu, Puducherry'),
  ('HC:TN:MADURAI', 'HC', 'Madras High Court, Madurai Bench', 'MHC', 'madurai', 'Madurai', '{TN}', 'Tamil Nadu'),
  ('HC:MN', 'HC', 'High Court of Manipur', 'MNHC', 'manipur imphal', null, '{MN}', 'Manipur'),
  ('HC:ML', 'HC', 'High Court of Meghalaya', 'MLHC', 'meghalaya shillong', null, '{ML}', 'Meghalaya'),
  ('HC:OD', 'HC', 'Orissa High Court', 'OHC', 'odisha hc cuttack', null, '{OD}', 'Odisha'),
  ('HC:BR', 'HC', 'Patna High Court', 'PHC', 'bihar hc patna', null, '{BR}', 'Bihar'),
  ('HC:PB', 'HC', 'Punjab and Haryana High Court', 'PHHC', 'p&h punjab haryana chandigarh', null, '{PB,HR,CH}', 'Punjab, Haryana, Chandigarh'),
  ('HC:RJ', 'HC', 'Rajasthan High Court', 'RHC', 'raj hc jodhpur', null, '{RJ}', 'Rajasthan'),
  ('HC:RJ:JAIPUR', 'HC', 'Rajasthan High Court, Jaipur Bench', 'RHC', 'jaipur', 'Jaipur', '{RJ}', 'Rajasthan'),
  ('HC:SK', 'HC', 'High Court of Sikkim', 'SKHC', 'sikkim gangtok', null, '{SK}', 'Sikkim'),
  ('HC:TS', 'HC', 'High Court for the State of Telangana', 'TSHC', 'tghc telangana hyderabad', null, '{TS}', 'Telangana'),
  ('HC:TR', 'HC', 'High Court of Tripura', 'TRHC', 'tripura agartala', null, '{TR}', 'Tripura'),
  ('HC:UK', 'HC', 'High Court of Uttarakhand', 'UKHC', 'uttarakhand nainital', null, '{UK}', 'Uttarakhand');

-- Orders are listed and opened on demand ("open in browser"), no longer copied into Documents
-- every 30 minutes. Paused, not removed: re-enable with cron.alter_job(..., active := true).
do $$
begin
  if exists (select 1 from cron.job where jobname = 'ecourts-order-sync') then
    perform cron.alter_job((select jobid from cron.job where jobname = 'ecourts-order-sync'), active := false);
  end if;
end;
$$;
