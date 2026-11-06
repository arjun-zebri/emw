-- Which emails the platform sends, switched on and off by the team in Admin → Notifications.
-- One shared setting for the whole team. The send functions in lib/email read this with the
-- secret key; if a row is missing they fall back to the defaults in lib/email/config.ts.
-- "Confirm your email" isn't here: sign-up doesn't work without it, so it can't be turned off.

create table public.email_switches (
  id text primary key check (id in ('application-team', 'application-received', 'listing-live')),
  enabled boolean not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users on delete set null
);

create trigger email_switches_touch before update on public.email_switches
  for each row execute function public.touch_updated_at();

insert into public.email_switches (id, enabled) values
  ('application-team', true),
  ('application-received', true),
  -- Off until the client signs off its copy.
  ('listing-live', false);

alter table public.email_switches enable row level security;

create policy "Team sees the email switches" on public.email_switches
  for select to authenticated using ((select public.is_team()));
create policy "Owners change the email switches" on public.email_switches
  for update to authenticated using ((select public.is_team_owner())) with check ((select public.is_team_owner()));
