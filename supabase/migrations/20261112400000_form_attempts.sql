-- One throttle for every public form, in place of enquiry_attempts: a row per attempt, keyed by a
-- hash of who made it (their IP, or the email address a link goes to), so the server can refuse a
-- flood (lib/throttle.ts). No policies and no grants: only the secret key reaches it. Rows older
-- than a day are deleted as new ones arrive. Applies after 20261112300000_enquiry_form_11nov.sql.
-- The old rows are only a throttle's memory, so nothing is lost by dropping them.

create table public.form_attempts (
  kind text not null check (kind in ('enquiry', 'account', 'confirm-email', 'password-link')),
  key_hash text not null,
  created_at timestamptz not null default now()
);
create index form_attempts_idx on public.form_attempts (kind, key_hash, created_at desc);
create index form_attempts_age_idx on public.form_attempts (created_at);
alter table public.form_attempts enable row level security;
revoke all on public.form_attempts from anon, authenticated;

drop table public.enquiry_attempts;
