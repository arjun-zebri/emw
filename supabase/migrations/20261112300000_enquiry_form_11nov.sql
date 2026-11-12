-- The Enquire form as NT set it out on 11 Nov: the wedding as a day (picked or typed DD/MM/YYYY),
-- the venue found by search or typed, guests as an approximate number, and the languages the
-- couple needs. Applies after 20261112200000_vendor_stats.sql. Earlier answers (a month, a guest
-- range) stay valid, so nothing already sent is touched.

alter table public.enquiries drop constraint enquiries_wedding_date;
alter table public.enquiries add constraint enquiries_wedding_date check (
  wedding_date ~ '^\d{4}-(0[1-9]|1[0-2])(-(0[1-9]|[12]\d|3[01]))?$' or wedding_date in ('Not decided', 'Not applicable')
);

alter table public.enquiries drop constraint enquiries_guests;
alter table public.enquiries add constraint enquiries_guests check (
  guests ~ '^[1-9]\d{0,4}$' or guests in ('Under 80', '80–200', '200–400', '400+', 'Not applicable')
);

-- In the couple's words, e.g. "Cantonese for the grandparents".
alter table public.enquiries
  add column languages text,
  add constraint enquiries_languages_length check (coalesce(char_length(languages), 0) <= 300);
