-- East Meets Wed: the first schema. Vendors and their photos, journal posts, enquiries, and who can
-- sign in (the EMW team, and vendors who manage their own listing). Every table has row level
-- security on; the rules are at the end of each section.

-- ── Helpers ──────────────────────────────────────────────────────────────────────────────────────

create function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ── People ───────────────────────────────────────────────────────────────────────────────────────

create type public.team_role as enum ('owner', 'editor');

-- The East Meets Wed team. Owners can manage the team; editors run the site.
create table public.team_members (
  user_id uuid primary key references auth.users on delete cascade,
  role public.team_role not null default 'editor',
  name text,
  created_at timestamptz not null default now()
);

create type public.vendor_status as enum ('draft', 'published', 'hidden');

create table public.vendors (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  -- The slug on the old WordPress site, when it differs. Used for redirects.
  legacy_slug text unique,
  name text not null check (length(trim(name)) > 0),
  person text,
  -- "Discipline, Location" on the card, e.g. "Documentary photography".
  discipline text not null default '',
  -- Values from data/taxonomy.ts (services, state codes, languages).
  services text[] not null default '{}',
  based text,
  service_area text[] not null default '{}',
  travels text,
  languages text[] not null default '{}',
  lede text not null default '',
  quote text,
  story text[] not null default '{}',
  signoff text,
  email text,
  phone text,
  website text,
  instagram text,
  facebook text,
  youtube text,
  featured boolean not null default false,
  status public.vendor_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index vendors_status_idx on public.vendors (status);

create trigger vendors_touch before update on public.vendors
  for each row execute function public.touch_updated_at();

-- Which accounts manage which listing. One business per account for now.
create table public.vendor_members (
  vendor_id uuid not null references public.vendors on delete cascade,
  user_id uuid not null unique references auth.users on delete cascade,
  created_at timestamptz not null default now(),
  primary key (vendor_id, user_id)
);

create function public.is_team()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.team_members where user_id = auth.uid());
$$;

create function public.is_team_owner()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.team_members where user_id = auth.uid() and role = 'owner');
$$;

create function public.is_vendor_member(vendor uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.vendor_members where vendor_id = vendor and user_id = auth.uid());
$$;

-- A vendor can edit their own listing, but only the team publishes, features or renames it.
create function public.guard_vendor_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not public.is_team() and (
    new.status is distinct from old.status
    or new.featured is distinct from old.featured
    or new.slug is distinct from old.slug
    or new.legacy_slug is distinct from old.legacy_slug
  ) then
    raise exception 'Only the East Meets Wed team can change a listing''s status, feature or address';
  end if;
  return new;
end;
$$;

create trigger vendors_guard before update on public.vendors
  for each row execute function public.guard_vendor_update();

alter table public.team_members enable row level security;
alter table public.vendors enable row level security;
alter table public.vendor_members enable row level security;

create policy "Team members can see the team" on public.team_members
  for select to authenticated using ((select public.is_team()));
create policy "Owners manage the team" on public.team_members
  for all to authenticated using ((select public.is_team_owner())) with check ((select public.is_team_owner()));

create policy "Anyone can see published vendors" on public.vendors
  for select to anon, authenticated using (status = 'published');
create policy "Team sees every vendor" on public.vendors
  for select to authenticated using ((select public.is_team()));
create policy "Vendors see their own listing" on public.vendors
  for select to authenticated using ((select public.is_vendor_member(id)));
create policy "Team adds vendors" on public.vendors
  for insert to authenticated with check ((select public.is_team()));
create policy "Team and the vendor edit a listing" on public.vendors
  for update to authenticated
  using ((select public.is_team()) or (select public.is_vendor_member(id)))
  with check ((select public.is_team()) or (select public.is_vendor_member(id)));
create policy "Team removes vendors" on public.vendors
  for delete to authenticated using ((select public.is_team()));

create policy "Team manages vendor accounts" on public.vendor_members
  for all to authenticated using ((select public.is_team())) with check ((select public.is_team()));
create policy "Vendors see their own membership" on public.vendor_members
  for select to authenticated using (user_id = (select auth.uid()));

-- ── Photos ───────────────────────────────────────────────────────────────────────────────────────

-- Position 0 is the cover. Files live in the vendor-photos bucket under <vendor id>/.
create table public.vendor_photos (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references public.vendors on delete cascade,
  path text not null unique,
  width integer check (width > 0),
  height integer check (height > 0),
  alt text not null default '',
  position integer not null default 0,
  created_at timestamptz not null default now()
);

create index vendor_photos_vendor_idx on public.vendor_photos (vendor_id, position);

alter table public.vendor_photos enable row level security;

create policy "Anyone can see photos of published vendors" on public.vendor_photos
  for select to anon, authenticated
  using (exists (select 1 from public.vendors v where v.id = vendor_id and v.status = 'published'));
create policy "Team and the vendor manage photos" on public.vendor_photos
  for all to authenticated
  using ((select public.is_team()) or (select public.is_vendor_member(vendor_id)))
  with check ((select public.is_team()) or (select public.is_vendor_member(vendor_id)));

-- ── Journal ──────────────────────────────────────────────────────────────────────────────────────

create type public.post_status as enum ('draft', 'scheduled', 'published');

create table public.posts (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title text not null,
  standfirst text not null default '',
  category text not null check (category in ('Real weddings', 'Culture', 'Planning', 'Vendors')),
  -- A path in the journal bucket.
  cover_path text,
  cover_alt text not null default '',
  -- Blocks, as in data/journal.ts: paragraphs, headings and images.
  body jsonb not null default '[]' check (jsonb_typeof(body) = 'array'),
  description text not null default '',
  author text not null default '',
  status public.post_status not null default 'draft',
  -- The publish date, or the scheduled one.
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (status = 'draft' or published_at is not null)
);

create index posts_live_idx on public.posts (published_at desc) where status <> 'draft';

create trigger posts_touch before update on public.posts
  for each row execute function public.touch_updated_at();

-- Vendors credited in a story.
create table public.post_vendors (
  post_id uuid not null references public.posts on delete cascade,
  vendor_id uuid not null references public.vendors on delete cascade,
  position integer not null default 0,
  primary key (post_id, vendor_id)
);

create index post_vendors_vendor_idx on public.post_vendors (vendor_id);

alter table public.posts enable row level security;
alter table public.post_vendors enable row level security;

-- A scheduled post goes live by itself once its date passes.
create policy "Anyone can read live posts" on public.posts
  for select to anon, authenticated
  using (status <> 'draft' and published_at <= now());
create policy "Team manages posts" on public.posts
  for all to authenticated using ((select public.is_team())) with check ((select public.is_team()));

create policy "Anyone can see credits on live posts" on public.post_vendors
  for select to anon, authenticated
  using (exists (select 1 from public.posts p where p.id = post_id and p.status <> 'draft' and p.published_at <= now()));
create policy "Team manages credits" on public.post_vendors
  for all to authenticated using ((select public.is_team())) with check ((select public.is_team()));

-- ── Enquiries ────────────────────────────────────────────────────────────────────────────────────

-- Couples write in from a vendor's page. The form posts through the server (with spam checks),
-- so the public can't write to this table directly.
create table public.enquiries (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references public.vendors on delete cascade,
  name text not null,
  email text not null,
  phone text,
  wedding_date date,
  message text not null,
  read_at timestamptz,
  replied_at timestamptz,
  created_at timestamptz not null default now()
);

create index enquiries_vendor_idx on public.enquiries (vendor_id, created_at desc);

alter table public.enquiries enable row level security;

create policy "Team sees every enquiry" on public.enquiries
  for all to authenticated using ((select public.is_team())) with check ((select public.is_team()));
create policy "Vendors see their enquiries" on public.enquiries
  for select to authenticated using ((select public.is_vendor_member(vendor_id)));
create policy "Vendors mark their enquiries read or replied" on public.enquiries
  for update to authenticated
  using ((select public.is_vendor_member(vendor_id)))
  with check ((select public.is_vendor_member(vendor_id)));

-- ── Table access ─────────────────────────────────────────────────────────────────────────────────
-- Explicit grants, so nothing depends on the project's "expose new tables" default. RLS decides
-- which rows each role actually reaches.

grant usage on schema public to anon, authenticated;
grant select on public.vendors, public.vendor_photos, public.posts, public.post_vendors to anon;
grant select, insert, update, delete on
  public.team_members, public.vendors, public.vendor_members, public.vendor_photos,
  public.posts, public.post_vendors, public.enquiries
  to authenticated;
grant execute on function public.is_team(), public.is_team_owner(), public.is_vendor_member(uuid) to anon, authenticated;

-- ── Sign-in ──────────────────────────────────────────────────────────────────────────────────────

-- Runs whenever Supabase issues a token. Adds who you are to it, so the site can route you to the
-- admin or your listing without another database call:
--   emw_role     'team' | 'vendor' (absent if neither)
--   vendor_slug  the listing a vendor manages
create function public.custom_access_token_hook(event jsonb)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  uid uuid := (event ->> 'user_id')::uuid;
  claims jsonb := coalesce(event -> 'claims', '{}');
  slug text;
begin
  claims := claims - 'emw_role' - 'vendor_slug';
  if exists (select 1 from public.team_members where user_id = uid) then
    claims := claims || jsonb_build_object('emw_role', 'team');
  else
    select v.slug into slug
      from public.vendor_members m join public.vendors v on v.id = m.vendor_id
      where m.user_id = uid;
    if slug is not null then
      claims := claims || jsonb_build_object('emw_role', 'vendor', 'vendor_slug', slug);
    end if;
  end if;
  return jsonb_set(event, '{claims}', claims);
end;
$$;

revoke execute on function public.custom_access_token_hook(jsonb) from public, anon, authenticated;
grant execute on function public.custom_access_token_hook(jsonb) to supabase_auth_admin;

-- ── Image storage ────────────────────────────────────────────────────────────────────────────────
-- Both buckets are public to read (they're the site's photography). Writes need the team, or for
-- vendor photos, the vendor whose id is the first folder in the path.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('vendor-photos', 'vendor-photos', true, 15728640, array['image/jpeg', 'image/png', 'image/webp', 'image/avif']),
  ('journal', 'journal', true, 15728640, array['image/jpeg', 'image/png', 'image/webp', 'image/avif']);

create function public.can_write_vendor_photo(object_name text)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  folder text := (storage.foldername(object_name))[1];
begin
  if public.is_team() then
    return true;
  end if;
  if folder !~ '^[0-9a-f-]{36}$' then
    return false;
  end if;
  return public.is_vendor_member(folder::uuid);
end;
$$;

grant execute on function public.can_write_vendor_photo(text) to authenticated;

create policy "Team and vendors see their photo files" on storage.objects
  for select to authenticated
  using (bucket_id = 'vendor-photos' and (select public.can_write_vendor_photo(name)));
create policy "Team and vendors upload photo files" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'vendor-photos' and (select public.can_write_vendor_photo(name)));
create policy "Team and vendors replace photo files" on storage.objects
  for update to authenticated
  using (bucket_id = 'vendor-photos' and (select public.can_write_vendor_photo(name)));
create policy "Team and vendors remove photo files" on storage.objects
  for delete to authenticated
  using (bucket_id = 'vendor-photos' and (select public.can_write_vendor_photo(name)));

create policy "Team manages journal images" on storage.objects
  for all to authenticated
  using (bucket_id = 'journal' and (select public.is_team()))
  with check (bucket_id = 'journal' and (select public.is_team()));
