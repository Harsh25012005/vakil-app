-- Tribunals and other non-eCourts courts in the court directory (Add case court search).
-- DRT, DRAT, NCLT, NCLAT, NGT, CAT, ITAT, CESTAT, AFT, SAT, APTEL, TDSAT, NCDRC, every State
-- Consumer Commission and RERA, findable by short name ("DRT") or bench / state ("drt ahmedabad").
-- Their cases aren't on eCourts, so Add case offers manual entry for them. court_codes is for
-- benches eCourtsIndia can search (none known yet).

alter table public.court_directory drop constraint court_directory_level_check;
alter table public.court_directory
  add constraint court_directory_level_check check (level in ('SC', 'HC', 'TRIBUNAL', 'DC'));

alter table public.court_directory add column court_codes text[] not null default '{}';
comment on column public.court_directory.court_codes is 'eCourtsIndia search court codes, for tribunals it covers. Empty: not searchable on eCourts.';

-- List order for the full court list: Supreme Court, High Courts, tribunals, district courts.
alter table public.court_directory
  add column sort_rank smallint generated always as (case level when 'SC' then 0 when 'HC' then 1 when 'TRIBUNAL' then 2 else 3 end) stored;
create index court_directory_list_idx on public.court_directory (sort_rank, state_name, name);

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
        when 'consumer' then 'consumer'
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
    (lower(coalesce(d.short_name, '')) = q.raw) desc,
    (d.initials = replace(q.raw, ' ', '')) desc,
    d.sort_rank,
    (lower(d.name) like q.raw || '%') desc,
    (d.bench is null) desc,
    d.name
  limit least(greatest(coalesce(p_limit, 30), 1), 100);
$$;

-- Seed: tribunal benches (bench "Ahmedabad-I" -> city Ahmedabad -> state), then every State
-- Consumer Commission and RERA.
with city(c, st) as (values
  ('Ahmedabad', 'Gujarat'),
  ('Rajkot', 'Gujarat'),
  ('Surat', 'Gujarat'),
  ('Allahabad', 'Uttar Pradesh'),
  ('Prayagraj', 'Uttar Pradesh'),
  ('Lucknow', 'Uttar Pradesh'),
  ('Aurangabad', 'Maharashtra'),
  ('Mumbai', 'Maharashtra'),
  ('Nagpur', 'Maharashtra'),
  ('Pune', 'Maharashtra'),
  ('Bengaluru', 'Karnataka'),
  ('Chandigarh', 'Chandigarh'),
  ('Chennai', 'Tamil Nadu'),
  ('Coimbatore', 'Tamil Nadu'),
  ('Madurai', 'Tamil Nadu'),
  ('Cuttack', 'Odisha'),
  ('Dehradun', 'Uttarakhand'),
  ('Delhi', 'Delhi'),
  ('New Delhi', 'Delhi'),
  ('Ernakulam', 'Kerala'),
  ('Kochi', 'Kerala'),
  ('Guwahati', 'Assam'),
  ('Hyderabad', 'Telangana'),
  ('Jabalpur', 'Madhya Pradesh'),
  ('Indore', 'Madhya Pradesh'),
  ('Bhopal', 'Madhya Pradesh'),
  ('Jaipur', 'Rajasthan'),
  ('Jodhpur', 'Rajasthan'),
  ('Kolkata', 'West Bengal'),
  ('Siliguri', 'West Bengal'),
  ('Patna', 'Bihar'),
  ('Ranchi', 'Jharkhand'),
  ('Visakhapatnam', 'Andhra Pradesh'),
  ('Amaravati', 'Andhra Pradesh'),
  ('Jammu', 'Jammu and Kashmir'),
  ('Srinagar', 'Jammu and Kashmir'),
  ('Panaji', 'Goa'),
  ('Raipur', 'Chhattisgarh'),
  ('Shimla', 'Himachal Pradesh')
),
grp(short, full_name, aliases, benches) as (values
  ('DRT', 'Debts Recovery Tribunal', 'drt debt recovery debts', array['Ahmedabad-I','Ahmedabad-II','Allahabad','Aurangabad','Bengaluru-I','Bengaluru-II','Chandigarh-I','Chandigarh-II','Chandigarh-III','Chennai-I','Chennai-II','Chennai-III','Coimbatore','Cuttack','Dehradun','Delhi-I','Delhi-II','Delhi-III','Ernakulam-I','Ernakulam-II','Guwahati','Hyderabad-I','Hyderabad-II','Jabalpur','Jaipur','Kolkata-I','Kolkata-II','Kolkata-III','Lucknow','Madurai','Mumbai-I','Mumbai-II','Mumbai-III','Nagpur','Patna','Pune','Ranchi','Siliguri','Visakhapatnam']),
  ('DRAT', 'Debts Recovery Appellate Tribunal', 'drat debt recovery appellate', array['Allahabad','Chennai','Delhi','Kolkata','Mumbai']),
  ('NCLT', 'National Company Law Tribunal', 'nclt company law insolvency ibc', array['Ahmedabad','Allahabad','Amaravati','Bengaluru','Chandigarh','Chennai','Cuttack','Guwahati','Hyderabad','Indore','Jaipur','Kochi','Kolkata','Mumbai','New Delhi']),
  ('NCLAT', 'National Company Law Appellate Tribunal', 'nclat company law appellate', array['New Delhi','Chennai']),
  ('NGT', 'National Green Tribunal', 'ngt green environment', array['New Delhi','Bhopal','Chennai','Kolkata','Pune']),
  ('CAT', 'Central Administrative Tribunal', 'cat administrative service', array['New Delhi','Ahmedabad','Allahabad','Bengaluru','Chandigarh','Chennai','Cuttack','Ernakulam','Guwahati','Hyderabad','Jabalpur','Jaipur','Jodhpur','Kolkata','Lucknow','Mumbai','Patna','Jammu','Srinagar']),
  ('ITAT', 'Income Tax Appellate Tribunal', 'itat income tax appellate', array['Ahmedabad','Rajkot','Surat','Mumbai','Pune','Nagpur','New Delhi','Chandigarh','Jaipur','Jodhpur','Lucknow','Allahabad','Kolkata','Patna','Ranchi','Cuttack','Guwahati','Chennai','Bengaluru','Hyderabad','Visakhapatnam','Kochi','Indore','Jabalpur','Raipur','Panaji']),
  ('CESTAT', 'Customs, Excise and Service Tax Appellate Tribunal', 'cestat customs excise service tax gst', array['New Delhi','Mumbai','Chennai','Kolkata','Ahmedabad','Bengaluru','Hyderabad','Allahabad','Chandigarh']),
  ('AFT', 'Armed Forces Tribunal', 'aft armed forces military', array['New Delhi','Chandigarh','Lucknow','Kolkata','Guwahati','Chennai','Kochi','Mumbai','Jaipur','Jabalpur','Srinagar']),
  ('SAT', 'Securities Appellate Tribunal', 'sat securities sebi', array['Mumbai']),
  ('APTEL', 'Appellate Tribunal for Electricity', 'aptel electricity', array['New Delhi']),
  ('TDSAT', 'Telecom Disputes Settlement and Appellate Tribunal', 'tdsat telecom', array['New Delhi']),
  ('NCDRC', 'National Consumer Disputes Redressal Commission', 'ncdrc consumer commission national', array['New Delhi'])
),
b as (select g.short, g.full_name, g.aliases, x.bench from grp g, unnest(g.benches) as x(bench))
insert into public.court_directory (id, level, name, short_name, aliases, bench, state_name)
select 'TR:' || b.short || ':' || upper(regexp_replace(b.bench, '[^A-Za-z0-9]+', '-', 'g')),
       'TRIBUNAL', b.full_name || ', ' || b.bench, b.short,
       b.aliases || ' tribunal ' || lower(regexp_replace(b.bench, '-[IV]+$', '')),
       b.bench, city.st
from b join city on city.c = regexp_replace(b.bench, '-[IV]+$', '')
on conflict (id) do nothing;

with s(st) as (select unnest(array['Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh','Delhi','Goa','Gujarat','Haryana','Himachal Pradesh','Jammu and Kashmir','Jharkhand','Karnataka','Kerala','Madhya Pradesh','Maharashtra','Manipur','Meghalaya','Mizoram','Nagaland','Odisha','Punjab','Rajasthan','Sikkim','Tamil Nadu','Telangana','Tripura','Uttar Pradesh','Uttarakhand','West Bengal','Chandigarh','Puducherry']))
insert into public.court_directory (id, level, name, short_name, aliases, bench, state_name)
select 'TR:' || k.short || ':' || upper(regexp_replace(s.st, '[^A-Za-z0-9]+', '-', 'g')),
       'TRIBUNAL', k.full_name || ', ' || s.st, k.short, k.aliases, null, s.st
from s, (values
  ('SCDRC', 'State Consumer Disputes Redressal Commission', 'scdrc state consumer commission forum'),
  ('RERA', 'Real Estate Regulatory Authority', 'rera real estate authority')
) as k(short, full_name, aliases)
on conflict (id) do nothing;
