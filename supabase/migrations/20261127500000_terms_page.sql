-- Terms and conditions joins the pages the team writes in Admin → Pages. Until it has words, the
-- site shows the old placeholder at /terms-and-conditions, kept out of search.

alter table public.site_pages drop constraint site_pages_slug_check;
alter table public.site_pages add constraint site_pages_slug_check
  check (slug in ('about', 'shared-commitment', 'privacy-policy', 'terms-and-conditions'));

insert into public.site_pages (slug, title) values ('terms-and-conditions', 'Terms and conditions')
on conflict (slug) do nothing;
