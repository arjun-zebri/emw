-- What the Enquire form asks, captured so it can be counted: cultures from a list, the wedding as
-- a month, where it is as a region, and how the couple found the vendor. Applies after
-- 20261112000000_enquiries_live.sql. Only test enquiries exist yet, so they're cleared rather than
-- converted.

delete from public.enquiries;

alter table public.enquiries
  -- From the cultures in data/taxonomy.ts; anything else they write goes in `traditions`.
  add column cultures text[] not null default '{}',
  -- An area code from data/taxonomy.ts (a state or an overseas region), or 'Not decided'.
  add column region text,
  -- How they reached the listing: search, directory, home, blog, listing, site, elsewhere, direct.
  add column source text,
  -- The search words, the directory filters, the page or the other site, when there is one.
  add column source_detail text,
  -- 'YYYY-MM', 'Not decided' or 'Not applicable'.
  add constraint enquiries_wedding_date check (wedding_date ~ '^\d{4}-(0[1-9]|1[0-2])$' or wedding_date in ('Not decided', 'Not applicable')),
  add constraint enquiries_region check (region in ('VIC', 'NSW', 'QLD', 'WA', 'SA', 'TAS', 'ACT', 'NT', 'CAN', 'USA', 'EUR', 'ASIA', 'Not decided')),
  add constraint enquiries_source check (source in ('search', 'directory', 'home', 'blog', 'listing', 'site', 'elsewhere', 'direct')),
  add constraint enquiries_more_lengths check (
    cardinality(cultures) <= 30 and coalesce(char_length(source_detail), 0) <= 300
  );

create index enquiries_created_idx on public.enquiries (created_at desc);
