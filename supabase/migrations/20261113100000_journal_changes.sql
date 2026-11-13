-- The blog is called the journal now and lives at /journal. Enquiries found through it record
-- 'journal', and each post's reads count from /journal/<slug>. Old rows move with it.
--
-- The team can make their own categories, so a post's category is any short name, not one of four.

update public.page_views set path = '/journal' || substr(path, 6) where path = '/blog' or path like '/blog/%';

alter table public.enquiries drop constraint enquiries_source;
update public.enquiries set source = 'journal' where source = 'blog';
alter table public.enquiries
  add constraint enquiries_source check (source in ('search', 'directory', 'home', 'journal', 'listing', 'site', 'elsewhere', 'direct'));

create or replace function public.post_reads()
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
    select substr(v.path, 10) as slug,
      count(*) as views,
      count(*) filter (where v.day > (now() at time zone 'Australia/Melbourne')::date - 30) as last_30
    from public.page_views v
    where v.path like '/journal/_%' and position('/' in substr(v.path, 10)) = 0
    group by 1;
end;
$$;

alter table public.posts drop constraint posts_category_check;
alter table public.posts add constraint posts_category_check check (char_length(category) between 1 and 40);
