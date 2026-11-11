-- The team chooses which vendors get a double-width tile in the directory (Admin → Approvals),
-- instead of the site picking landscape covers on its own. Like featuring, only the team can set it.

alter table public.vendors add column large_tile boolean not null default false;

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
    or new.slug is distinct from old.slug
    or new.legacy_slug is distinct from old.legacy_slug
  ) then
    raise exception 'Only the East Meets Wed team can change a listing''s status, feature, tile or address';
  end if;
  return new;
end;
$$;
