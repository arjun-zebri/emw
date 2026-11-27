-- Two private questions at the end of an application, so NT and Mona can get to know who is joining
-- (11 Nov feedback, 26 Nov 2026). Never shown on a listing: they live with the review notes, which
-- only the team can read.

alter table public.vendor_review_notes
  add column cultural_moment text check (char_length(cultural_moment) <= 1200),
  add column why_emw text check (char_length(why_emw) <= 1200);
