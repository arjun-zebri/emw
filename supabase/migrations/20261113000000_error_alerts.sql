-- Error alerts (lib/observe): every failure the site reports lands here, grouped so one bug is one
-- issue however often it happens, and record_error decides in one locked step whether it's worth an
-- email, so many servers failing at once still send one alert. No policies and no grants: only the
-- secret key reaches these, and only the developer reads them (scripts/errors.mjs).
-- Nothing personal is stored: messages are scrubbed of emails, phone numbers and ids before they
-- arrive, and no request bodies, query strings or IPs are sent. Old rows are pruned by the first
-- error of each day, as the analytics are (there's no scheduler).
-- Applies after 20261112800000_traffic_map.sql.

-- ── Issues and occurrences ──────────────────────────────────────────────

create table public.error_issues (
  fingerprint text primary key,
  env text not null,
  source text not null check (source in ('server', 'client')),
  area text not null,
  severity text not null check (severity in ('urgent', 'normal')),
  title text not null,
  route text,
  sample_stack text,
  first_seen timestamptz not null default now(),
  last_seen timestamptz not null default now(),
  count integer not null default 0,
  first_release text,
  last_release text,
  last_alerted_at timestamptz,
  alerts_sent integer not null default 0,
  resolved_at timestamptz
);
create index error_issues_open_idx on public.error_issues (last_seen desc) where resolved_at is null;
create index error_issues_alerted_idx on public.error_issues (last_alerted_at);

create table public.error_events (
  id bigint generated always as identity primary key,
  fingerprint text not null references public.error_issues on delete cascade,
  at timestamptz not null default now(),
  route text,
  method text,
  release text,
  digest text,
  browser text,
  context jsonb not null default '{}'
);
create index error_events_issue_idx on public.error_events (fingerprint, at desc);
create index error_events_age_idx on public.error_events (at);

-- One row: when the last storm summary went out, and when old rows were last pruned.
create table public.error_alert_state (
  id boolean primary key default true check (id),
  storm_at timestamptz,
  pruned_on date
);
insert into public.error_alert_state default values;

alter table public.error_issues enable row level security;
alter table public.error_events enable row level security;
alter table public.error_alert_state enable row level security;
revoke all on public.error_issues, public.error_events, public.error_alert_state from anon, authenticated;

-- ── record_error ────────────────────────────────────────────────────────
-- Counts the occurrence and answers why to email, or null for no email:
--   new        the first time this issue is seen
--   regressed  back after it was marked resolved, or after a week without it
--   ongoing    still happening: again after 1 hour, then 6 hours, then once a day
--   storm      more than ten issues alerted in ten minutes: one summary instead, at most every
--              30 minutes. The issues held back stay unalerted, so they alert once it calms.
-- The issue row is locked while deciding, so simultaneous reports can't both send.

create function public.record_error(
  p_fingerprint text,
  p_env text,
  p_source text,
  p_area text,
  p_severity text,
  p_title text,
  p_route text,
  p_stack text,
  p_release text,
  p_method text,
  p_digest text,
  p_browser text,
  p_context jsonb
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.error_issues;
  v_reason text;
  v_recent integer;
begin
  -- Housekeeping, once a day.
  update public.error_alert_state set pruned_on = current_date where pruned_on is distinct from current_date;
  if found then
    delete from public.error_events where at < now() - interval '30 days';
    delete from public.error_issues where resolved_at < now() - interval '90 days' and last_seen < now() - interval '90 days';
  end if;

  insert into public.error_issues (fingerprint, env, source, area, severity, title, route, sample_stack, first_release)
  values (p_fingerprint, p_env, p_source, p_area, p_severity, left(p_title, 300), left(p_route, 200), left(p_stack, 4000), left(p_release, 40))
  on conflict (fingerprint) do nothing;

  select * into v from public.error_issues where fingerprint = p_fingerprint for update;

  if v.alerts_sent = 0 then
    v_reason := 'new';
  elsif v.resolved_at is not null or v.last_seen < now() - interval '7 days' then
    v_reason := 'regressed';
  elsif v.last_alerted_at < now() - case v.alerts_sent when 1 then interval '1 hour' when 2 then interval '6 hours' else interval '1 day' end then
    v_reason := 'ongoing';
  end if;

  if v_reason is not null then
    select count(*) into v_recent from public.error_issues
    where last_alerted_at > now() - interval '10 minutes' and fingerprint <> p_fingerprint;
    if v_recent >= 10 then
      update public.error_alert_state set storm_at = now() where storm_at is null or storm_at < now() - interval '30 minutes';
      v_reason := case when found then 'storm' end;
    end if;
  end if;

  update public.error_issues set
    count = count + 1,
    last_seen = now(),
    title = left(p_title, 300),
    severity = case when p_severity = 'urgent' then 'urgent' else severity end,
    route = coalesce(route, left(p_route, 200)),
    sample_stack = coalesce(left(p_stack, 4000), sample_stack),
    last_release = coalesce(left(p_release, 40), last_release),
    last_alerted_at = case when v_reason in ('new', 'regressed', 'ongoing') then now() else last_alerted_at end,
    alerts_sent = case v_reason when 'regressed' then 1 when 'new' then 1 when 'ongoing' then alerts_sent + 1 else alerts_sent end,
    resolved_at = case when v_reason = 'regressed' then null else resolved_at end
  where fingerprint = p_fingerprint
  returning * into v;

  -- Enough occurrences to see the pattern, without a loop filling the table.
  if (select count(*) from public.error_events where fingerprint = p_fingerprint and at > now() - interval '1 hour') < 20 then
    insert into public.error_events (fingerprint, route, method, release, digest, browser, context)
    values (p_fingerprint, left(p_route, 200), left(p_method, 10), left(p_release, 40), left(p_digest, 100), left(p_browser, 60), coalesce(p_context, '{}'));
  end if;

  if v_reason is null then
    return null;
  end if;
  return jsonb_build_object(
    'reason', v_reason,
    'count', v.count,
    'first_seen', v.first_seen,
    'first_release', v.first_release,
    'severity', v.severity
  );
end;
$$;

revoke all on function public.record_error(text, text, text, text, text, text, text, text, text, text, text, text, jsonb) from public, anon, authenticated;
grant execute on function public.record_error(text, text, text, text, text, text, text, text, text, text, text, text, jsonb) to service_role;

-- ── Throttle for browser error reports ──────────────────────────────────

alter table public.form_attempts drop constraint form_attempts_kind_check;
alter table public.form_attempts add constraint form_attempts_kind_check
  check (kind in ('enquiry', 'account', 'confirm-email', 'password-link', 'client-error'));
