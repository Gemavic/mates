-- Retire the public chat-media bucket.
--
-- Chat photos sent before 20260908000012 went to the PUBLIC chat-media bucket,
-- and their URLs are in mail_messages.message_text. Anyone holding one of
-- those URLs could fetch the photo without signing in, for ever. That is the
-- last of the "locked content shipped before payment" family.
--
-- The objects themselves were copied, byte for byte and at the same path,
-- into the private chat-photos bucket with the Storage API (a copy is not
-- something SQL can do). This file does the rest:
--
--   1. rewrite each such message to the private path, so the app treats it
--      as any other private chat photo;
--   2. give the recipient a free media_reveals row, so nothing that was
--      already visible to them becomes something they must pay to see again;
--   3. make chat-media private, so the old public URLs stop resolving.
--
-- The originals are left in chat-media (now private, owner-only) for the
-- owner to empty from the dashboard; deleting members' files is their call.

with legacy as (
  select m.id, m.thread_id, m.sender_id,
         regexp_replace(m.message_text, '^https?://[^/]+/storage/v1/object/public/chat-media/', '') as path
  from public.mail_messages m
  where m.subject = 'Chat Message'
    and coalesce(m.has_photos, false)
    and m.message_text ~ '^https?://[^/]+/storage/v1/object/public/chat-media/[0-9a-f-]{36}/[^/]+\.(jpe?g|png|webp)$'
),
movable as (
  select l.* from legacy l
  where exists (select 1 from storage.objects o where o.bucket_id = 'chat-photos' and o.name = l.path)
),
rewritten as (
  update public.mail_messages m
  set message_text = mv.path
  from movable mv
  where m.id = mv.id
  returning m.id, m.thread_id, m.sender_id, m.message_text as path
)
insert into public.media_reveals (message_id, user_id, object_path, credits_spent)
select r.id,
       case when t.participant1_id = r.sender_id then t.participant2_id else t.participant1_id end,
       r.path, 0
from rewritten r
join public.mail_threads t on t.id = r.thread_id
on conflict do nothing;

update storage.buckets set public = false where id = 'chat-media';
