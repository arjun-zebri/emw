-- Vendors apply from an account: email and password (confirmed by our own email, sent through
-- Resend), or Google or Microsoft. Supabase itself sends no email, so the only way to make an
-- email-and-password account is through the website's server, which marks it with
-- app_metadata.emw_via. The hook below turns away every other email sign-up before the account
-- exists (and so before Supabase could send its own confirmation). Google and Microsoft sign-ups
-- are let through: the provider has already checked the address.
--
-- After applying, switch the hook on: Authentication → Hooks → Before user created →
-- Postgres function public.before_user_created.

-- Which account sent an application, for the team (and later, to hand them the listing).
alter table public.vendor_review_notes
  add column applicant_id uuid references auth.users on delete set null;

create index vendor_review_notes_applicant_idx on public.vendor_review_notes (applicant_id)
  where applicant_id is not null;

create function public.before_user_created(event jsonb)
returns jsonb
language plpgsql
stable
set search_path = ''
as $$
declare
  app jsonb := coalesce(event -> 'user' -> 'app_metadata', '{}');
begin
  if coalesce(app ->> 'provider', 'email') = 'email' and not (app ? 'emw_via') then
    return jsonb_build_object('error', jsonb_build_object(
      'http_code', 403,
      'message', 'Accounts are made through the East Meets Wed website.'
    ));
  end if;
  return '{}'::jsonb;
end;
$$;

revoke execute on function public.before_user_created(jsonb) from public, anon, authenticated;
grant execute on function public.before_user_created(jsonb) to supabase_auth_admin;
