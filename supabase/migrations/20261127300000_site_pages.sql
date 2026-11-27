-- The site's own pages that the team writes in Admin → Pages: About, Shared commitment and the
-- Privacy policy. One row each, kept by its address; written like a journal post (title, a line
-- or two beneath it, an optional cover, the body as blocks) and live as soon as it's saved. A page
-- with nothing in its body stays off the site: /about falls back to the About section of the home
-- page, the privacy policy to the old site's text, and Shared commitment isn't linked anywhere.
-- Photos go in the journal bucket under pages/<slug>/.

create table public.site_pages (
  slug text primary key check (slug in ('about', 'shared-commitment', 'privacy-policy')),
  title text not null default '',
  standfirst text not null default '',
  cover_path text,
  cover_alt text not null default '',
  cover_width integer,
  cover_height integer,
  body jsonb not null default '[]' check (jsonb_typeof(body) = 'array'),
  description text not null default '',
  updated_at timestamptz not null default now()
);

create trigger site_pages_touch before update on public.site_pages
  for each row execute function public.touch_updated_at();

alter table public.site_pages enable row level security;

-- Anyone may read them: an empty page simply isn't shown.
create policy "Anyone can read the site pages" on public.site_pages
  for select to anon, authenticated using (true);
-- The three pages are fixed: the team edits them, nobody adds or removes one.
create policy "Team edits the site pages" on public.site_pages
  for update to authenticated using ((select public.is_team())) with check ((select public.is_team()));

grant select on public.site_pages to anon, authenticated;
grant update on public.site_pages to authenticated;

insert into public.site_pages (slug, title) values
  ('about', 'About'),
  ('shared-commitment', 'Our shared commitment'),
  ('privacy-policy', 'Privacy policy')
on conflict (slug) do nothing;
