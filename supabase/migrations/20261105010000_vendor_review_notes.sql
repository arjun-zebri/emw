-- What the team's research found about a vendor, for whoever approves the listing: how sure it is,
-- what to check, and which events they came to. Kept out of public.vendors because published
-- vendors are public to read, and these notes (and registered emails) are for the team only.

create type public.review_confidence as enum ('High', 'Medium', 'Low');

create table public.vendor_review_notes (
  vendor_id uuid primary key references public.vendors on delete cascade,
  -- High: website and/or Instagram found and confirmed. Medium: strong indirect evidence.
  -- Low: rests on the email address or business name alone.
  confidence public.review_confidence,
  -- The research spreadsheet's "Notes / To Check".
  notes text not null default '',
  -- East Meets Wed events they registered for, e.g. "2024, 2025".
  years_attended text,
  -- Categories as the research wrote them, before they were mapped onto ours.
  categories_original text,
  registered_emails text,
  -- Where the row came from, e.g. "Combined.xlsx, Supplier Directory row 12".
  source text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger vendor_review_notes_touch before update on public.vendor_review_notes
  for each row execute function public.touch_updated_at();

alter table public.vendor_review_notes enable row level security;

create policy "Team manages review notes" on public.vendor_review_notes
  for all to authenticated using ((select public.is_team())) with check ((select public.is_team()));
