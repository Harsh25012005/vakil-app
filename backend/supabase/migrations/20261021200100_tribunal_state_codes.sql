-- Tribunal state codes, so a tribunal search on eCourtsIndia starts with the bench's state.
-- The codes come from the High Court rows, whose state names and codes are listed in the same order.

update public.court_directory t
set state_codes = array[hc.code]
from (
  select distinct on (btrim(n.name)) btrim(n.name) as name, h.state_codes[n.i] as code
  from public.court_directory h,
       unnest(string_to_array(h.state_name, ',')) with ordinality as n(name, i)
  where h.level = 'HC' and h.state_codes[n.i] is not null
  order by btrim(n.name), h.bench nulls first
) hc
where t.level = 'TRIBUNAL'
  and t.state_codes = '{}'
  and hc.name = t.state_name;
