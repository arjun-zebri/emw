-- The journal moves to the database: the admin writes and publishes posts, the public blog reads
-- them. Applies after 20261105000000_foundations.sql, which made posts and post_vendors.
--
-- A draft saves straight into its post. A post that is live (or scheduled) saves into post_edits
-- instead, so a half-made change never reaches couples; "Publish changes" copies it across.

-- The cover's size, so pages can hold its shape while it loads and never crop it.
alter table public.posts
  add column cover_width integer check (cover_width > 0),
  add column cover_height integer check (cover_height > 0),
  -- Addresses the post had before, so an old link still finds it.
  add column old_slugs text[] not null default '{}';

-- Unpublished changes to a live or scheduled post: the whole post as the editor holds it.
create table public.post_edits (
  post_id uuid primary key references public.posts on delete cascade,
  data jsonb not null check (jsonb_typeof(data) = 'object'),
  updated_at timestamptz not null default now()
);

create trigger post_edits_touch before update on public.post_edits
  for each row execute function public.touch_updated_at();

alter table public.post_edits enable row level security;
revoke all on public.post_edits from anon;
create policy "Team manages post edits" on public.post_edits
  for all to authenticated using ((select public.is_team())) with check ((select public.is_team()));

-- When the next scheduled post goes live: only the time, never the post. The public blog uses it
-- to refresh its cache at that moment rather than up to an hour later.
create function public.next_post_at()
returns timestamptz
language sql
stable
security definer
set search_path = ''
as $$
  select min(published_at) from public.posts where status <> 'draft' and published_at > now();
$$;

revoke all on function public.next_post_at() from public;
grant execute on function public.next_post_at() to anon, authenticated;

-- Views of each post's page, counted by the site's own analytics (page_views). Team only.
create function public.post_reads()
returns table (slug text, views bigint, last_30 bigint)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_team() then
    raise exception 'Team only' using errcode = '42501';
  end if;
  return query
    select substr(v.path, 7) as slug,
      count(*) as views,
      count(*) filter (where v.day > (now() at time zone 'Australia/Melbourne')::date - 30) as last_30
    from public.page_views v
    where v.path like '/blog/_%' and position('/' in substr(v.path, 7)) = 0
    group by 1;
end;
$$;

revoke all on function public.post_reads() from public;
grant execute on function public.post_reads() to authenticated;
