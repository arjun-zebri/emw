-- The approval queue: a record of every decision, one function to make one, and a view the admin
-- pages page through, with what each draft is missing and what deserves a second look.

-- ── Decisions ────────────────────────────────────────────────────────────────────────────────────

create type public.vendor_verdict as enum ('approved', 'declined', 'reopened');

-- Every approval, decline and undo, oldest kept: who made it, when, and why. Nothing edits or
-- deletes a row; an undo is a new 'reopened' row.
create table public.vendor_decisions (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references public.vendors on delete cascade,
  verdict public.vendor_verdict not null,
  note text not null default '',
  decided_by uuid references public.team_members (user_id) on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);

create index vendor_decisions_vendor_idx on public.vendor_decisions (vendor_id, created_at desc);
create index vendor_decisions_recent_idx on public.vendor_decisions (created_at desc);

alter table public.vendor_decisions enable row level security;

create policy "Team sees decisions" on public.vendor_decisions
  for select to authenticated using ((select public.is_team()));
create policy "Team records decisions" on public.vendor_decisions
  for insert to authenticated with check ((select public.is_team()) and decided_by = (select auth.uid()));

-- Approve (publish), decline (hide) or reopen (back to draft), and record it, in one transaction.
-- Runs as the caller, so row level security and the vendor guard still apply.
create function public.decide_vendor(vendor uuid, verdict public.vendor_verdict, note text default '')
returns void
language plpgsql
set search_path = ''
as $$
begin
  if not public.is_team() then
    raise exception 'Only the East Meets Wed team can approve listings';
  end if;
  update public.vendors
    set status = case verdict when 'approved' then 'published'::public.vendor_status
                              when 'declined' then 'hidden'::public.vendor_status
                              else 'draft'::public.vendor_status end
    where id = vendor;
  if not found then
    raise exception 'No such vendor';
  end if;
  insert into public.vendor_decisions (vendor_id, verdict, note) values (vendor, verdict, coalesce(note, ''));
end;
$$;

-- ── The queue ────────────────────────────────────────────────────────────────────────────────────

-- One row per vendor with its cover, photo count and the research verdict, plus:
--   missing: what a listing needs before it can go live (no-photos, no-category, no-profile, no-contact)
--   flags:   worth a second look (small-photos, one-photo, low-confidence, website-down, interstate)
--   readiness: higher is closer to ready, for "most ready first"
-- security_invoker, so it shows each person only the vendors row level security lets them see.
create view public.vendor_queue with (security_invoker = true) as
with photos as (
  select vendor_id,
         count(*)::int as photo_count,
         (array_agg(path order by position))[1] as cover_path,
         min(greatest(width, height)) as smallest_long_edge
  from public.vendor_photos
  group by vendor_id
),
q as (
  select v.id, v.slug, v.name, v.discipline, v.status, v.created_at,
         coalesce(p.photo_count, 0) as photo_count,
         p.cover_path,
         n.confidence,
         array_remove(array[
           case when coalesce(p.photo_count, 0) = 0 then 'no-photos' end,
           case when v.discipline = '' or cardinality(v.services) = 0 then 'no-category' end,
           case when cardinality(v.story) = 0 then 'no-profile' end,
           case when v.email is null and v.phone is null and v.website is null then 'no-contact' end
         ], null) as missing,
         array_remove(array[
           case when p.smallest_long_edge < 1200 then 'small-photos' end,
           case when p.photo_count = 1 then 'one-photo' end,
           case when n.confidence = 'Low' then 'low-confidence' end,
           case when n.notes ~* '(did not resolve|not resolving|site (was|is|appears) (down|offline)|domain (has )?expired)' then 'website-down' end,
           case when n.notes ~* '(interstate|relocat|moved to (sydney|brisbane|perth|adelaide|hobart|canberra|darwin))' then 'interstate' end
         ], null) as flags
  from public.vendors v
  left join photos p on p.vendor_id = v.id
  left join public.vendor_review_notes n on n.vendor_id = v.id
)
select q.*,
       least(q.photo_count, 6) * 2
         + case q.confidence when 'High' then 3 when 'Medium' then 2 else 0 end
         - cardinality(q.flags)
         - cardinality(q.missing) * 10 as readiness
from q;
