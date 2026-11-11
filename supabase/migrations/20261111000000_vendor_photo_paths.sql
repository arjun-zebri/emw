-- Vendors now add and remove their own photos from the portal. Storage already limits a vendor's
-- uploads to their own folder (<vendor id>/); this makes the photo records match, so a listing can
-- only ever show files from its own folder, never another vendor's. Every existing row already
-- does (checked on staging, 11 November 2026: 343 of 343).

alter table public.vendor_photos
  add constraint vendor_photos_path_in_own_folder check (starts_with(path, vendor_id::text || '/'));
