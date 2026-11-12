-- Enquiries go live: the table holds everything the Enquire form asks, and remembers where the
-- email went. Couples never touch the table themselves: the site's server inserts with the secret
-- key after checking the form, so there's still no insert policy.

-- Couples write the date as they know it ("March 2027", "Spring next year"), so it's text. The
-- table is empty on both databases, so nothing is converted.
alter table public.enquiries alter column wedding_date type text using wedding_date::text;

alter table public.enquiries
  -- A message is optional: the date, venue and traditions often say enough.
  alter column message set default '',
  add column venue text,
  add column traditions text,
  add column guests text,
  -- Who the email went to: the listing's email, or the team when the listing has none. Null if it
  -- couldn't be sent (no Resend key, Resend refused, or switched off).
  add column emailed_to text,
  add constraint enquiries_lengths check (
    char_length(name) between 1 and 200
    and char_length(email) between 3 and 320
    and char_length(message) <= 5000
    and coalesce(char_length(phone), 0) <= 50
    and coalesce(char_length(wedding_date), 0) <= 100
    and coalesce(char_length(venue), 0) <= 300
    and coalesce(char_length(traditions), 0) <= 300
  ),
  -- "Not applicable" is a real answer (an engagement shoot has no guests), so it's stored as such.
  add constraint enquiries_guests check (guests in ('Under 80', '80–200', '200–400', '400+', 'Not applicable'));

-- Vendors may mark an enquiry read or replied, nothing else: what a couple wrote stays as written.
-- The team keeps full access (to delete spam).
revoke update on public.enquiries from authenticated;
grant update (read_at, replied_at) on public.enquiries to authenticated;

-- Throttle: one row per enquiry sent, keyed by a hash of the sender's IP, so the server can refuse
-- a flood. No policies and no grants: only the secret key reaches it. Rows older than a day are
-- deleted as new ones arrive.
create table public.enquiry_attempts (
  ip_hash text not null,
  created_at timestamptz not null default now()
);
create index enquiry_attempts_idx on public.enquiry_attempts (ip_hash, created_at desc);
alter table public.enquiry_attempts enable row level security;
revoke all on public.enquiry_attempts from anon, authenticated;

-- The email to the vendor can be switched off in Admin → Notifications like the others.
alter table public.email_switches drop constraint email_switches_id_check;
alter table public.email_switches add constraint email_switches_id_check
  check (id in ('application-team', 'application-received', 'listing-live', 'enquiry-vendor'));
insert into public.email_switches (id, enabled) values ('enquiry-vendor', true);
