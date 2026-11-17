-- New Zealand joins the overseas regions (17 Nov 2026), so a couple can give it as their wedding's region.
-- Vendors' service areas are a free text[] and need no change.
alter table enquiries drop constraint enquiries_region;
alter table enquiries
  add constraint enquiries_region check (region in ('VIC', 'NSW', 'QLD', 'WA', 'SA', 'TAS', 'ACT', 'NT', 'NZ', 'ASIA', 'EUR', 'USA', 'CAN', 'Not decided'));
