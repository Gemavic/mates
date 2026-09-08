-- The SELECT policies on chat-media, feed-media, user-uploads and
-- profile-photos were granted to `public`, i.e. to anonymous callers. On a
-- public bucket the object URL itself needs no policy at all, so the only
-- thing these policies enabled was LISTING: anyone, signed out, could
-- enumerate every chat photo, feed image and profile photo on the site and
-- then fetch them in bulk.
--
-- Public URLs keep working exactly as before (rows already store them).
-- Listing now requires a signed-in member, and chat-media listing is
-- restricted to the member's own folder - the only reason to list it.

drop policy if exists "chat media read" on storage.objects;
create policy "chat media read own" on storage.objects
  for select to authenticated
  using (bucket_id = 'chat-media' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "feed media read" on storage.objects;
create policy "feed media read" on storage.objects
  for select to authenticated
  using (bucket_id = 'feed-media');

drop policy if exists "Anyone can view uploaded files" on storage.objects;
create policy "user uploads read own" on storage.objects
  for select to authenticated
  using (bucket_id = 'user-uploads' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "profile photos read" on storage.objects;
drop policy if exists "Public profile photos are viewable by direct URL" on storage.objects;
create policy "profile photos read" on storage.objects
  for select to authenticated
  using (bucket_id = 'profile-photos');
