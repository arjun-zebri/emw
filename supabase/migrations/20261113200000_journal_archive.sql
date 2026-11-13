-- Archived journal posts: off the site and out of the main list, kept so they can come back.
-- An archived post is always a draft underneath, so the public policies (status <> 'draft') never
-- show it; restoring it brings it back as a draft.

alter table public.posts
  add column archived_at timestamptz,
  add constraint posts_archived_is_draft check (archived_at is null or status = 'draft');
