-- Admin → Traffic, second pass: every figure can be narrowed by where visitors came from, where
-- they are and which vendor they looked at; enquiries sit beside views; the directory's filters
-- count as demand; and vendor profile views come from the same counter, so the admin and the
-- vendor's dashboard always agree. Applies after 20261112500000_site_analytics.sql.

-- ── Channels ────────────────────────────────────────────────────────────

-- The kind of place a visit came from, by the sending site's host (stored without www., m., l.).
create function public.analytics_channel(host text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case
    when host is null or host = '' then 'direct'
    when host ~ '(^|\.)(google|bing|duckduckgo|yahoo|ecosia|baidu|yandex|startpage|qwant|brave)\.' or host like 'search.%' then 'search'
    when host ~ '(^|\.)(instagram|facebook|fb|pinterest|tiktok|youtube|linkedin|threads|reddit|twitter|x|xiaohongshu|weibo|wechat|snapchat|whatsapp|messenger)\.(com|net|co|cn)$'
      or host in ('t.co', 'lnkd.in', 'pin.it', 'youtu.be', 'fb.me', 'wa.me', 'pinterest.com.au', 'xhslink.com') then 'social'
    when host ~ '(^|\.)(mail|outlook|gmail|webmail)\.' or host like '%.mail.%' then 'email'
    else 'referral'
  end;
$$;

-- ── Page views: the visit's source on every view ───────────────────────

-- Housekeeping now covers the new tables too.
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
    delete from public.site_enquiries where day < (today - interval '25 months')::date;
    delete from public.site_filters where day < (today - interval '25 months')::date;
  end if;
  select key into k from public.analytics_keys where day = today;
  return left(encode(extensions.digest(k || convert_to(p_ident, 'UTF8'), 'sha256'), 'hex'), 32);
end;
$$;

-- A view later in a visit carries the site and campaign the visit started from, so "visitors from
-- Instagram" can follow them to the vendors they open. A vendor's page also adds to their profile
-- stats (vendor_views), so the vendor and the team see the same count.
create or replace function public.record_page_view(
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
  insert into public.page_views (day, path, vendor_id, visitor, new_visit, referrer, campaign, country, region, city, device)
  values (today, p_path, vendor, who, fresh, ref, tag, nullif(p_country, ''), nullif(p_region, ''), nullif(p_city, ''), p_device);
  if vendor is not null then
    insert into public.vendor_views (vendor_id, day, views) values (vendor, today, 1)
    on conflict (vendor_id, day) do update set views = public.vendor_views.views + 1;
  end if;
end;
$$;

-- The vendor page no longer counts itself (it goes through record_page_view).
drop function public.record_vendor_view(text);

-- ── Enquiries, tied to the visit they came from ─────────────────────────

-- One row per enquiry sent, recorded by the server as it saves the enquiry, with the source and
-- place of the visit it came from. Every real enquiry is here, signed in or not.
create table public.site_enquiries (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  day date not null,
  vendor_id uuid not null references public.vendors on delete cascade,
  visitor text not null check (char_length(visitor) = 32),
  referrer text check (char_length(referrer) <= 100),
  campaign text check (char_length(campaign) <= 50),
  country text check (char_length(country) <= 2),
  region text check (char_length(region) <= 10),
  city text check (char_length(city) <= 100)
);
create index site_enquiries_day_idx on public.site_enquiries (day);
alter table public.site_enquiries enable row level security;
revoke all on public.site_enquiries from anon, authenticated;

create function public.record_site_enquiry(p_ident text, p_vendor uuid, p_country text, p_region text, p_city text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  who text := public.analytics_visitor(p_ident);
  ref text;
  tag text;
begin
  select v.referrer, v.campaign into ref, tag
  from public.page_views v
  where v.visitor = who and v.new_visit
  order by v.at desc
  limit 1;
  insert into public.site_enquiries (day, vendor_id, visitor, referrer, campaign, country, region, city)
  values ((now() at time zone 'Australia/Melbourne')::date, p_vendor, who, ref, tag, nullif(p_country, ''), nullif(p_region, ''), nullif(p_city, ''));
end;
$$;

-- ── Directory filters ───────────────────────────────────────────────────

-- What couples narrow the directory to: categories, languages, locations, services. Each value
-- once a visitor a day.
create table public.site_filters (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  day date not null,
  visitor text not null check (char_length(visitor) = 32),
  kind text not null check (kind in ('category', 'language', 'location', 'service')),
  value text not null check (char_length(value) between 1 and 60)
);
create index site_filters_day_idx on public.site_filters (day);
create index site_filters_visitor_idx on public.site_filters (visitor, day);
alter table public.site_filters enable row level security;
revoke all on public.site_filters from anon, authenticated;

create function public.record_site_filter(p_ident text, p_kind text, p_values text[])
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  today date := (now() at time zone 'Australia/Melbourne')::date;
  who text := public.analytics_visitor(p_ident);
begin
  if (select count(*) from public.site_filters f where f.visitor = who and f.at > now() - interval '1 minute') >= 40 then
    return;
  end if;
  insert into public.site_filters (day, visitor, kind, value)
  select today, who, p_kind, v
  from (select distinct unnest(p_values[1:20]) as v) x
  where not exists (select 1 from public.site_filters f where f.visitor = who and f.day = today and f.kind = p_kind and f.value = x.v);
end;
$$;

revoke all on function public.record_site_enquiry(text, uuid, text, text, text) from public, anon, authenticated;
revoke all on function public.record_site_filter(text, text, text[]) from public, anon, authenticated;
grant execute on function public.record_site_enquiry(text, uuid, text, text, text) to service_role;
grant execute on function public.record_site_filter(text, text, text[]) to service_role;

-- ── For the team ────────────────────────────────────────────────────────

-- People with a page open in the last five minutes.
create function public.traffic_live()
returns integer
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_team() then
    raise exception 'Only the East Meets Wed team can see the traffic figures';
  end if;
  return (select count(distinct visitor) from public.page_views where at > now() - interval '5 minutes');
end;
$$;

revoke all on function public.traffic_live() from public, anon;
grant execute on function public.traffic_live() to authenticated;

-- The page views in a period that match the team's filters. A vendor filter keeps everything the
-- people who opened that vendor's page did that day.
create function public.traffic_rows(
  first_day date,
  last_day date,
  p_channel text,
  p_sites text[],
  p_campaign text,
  p_country text,
  p_region text,
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
    and (p_vendor is null or exists (
      select 1 from public.page_views w where w.visitor = pv.visitor and w.day = pv.day and w.vendor_id = p_vendor
    ));
$$;

create function public.traffic_enquiry_rows(
  first_day date,
  last_day date,
  p_channel text,
  p_sites text[],
  p_campaign text,
  p_country text,
  p_region text,
  p_vendor uuid
)
returns setof public.site_enquiries
language sql
stable
set search_path = ''
as $$
  select e.* from public.site_enquiries e
  where e.day between first_day and last_day
    and (p_channel is null or public.analytics_channel(e.referrer) = p_channel)
    and (p_sites is null or e.referrer = any (p_sites))
    and (p_campaign is null or e.campaign = p_campaign)
    and (p_country is null or e.country = p_country)
    and (p_region is null or e.region = p_region)
    and (p_vendor is null or e.vendor_id = p_vendor);
$$;

-- Only traffic_summary uses these, as the definer.
revoke all on function public.traffic_rows(date, date, text, text[], text, text, text, uuid) from public, anon, authenticated;
revoke all on function public.traffic_enquiry_rows(date, date, text, text[], text, text, text, uuid) from public, anon, authenticated;

drop function public.traffic_summary(date, date, date, date);

-- Everything Admin → Traffic shows, for a period and the one before, narrowed by the filters.
-- Team only, totals only.
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
  narrowed boolean := coalesce(p_channel, p_campaign, p_country, p_region, p_vendor) is not null or p_sites is not null;
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
    cur as (select * from public.traffic_rows(first_day, last_day, p_channel, p_sites, p_campaign, p_country, p_region, vendor)),
    pre as (select * from public.traffic_rows(prev_first, prev_last, p_channel, p_sites, p_campaign, p_country, p_region, vendor) where prev_first is not null),
    enq as (select * from public.traffic_enquiry_rows(first_day, last_day, p_channel, p_sites, p_campaign, p_country, p_region, vendor)),
    enq_pre as (select * from public.traffic_enquiry_rows(prev_first, prev_last, p_channel, p_sites, p_campaign, p_country, p_region, vendor) where prev_first is not null),
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
      select day, sum(visits) as visits, sum(views) as views, sum(listing_views) as listing_views, sum(enquiries) as enquiries from (
        select day, new_visit::int as visits, 1 as views, (vendor_id is not null)::int as listing_views, 0 as enquiries from cur
        union all
        select day, 0, 0, 0, 1 from enq
      ) x group by day
    ),
    daily_pre as (
      select day, sum(visits) as visits, sum(views) as views, sum(listing_views) as listing_views, sum(enquiries) as enquiries from (
        select day, new_visit::int as visits, 1 as views, (vendor_id is not null)::int as listing_views, 0 as enquiries from pre
        union all
        select day, 0, 0, 0, 1 from enq_pre
      ) x group by day
    ),
    per_vendor as (
      select coalesce(a.vendor_id, b.vendor_id) as vendor_id, coalesce(a.views, 0) as views, coalesce(a.visitors, 0) as visitors,
        coalesce(b.enquiries, 0) as enquiries, a.channel
      from (
        select vendor_id, count(*) as views, count(distinct (day, visitor)) as visitors,
          mode() within group (order by public.analytics_channel(referrer)) as channel
        from cur where vendor_id is not null group by vendor_id
      ) a
      full join (select vendor_id, count(*) as enquiries from enq group by vendor_id) b on b.vendor_id = a.vendor_id
    )
  select jsonb_build_object(
    'totals', jsonb_build_object(
      'visits', (select count(*) from cur where new_visit),
      'views', (select count(*) from cur),
      'listing_views', (select count(*) from cur where vendor_id is not null),
      'enquiries', (select count(*) from enq)
    ),
    'before', case when prev_first is null then null else jsonb_build_object(
      'visits', (select count(*) from pre where new_visit),
      'views', (select count(*) from pre),
      'listing_views', (select count(*) from pre where vendor_id is not null),
      'enquiries', (select count(*) from enq_pre)
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
        'slug', v.slug, 'name', v.name, 'views', t.views, 'visitors', t.visitors, 'enquiries', t.enquiries, 'channel', t.channel,
        'before', (select count(*) from pre where pre.vendor_id = t.vendor_id)
      ) order by t.views desc, t.enquiries desc, v.name)
      from per_vendor t join public.vendors v on v.id = t.vendor_id), '[]'),
    'places', coalesce((select jsonb_agg(jsonb_build_object('country', country, 'region', region, 'city', city, 'visits', visits) order by visits desc) from (
      select country, region, city, count(*) as visits from cur where new_visit group by country, region, city order by visits desc limit 300
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

revoke all on function public.traffic_summary(date, date, date, date, text, text[], text, text, text, text) from public, anon;
grant execute on function public.traffic_summary(date, date, date, date, text, text[], text, text, text, text) to authenticated;
