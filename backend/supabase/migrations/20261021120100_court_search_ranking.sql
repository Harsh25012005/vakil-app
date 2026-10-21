-- Court search ranking: an exact short name ("GHC" -> Gujarat High Court) ranks above a court
-- whose initials happen to match (Gauhati High Court).

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
    (lower(coalesce(d.short_name, '')) = q.raw) desc,
    (d.initials = replace(q.raw, ' ', '')) desc,
    case d.level when 'SC' then 0 when 'HC' then 1 else 2 end,
    (lower(d.name) like q.raw || '%') desc,
    (d.bench is null) desc,
    d.name
  limit least(greatest(coalesce(p_limit, 30), 1), 100);
$$;
