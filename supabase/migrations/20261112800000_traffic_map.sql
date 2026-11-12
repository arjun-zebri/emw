-- Admin → Traffic, third pass: enquiries leave the traffic figures (they have their own page), and
-- each view keeps a rough position, the centre of the visitor's city to about 10 km, for the map.
-- Applies after 20261112600000_traffic_insights.sql (and the journal migration of the same day).

-- ── Enquiries out ───────────────────────────────────────────────────────

drop function public.record_site_enquiry(text, uuid, text, text, text);
drop function public.traffic_summary(date, date, date, date, text, text[], text, text, text, text);
drop function public.traffic_enquiry_rows(date, date, text, text[], text, text, text, uuid);
drop table public.site_enquiries;

create or replace function public.analytics_visitor(p_ident text)
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
    delete from public.site_filters where day < (today - interval '25 months')::date;
  end if;
  select key into k from public.analytics_keys where day = today;
  return left(encode(extensions.digest(k || convert_to(p_ident, 'UTF8'), 'sha256'), 'hex'), 32);
end;
$$;

-- ── Where on the map ────────────────────────────────────────────────────

-- From Vercel's location headers, rounded to one decimal place by the server.
alter table public.page_views
  add column lat real check (lat between -90 and 90),
  add column lon real check (lon between -180 and 180);

drop function public.record_page_view(text, text, text, text, text, text, text, text);

create function public.record_page_view(
  p_ident text,
  p_path text,
  p_referrer text,
  p_campaign text,
  p_country text,
  p_region text,
  p_city text,
  p_device text,
  p_lat real default null,
  p_lon real default null
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
  fresh boolean;
  ref text := nullif(p_referrer, '');
  tag text := nullif(p_campaign, '');
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
  fresh := not exists (select 1 from public.page_views v where v.visitor = who and v.at > now() - interval '30 minutes');
  if not fresh then
    select v.referrer, v.campaign into ref, tag
    from public.page_views v
    where v.visitor = who and v.new_visit
    order by v.at desc
    limit 1;
  end if;
  insert into public.page_views (day, path, vendor_id, visitor, new_visit, referrer, campaign, country, region, city, device, lat, lon)
  values (today, p_path, vendor, who, fresh, ref, tag, nullif(p_country, ''), nullif(p_region, ''), nullif(p_city, ''), p_device, round(p_lat::numeric, 1), round(p_lon::numeric, 1));
  if vendor is not null then
    insert into public.vendor_views (vendor_id, day, views) values (vendor, today, 1)
    on conflict (vendor_id, day) do update set views = public.vendor_views.views + 1;
  end if;
end;
$$;

revoke all on function public.record_page_view(text, text, text, text, text, text, text, text, real, real) from public, anon, authenticated;
grant execute on function public.record_page_view(text, text, text, text, text, text, text, text, real, real) to service_role;

-- ── Figures for the team ────────────────────────────────────────────────

-- Now also narrows to a city.
drop function public.traffic_rows(date, date, text, text[], text, text, text, uuid);

create function public.traffic_rows(
  first_day date,
  last_day date,
  p_channel text,
  p_sites text[],
  p_campaign text,
  p_country text,
  p_region text,
  p_city text,
  p_vendor uuid
)
returns setof public.page_views
language sql
stable
set search_path = ''
as $$
  select pv.* from public.page_views pv
  where pv.day between first_day and last_day
    and (p_channel is null or public.analytics_channel(pv.referrer) = p_channel)
    and (p_sites is null or pv.referrer = any (p_sites))
    and (p_campaign is null or pv.campaign = p_campaign)
    and (p_country is null or pv.country = p_country)
    and (p_region is null or pv.region = p_region)
    and (p_city is null or pv.city = p_city)
    and (p_vendor is null or exists (
      select 1 from public.page_views w where w.visitor = pv.visitor and w.day = pv.day and w.vendor_id = p_vendor
    ));
$$;

revoke all on function public.traffic_rows(date, date, text, text[], text, text, text, text, uuid) from public, anon, authenticated;

create function public.traffic_summary(
  first_day date,
  last_day date,
  prev_first date default null,
  prev_last date default null,
  p_channel text default null,
  p_sites text[] default null,
  p_campaign text default null,
  p_country text default null,
  p_region text default null,
  p_city text default null,
  p_vendor text default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  vendor uuid;
  narrowed boolean := coalesce(p_channel, p_campaign, p_country, p_region, p_city, p_vendor) is not null or p_sites is not null;
  result jsonb;
begin
  if not public.is_team() then
    raise exception 'Only the East Meets Wed team can see the traffic figures';
  end if;
  if last_day < first_day or last_day - first_day > 800 then
    raise exception 'Choose a period of up to two years';
  end if;
  if p_vendor is not null then
    select id into vendor from public.vendors where slug = p_vendor;
    if vendor is null then
      vendor := '00000000-0000-0000-0000-000000000000';
    end if;
  end if;

  with
    cur as (select * from public.traffic_rows(first_day, last_day, p_channel, p_sites, p_campaign, p_country, p_region, p_city, vendor)),
    pre as (select * from public.traffic_rows(prev_first, prev_last, p_channel, p_sites, p_campaign, p_country, p_region, p_city, vendor) where prev_first is not null),
    srch as (
      select s.* from public.site_searches s
      where s.day between first_day and last_day
        and (not narrowed or exists (select 1 from cur where cur.visitor = s.visitor and cur.day = s.day))
    ),
    filt as (
      select f.* from public.site_filters f
      where f.day between first_day and last_day
        and (not narrowed or exists (select 1 from cur where cur.visitor = f.visitor and cur.day = f.day))
    ),
    daily as (
      select day, count(*) filter (where new_visit) as visits, count(*) as views, count(*) filter (where vendor_id is not null) as listing_views
      from cur group by day
    ),
    daily_pre as (
      select day, count(*) filter (where new_visit) as visits, count(*) as views, count(*) filter (where vendor_id is not null) as listing_views
      from pre group by day
    )
  select jsonb_build_object(
    'totals', jsonb_build_object(
      'visits', (select count(*) from cur where new_visit),
      'views', (select count(*) from cur),
      'listing_views', (select count(*) from cur where vendor_id is not null)
    ),
    'before', case when prev_first is null then null else jsonb_build_object(
      'visits', (select count(*) from pre where new_visit),
      'views', (select count(*) from pre),
      'listing_views', (select count(*) from pre where vendor_id is not null)
    ) end,
    'days', coalesce((select jsonb_agg(to_jsonb(d) order by d.day) from daily d), '[]'),
    'days_before', coalesce((select jsonb_agg(to_jsonb(d) order by d.day) from daily_pre d), '[]'),
    'channels', coalesce((select jsonb_agg(jsonb_build_object('channel', channel, 'visits', visits) order by visits desc) from (
      select public.analytics_channel(referrer) as channel, count(*) as visits from cur where new_visit group by 1
    ) c), '[]'),
    'sites', coalesce((select jsonb_agg(jsonb_build_object('host', referrer, 'visits', visits) order by visits desc) from (
      select referrer, count(*) as visits from cur where new_visit and referrer is not null group by referrer order by visits desc limit 200
    ) s), '[]'),
    'campaigns', coalesce((select jsonb_agg(jsonb_build_object('campaign', campaign, 'visits', visits) order by visits desc) from (
      select campaign, count(*) as visits from cur where new_visit and campaign is not null group by campaign order by visits desc limit 100
    ) s), '[]'),
    'landings', coalesce((select jsonb_agg(jsonb_build_object('path', path, 'visits', visits) order by visits desc, path) from (
      select path, count(*) as visits from cur where new_visit group by path order by visits desc, path limit 100
    ) l), '[]'),
    'vendors', coalesce((select jsonb_agg(jsonb_build_object(
        'slug', v.slug, 'name', v.name, 'views', t.views, 'visitors', t.visitors, 'channel', t.channel,
        'before', (select count(*) from pre where pre.vendor_id = t.vendor_id)
      ) order by t.views desc, v.name)
      from (
        select vendor_id, count(*) as views, count(distinct (day, visitor)) as visitors,
          mode() within group (order by public.analytics_channel(referrer)) as channel
        from cur where vendor_id is not null group by vendor_id
      ) t join public.vendors v on v.id = t.vendor_id), '[]'),
    'places', coalesce((select jsonb_agg(jsonb_build_object('country', country, 'region', region, 'city', city, 'visits', visits, 'lat', lat, 'lon', lon) order by visits desc) from (
      select country, region, city, count(*) as visits, round(avg(lat)::numeric, 2) as lat, round(avg(lon)::numeric, 2) as lon
      from cur where new_visit group by country, region, city order by visits desc limit 300
    ) l), '[]'),
    'searches', coalesce((select jsonb_agg(jsonb_build_object('query', query, 'times', times, 'matches', matches) order by times desc, query) from (
      select query, count(*) as times, (array_agg(matches order by at desc))[1] as matches from srch group by query order by times desc, query limit 200
    ) q), '[]'),
    'filters', coalesce((select jsonb_agg(jsonb_build_object('kind', kind, 'value', value, 'times', times) order by times desc, value) from (
      select kind, value, count(*) as times from filt group by kind, value
    ) f), '[]')
  ) into result;

  return result;
end;
$$;

revoke all on function public.traffic_summary(date, date, date, date, text, text[], text, text, text, text, text) from public, anon;
grant execute on function public.traffic_summary(date, date, date, date, text, text[], text, text, text, text, text) to authenticated;
