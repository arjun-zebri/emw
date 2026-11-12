-- Visitor numbers for Admin → Traffic, counted by the site itself: no third party, no cookies.
--
-- A public page sends one small message to our own server (app/api/v/route.ts), which checks it
-- and calls record_page_view or record_site_search with the secret key. Visitors never touch these
-- tables: no policies and no grants, as with form_attempts. The team reads totals only, through
-- traffic_summary.
--
-- Who's who without tracking anyone: the server passes the visitor's IP and browser string, which
-- are scrambled here with a random key made fresh each Melbourne day and never stored. The key is
-- deleted when the day is over, so a visitor code can't be traced back to anyone or matched with
-- the same person on another day.
--
-- Housekeeping runs with the first view of each day (no scheduler to depend on): yesterday's key
-- goes, and rows older than 25 months, so the table can't grow without limit and there's still a
-- full year to compare with the one before.

create extension if not exists pgcrypto with schema extensions;

create table public.analytics_keys (
  day date primary key,
  key bytea not null default extensions.gen_random_bytes(32)
);
alter table public.analytics_keys enable row level security;
revoke all on public.analytics_keys from anon, authenticated;

create table public.page_views (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  -- The Melbourne day, like the rest of the admin.
  day date not null,
  path text not null check (char_length(path) between 1 and 200),
  -- Set for a published vendor's page, so the figures follow the vendor if their address changes.
  vendor_id uuid references public.vendors on delete set null,
  -- Today's code for this visitor (see above).
  visitor text not null check (char_length(visitor) = 32),
  -- The first view after 30 minutes without one: a new visit.
  new_visit boolean not null,
  -- The site that sent them (host only, like "instagram.com"), on the first view of a visit.
  referrer text check (char_length(referrer) <= 100),
  -- utm_source from the link they arrived on.
  campaign text check (char_length(campaign) <= 50),
  -- From Vercel's location headers: ISO country, region code, city name.
  country text check (char_length(country) <= 2),
  region text check (char_length(region) <= 10),
  city text check (char_length(city) <= 100),
  device text not null check (device in ('phone', 'tablet', 'desktop'))
);
create index page_views_day_idx on public.page_views (day);
create index page_views_visitor_idx on public.page_views (visitor, at desc);
alter table public.page_views enable row level security;
revoke all on public.page_views from anon, authenticated;

-- What couples type in the directory search, and how many listings match those words.
create table public.site_searches (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  day date not null,
  query text not null check (char_length(query) between 2 and 80),
  matches integer not null check (matches >= 0),
  visitor text not null check (char_length(visitor) = 32)
);
create index site_searches_day_idx on public.site_searches (day);
create index site_searches_visitor_idx on public.site_searches (visitor, at desc);
alter table public.site_searches enable row level security;
revoke all on public.site_searches from anon, authenticated;

-- Today's code for a visitor, making today's key (and tidying up) on the first call of the day.
create function public.analytics_visitor(p_ident text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  today date := (now() at time zone 'Australia/Melbourne')::date;
  k bytea;
begin
  insert into public.analytics_keys (day) values (today) on conflict (day) do nothing;
  if found then
    delete from public.analytics_keys where day < today;
    delete from public.page_views where day < (today - interval '25 months')::date;
    delete from public.site_searches where day < (today - interval '25 months')::date;
  end if;
  select key into k from public.analytics_keys where day = today;
  return left(encode(extensions.digest(k || convert_to(p_ident, 'UTF8'), 'sha256'), 'hex'), 32);
end;
$$;

-- One view of a public page. Server only. Quietly does nothing for a vendor page that isn't
-- published, or past 30 views a minute from one visitor.
create function public.record_page_view(
  p_ident text,
  p_path text,
  p_referrer text,
  p_campaign text,
  p_country text,
  p_region text,
  p_city text,
  p_device text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  today date := (now() at time zone 'Australia/Melbourne')::date;
  who text := public.analytics_visitor(p_ident);
  vendor uuid;
begin
  if (select count(*) from public.page_views v where v.visitor = who and v.at > now() - interval '1 minute') >= 30 then
    return;
  end if;
  if p_path like '/vendors/%' then
    select v.id into vendor from public.vendors v where v.slug = substr(p_path, 10) and v.status = 'published';
    if vendor is null then
      return;
    end if;
  end if;
  insert into public.page_views (day, path, vendor_id, visitor, new_visit, referrer, campaign, country, region, city, device)
  values (
    today,
    p_path,
    vendor,
    who,
    not exists (select 1 from public.page_views v where v.visitor = who and v.at > now() - interval '30 minutes'),
    nullif(p_referrer, ''),
    nullif(p_campaign, ''),
    nullif(p_country, ''),
    nullif(p_region, ''),
    nullif(p_city, ''),
    p_device
  );
end;
$$;

-- One directory search. Server only. The same words from the same visitor count once a day, and
-- no more than 20 searches a minute from one visitor are kept.
create function public.record_site_search(p_ident text, p_query text, p_matches integer)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  today date := (now() at time zone 'Australia/Melbourne')::date;
  who text := public.analytics_visitor(p_ident);
begin
  if exists (select 1 from public.site_searches s where s.visitor = who and s.day = today and s.query = p_query) then
    return;
  end if;
  if (select count(*) from public.site_searches s where s.visitor = who and s.at > now() - interval '1 minute') >= 20 then
    return;
  end if;
  insert into public.site_searches (day, query, matches, visitor) values (today, p_query, p_matches, who);
end;
$$;

revoke all on function public.analytics_visitor(text) from public, anon, authenticated;
revoke all on function public.record_page_view(text, text, text, text, text, text, text, text) from public, anon, authenticated;
revoke all on function public.record_site_search(text, text, integer) from public, anon, authenticated;
grant execute on function public.record_page_view(text, text, text, text, text, text, text, text) to service_role;
grant execute on function public.record_site_search(text, text, integer) to service_role;

-- The figures for Admin → Traffic, for a period of Melbourne days and the one before it. Team only,
-- and totals only: no visitor codes or single views leave the database.
create function public.traffic_summary(first_day date, last_day date, prev_first date default null, prev_last date default null)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  result jsonb;
begin
  if not public.is_team() then
    raise exception 'Only the East Meets Wed team can see the traffic figures';
  end if;
  if last_day < first_day or last_day - first_day > 800 then
    raise exception 'Choose a period of up to two years';
  end if;

  with
    cur as (select * from public.page_views where day between first_day and last_day),
    pre as (select * from public.page_views where prev_first is not null and day between prev_first and prev_last),
    srch as (select * from public.site_searches where day between first_day and last_day)
  select jsonb_build_object(
    'totals', (select jsonb_build_object(
      'views', count(*),
      'visits', count(*) filter (where new_visit),
      -- A visitor code lasts a day, so this adds up each day's visitors.
      'visitors', (select count(*) from (select distinct day, visitor from cur) d)
    ) from cur),
    'before', case when prev_first is null then null else (select jsonb_build_object(
      'views', count(*),
      'visits', count(*) filter (where new_visit),
      'visitors', (select count(*) from (select distinct day, visitor from pre) d)
    ) from pre) end,
    'days', coalesce((select jsonb_agg(jsonb_build_object('day', day, 'views', views, 'visits', visits, 'visitors', visitors) order by day) from (
      select day, count(*) as views, count(*) filter (where new_visit) as visits, count(distinct visitor) as visitors from cur group by day
    ) d), '[]'),
    'days_before', coalesce((select jsonb_agg(jsonb_build_object('day', day, 'views', views, 'visits', visits, 'visitors', visitors) order by day) from (
      select day, count(*) as views, count(*) filter (where new_visit) as visits, count(distinct visitor) as visitors from pre group by day
    ) d), '[]'),
    'pages', coalesce((select jsonb_agg(jsonb_build_object('path', path, 'views', views, 'visitors', visitors) order by views desc, path) from (
      select path, count(*) as views, count(distinct (day, visitor)) as visitors from cur where vendor_id is null group by path order by views desc, path limit 30
    ) p), '[]'),
    'vendors', coalesce((select jsonb_agg(jsonb_build_object('slug', v.slug, 'name', v.name, 'views', t.views, 'visitors', t.visitors, 'before', t.prior) order by t.views desc, v.name) from (
      select vendor_id, count(*) as views, count(distinct (day, visitor)) as visitors,
        (select count(*) from pre where pre.vendor_id = cur.vendor_id) as prior
      from cur where vendor_id is not null group by vendor_id order by views desc limit 100
    ) t join public.vendors v on v.id = t.vendor_id), '[]'),
    'sources', coalesce((select jsonb_agg(jsonb_build_object('referrer', referrer, 'campaign', campaign, 'visits', visits) order by visits desc) from (
      select referrer, campaign, count(*) as visits from cur where new_visit group by referrer, campaign order by visits desc limit 100
    ) s), '[]'),
    'places', coalesce((select jsonb_agg(jsonb_build_object('country', country, 'region', region, 'city', city, 'visits', visits) order by visits desc) from (
      select country, region, city, count(*) as visits from cur where new_visit group by country, region, city order by visits desc limit 200
    ) l), '[]'),
    'devices', coalesce((select jsonb_object_agg(device, visits) from (
      select device, count(*) as visits from cur where new_visit group by device
    ) d), '{}'),
    'searches', coalesce((select jsonb_agg(jsonb_build_object('query', query, 'times', times, 'matches', matches) order by times desc, query) from (
      select query, count(*) as times, (array_agg(matches order by at desc))[1] as matches from srch group by query order by times desc, query limit 100
    ) q), '[]'),
    'unmatched', coalesce((select jsonb_agg(jsonb_build_object('query', query, 'times', times) order by times desc, query) from (
      select query, count(*) as times from srch group by query having (array_agg(matches order by at desc))[1] = 0 order by times desc, query limit 100
    ) q), '[]')
  ) into result;

  return result;
end;
$$;

revoke all on function public.traffic_summary(date, date, date, date) from public, anon;
grant execute on function public.traffic_summary(date, date, date, date) to authenticated;
