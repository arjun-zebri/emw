-- Profile stats for vendors. Every listed vendor sees them during the launch year; later they move
-- into paid membership, so each vendor has a switch the team controls (Admin → Vendors).
-- Views are counted per vendor per day (Melbourne time). Visitors never touch the table: the
-- site's server records a view with the secret key, so there's no insert policy.

alter table public.vendors add column stats_enabled boolean not null default true;

create table public.vendor_views (
  vendor_id uuid not null references public.vendors on delete cascade,
  day date not null,
  views integer not null default 0 check (views >= 0),
  primary key (vendor_id, day)
);

alter table public.vendor_views enable row level security;

create policy "Team sees every vendor's views" on public.vendor_views
  for select to authenticated using (public.is_team());

-- A vendor sees their own views only while their stats are switched on.
create policy "Vendors see their own views" on public.vendor_views
  for select to authenticated using (
    public.is_vendor_member(vendor_id)
    and exists (select 1 from public.vendors v where v.id = vendor_id and v.stats_enabled)
  );

-- One view of a published listing, added to today's count. Server only.
create function public.record_vendor_view(vendor_slug text)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.vendor_views (vendor_id, day, views)
  select id, (now() at time zone 'Australia/Melbourne')::date, 1
  from public.vendors
  where slug = vendor_slug and status = 'published'
  on conflict (vendor_id, day) do update set views = public.vendor_views.views + 1;
$$;

revoke all on function public.record_vendor_view(text) from public, anon, authenticated;
grant execute on function public.record_vendor_view(text) to service_role;

-- Only the team switches stats on or off, as with the other placement switches.
create or replace function public.guard_vendor_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not public.is_team() and (
    new.status is distinct from old.status
    or new.featured is distinct from old.featured
    or new.large_tile is distinct from old.large_tile
    or new.stats_enabled is distinct from old.stats_enabled
    or new.slug is distinct from old.slug
    or new.legacy_slug is distinct from old.legacy_slug
  ) then
    raise exception 'Only the East Meets Wed team can change a listing''s status, feature, tile, stats or address';
  end if;
  return new;
end;
$$;
