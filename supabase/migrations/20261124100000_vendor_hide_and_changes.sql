-- NT's feedback, 24 Nov 2026: the team can take a live listing off the site and put it back, and sees
-- at a glance which live vendors have changed their own listing since someone last checked it.

-- ── Hiding a live listing ────────────────────────────────────────────────────────────────────────

-- 'hidden' takes a published listing off the site; 'shown' puts it back. Recorded with who and when,
-- like an approval, and kept apart from 'declined' (a draft that never went live).
alter type public.vendor_verdict add value if not exists 'hidden';
alter type public.vendor_verdict add value if not exists 'shown';

create or replace function public.decide_vendor(vendor uuid, verdict public.vendor_verdict, note text default '')
returns void
language plpgsql
set search_path = ''
as $$
declare
  was public.vendor_status;
begin
  if not public.is_team() then
    raise exception 'Only the East Meets Wed team can approve listings';
  end if;
  select status into was from public.vendors where id = vendor;
  if not found then
    raise exception 'No such vendor';
  end if;
  if verdict::text = 'hidden' and was <> 'published' then
    raise exception 'Only a listing on the site can be hidden';
  end if;
  if verdict::text = 'shown' and was <> 'hidden' then
    raise exception 'Only a hidden listing can be put back';
  end if;
  update public.vendors
    set status = case verdict::text
                   when 'approved' then 'published'::public.vendor_status
                   when 'shown' then 'published'::public.vendor_status
                   when 'declined' then 'hidden'::public.vendor_status
                   when 'hidden' then 'hidden'::public.vendor_status
                   else 'draft'::public.vendor_status end
    where id = vendor;
  insert into public.vendor_decisions (vendor_id, verdict, note) values (vendor, verdict, coalesce(note, ''));
end;
$$;

-- ── Changes vendors make to their own live listing ───────────────────────────────────────────────

-- One row per vendor with unchecked changes: which parts (words, details, contact, photos) and when.
-- Written only by the triggers below, when a signed-in vendor (not the team, not a script) changes a
-- published listing. The team clears it with "Mark as checked".
create table public.vendor_changes (
  vendor_id uuid primary key references public.vendors on delete cascade,
  parts text[] not null default '{}',
  first_at timestamptz not null default now(),
  last_at timestamptz not null default now()
);

alter table public.vendor_changes enable row level security;

create policy "Team sees vendor changes" on public.vendor_changes
  for select to authenticated using ((select public.is_team()));
create policy "Team marks vendor changes checked" on public.vendor_changes
  for delete to authenticated using ((select public.is_team()));

create function public.note_vendor_change(vendor uuid, part text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or public.is_team() then
    return;
  end if;
  if not exists (select 1 from public.vendors where id = vendor and status = 'published') then
    return;
  end if;
  insert into public.vendor_changes as c (vendor_id, parts) values (vendor, array[part])
  on conflict (vendor_id) do update
    set parts = case when part = any (c.parts) then c.parts else c.parts || part end,
        last_at = now();
end;
$$;

revoke execute on function public.note_vendor_change(uuid, text) from public, anon, authenticated;

create function public.track_vendor_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (new.name, new.person, new.discipline, new.lede, new.story)
     is distinct from (old.name, old.person, old.discipline, old.lede, old.story) then
    perform public.note_vendor_change(new.id, 'words');
  end if;
  if (new.services, new.based, new.service_area, new.languages, new.travels)
     is distinct from (old.services, old.based, old.service_area, old.languages, old.travels) then
    perform public.note_vendor_change(new.id, 'details');
  end if;
  if (new.email, new.phone, new.website, new.instagram, new.facebook)
     is distinct from (old.email, old.phone, old.website, old.instagram, old.facebook) then
    perform public.note_vendor_change(new.id, 'contact');
  end if;
  return null;
end;
$$;

create trigger vendors_track_change after update on public.vendors
  for each row execute function public.track_vendor_change();

create function public.track_vendor_photo_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.note_vendor_change(coalesce(new.vendor_id, old.vendor_id), 'photos');
  return null;
end;
$$;

create trigger vendor_photos_track_added after insert on public.vendor_photos
  for each row execute function public.track_vendor_photo_change();
create trigger vendor_photos_track_removed after delete on public.vendor_photos
  for each row execute function public.track_vendor_photo_change();
create trigger vendor_photos_track_moved after update on public.vendor_photos
  for each row when (old.position is distinct from new.position)
  execute function public.track_vendor_photo_change();
