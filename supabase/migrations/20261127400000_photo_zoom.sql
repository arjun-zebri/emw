-- How far the cover is zoomed into its crop, as a percentage (100 = no zoom, up to 300), around the
-- point in focus_x / focus_y. Lets the team crop in close on a cover whose shape already matches its
-- frame, where moving the point alone does little. Empty means no zoom.

alter table public.vendor_photos
  add column focus_zoom smallint check (focus_zoom between 100 and 300),
  add constraint vendor_photos_zoom_needs_focus check (focus_zoom is null or focus_x is not null);

drop trigger vendor_photos_track_moved on public.vendor_photos;
create trigger vendor_photos_track_moved after update on public.vendor_photos
  for each row when ((old.position, old.focus_x, old.focus_y, old.focus_zoom) is distinct from (new.position, new.focus_x, new.focus_y, new.focus_zoom))
  execute function public.track_vendor_photo_change();
