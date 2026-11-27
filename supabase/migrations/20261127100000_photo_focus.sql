-- Where a photo is cropped around: the point (as a percentage across and down) that stays in view
-- when the cover is shown in a frame of another shape, in the directory or at the top of the page.
-- Set in the listing editor by the vendor or the team. It belongs
-- to the photo, so it follows the photo if it stops or starts being the cover. Empty until someone
-- sets it: each frame then keeps its own default crop.

alter table public.vendor_photos
  add column focus_x smallint check (focus_x between 0 and 100),
  add column focus_y smallint check (focus_y between 0 and 100),
  add constraint vendor_photos_focus_both check ((focus_x is null) = (focus_y is null));

-- A vendor moving the crop of a live listing is a change to their photos, for Admin → Vendors.
drop trigger vendor_photos_track_moved on public.vendor_photos;
create trigger vendor_photos_track_moved after update on public.vendor_photos
  for each row when ((old.position, old.focus_x, old.focus_y) is distinct from (new.position, new.focus_x, new.focus_y))
  execute function public.track_vendor_photo_change();
