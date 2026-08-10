-- Profile photos have been stored as base64-encoded data URLs directly in
-- the user_photos.photo_url column since this feature was built — never
-- uploaded to actual object storage. This inflates payload size by ~33%
-- over the original file, embeds full (often multi-megabyte, uncompressed
-- phone-camera-resolution) images directly into every query response that
-- touches a profile row, and makes browser image caching impossible since
-- there's no stable, cacheable URL — every fetch re-downloads the entire
-- image. On a page like Discovery's grid, showing many profiles at once,
-- this means the LIST query itself carries megabytes of inline image data
-- before a single pixel renders.
--
-- This bucket is for NEW uploads going forward. Existing base64 photos are
-- left as-is here — migrating them requires decoding and re-uploading each
-- one server-side, a separate, more involved piece of work.

insert into storage.buckets (id, name, public)
values ('profile-photos', 'profile-photos', true)
on conflict (id) do nothing;

drop policy if exists "profile photos upload own folder" on storage.objects;
create policy "profile photos upload own folder" on storage.objects for insert to authenticated
  with check (bucket_id = 'profile-photos' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "profile photos read" on storage.objects;
create policy "profile photos read" on storage.objects for select to public
  using (bucket_id = 'profile-photos');

drop policy if exists "profile photos update own" on storage.objects;
create policy "profile photos update own" on storage.objects for update to authenticated
  using (bucket_id = 'profile-photos' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "profile photos delete own" on storage.objects;
create policy "profile photos delete own" on storage.objects for delete to authenticated
  using (bucket_id = 'profile-photos' and (storage.foldername(name))[1] = auth.uid()::text);
