-- Locked content stays on the server until it is paid for.
--
-- Two leaks. (1) A chat photo went to the public chat-media bucket and its
-- URL travelled to the recipient, who was shown a CSS blur and a 10-credit
-- "reveal" button - the original was already in the page. (2) A locked mail
-- came down with its message_text in the row and a CSS blur on top.
--
-- Now:
--   * Chat photos are uploaded to a PRIVATE bucket, chat-photos, together with
--     a tiny preview (<path>.preview.jpg, ~16px wide, made by the sender's
--     browser). Any signed-in member can read a preview; the original is
--     readable only by the sender or by a member with a media_reveals row -
--     and reveal_media() writes that row only after the charge succeeds.
--   * Mail is read through list_mail_messages() and mail_thread_previews(),
--     which blank message_text and photo_urls on anything the reader has
--     not paid for. The bytes never leave the database.
--
-- Photos sent before today are public URLs and cannot be un-published; the
-- app shows them blurred and reveals them for free, since it is not
-- protecting anything.

-- ---------------------------------------------------------------------------
-- Private bucket for ordinary chat photos
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('chat-photos', 'chat-photos', false, 26214400, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = false;

create table if not exists public.media_reveals (
  message_id    uuid not null references public.mail_messages(id) on delete cascade,
  user_id       uuid not null references auth.users(id) on delete cascade,
  object_path   text not null,
  credits_spent integer not null default 0,
  created_at    timestamptz not null default now(),
  primary key (message_id, user_id)
);
create index if not exists media_reveals_path_idx on public.media_reveals (object_path, user_id);

alter table public.media_reveals enable row level security;
drop policy if exists "media reveals: read own" on public.media_reveals;
create policy "media reveals: read own" on public.media_reveals
  for select to authenticated using (user_id = auth.uid());
revoke all on public.media_reveals from anon, authenticated;
grant select on public.media_reveals to authenticated;
grant all on public.media_reveals to service_role;

drop policy if exists "chat photos upload own folder" on storage.objects;
create policy "chat photos upload own folder" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'chat-photos' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "chat photos delete own folder" on storage.objects;
create policy "chat photos delete own folder" on storage.objects
  for delete to authenticated
  using (bucket_id = 'chat-photos' and (storage.foldername(name))[1] = auth.uid()::text);

-- The sender sees their own; everyone signed in may see a preview; the
-- original needs a paid reveal.
drop policy if exists "chat photos read sender preview or revealed" on storage.objects;
create policy "chat photos read sender preview or revealed" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'chat-photos'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or name like '%.preview.jpg'
      or exists (
        select 1 from public.media_reveals r
        where r.object_path = objects.name and r.user_id = auth.uid()
      )
    )
  );

-- ---------------------------------------------------------------------------
-- reveal_media: charge, then record the entitlement the storage policy reads.
-- ---------------------------------------------------------------------------
create or replace function public.reveal_media(p_message_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_msg   public.mail_messages%rowtype;
  v_ok    boolean;
  v_spend jsonb;
  v_price integer;
begin
  if auth.uid() is null then
    return jsonb_build_object('success', false, 'error', 'not_signed_in');
  end if;

  select * into v_msg from public.mail_messages where id = p_message_id;
  if not found then
    return jsonb_build_object('success', false, 'error', 'not_found');
  end if;

  -- Only an ordinary chat photo: a 'Chat Message' whose text is a storage
  -- path in chat-photos. Mail bodies and exclusive photos have their own
  -- unlock and must never come out of here; old public-URL photos are not
  -- protected and are not charged for.
  if coalesce(v_msg.subject, '') <> 'Chat Message'
     or coalesce(v_msg.has_photos, false) is not true
     or coalesce(v_msg.is_exclusive, false)
     or coalesce(v_msg.unlock_cost, 0) <> 0
     or v_msg.message_text is null
     or v_msg.message_text like 'http%'
     or v_msg.message_text like 'data:%'
     or v_msg.message_text !~ '^[0-9a-f-]{36}/[^/]+\.(jpe?g|png|webp)$' then
    return jsonb_build_object('success', false, 'error', 'not_revealable');
  end if;

  if v_msg.sender_id = auth.uid() then
    return jsonb_build_object('success', true, 'charged', 0, 'already', true, 'path', v_msg.message_text);
  end if;

  select exists (
    select 1 from public.mail_threads t
    where t.id = v_msg.thread_id
      and (t.participant1_id = auth.uid() or t.participant2_id = auth.uid())
  ) into v_ok;
  if not v_ok then
    return jsonb_build_object('success', false, 'error', 'not_a_participant');
  end if;

  if exists (select 1 from public.media_reveals where message_id = p_message_id and user_id = auth.uid()) then
    return jsonb_build_object('success', true, 'charged', 0, 'already', true, 'path', v_msg.message_text);
  end if;

  select credits into v_price from public.app_action_prices where action = 'media_reveal';
  v_price := coalesce(v_price, 10);

  v_spend := public.spend_credits_for(auth.uid(), v_price, 'media_reveal', v_msg.thread_id::text);
  if coalesce((v_spend->>'success')::boolean, false) is not true then
    return jsonb_build_object('success', false,
      'error', coalesce(v_spend->>'error', 'spend_failed'),
      'total_credits', v_spend->'total_credits', 'price', v_price);
  end if;

  insert into public.media_reveals (message_id, user_id, object_path, credits_spent)
  values (p_message_id, auth.uid(), v_msg.message_text, coalesce((v_spend->>'charged')::integer, 0))
  on conflict do nothing;

  return jsonb_build_object('success', true,
    'charged', coalesce((v_spend->>'charged')::integer, 0),
    'total_credits', v_spend->'total_credits',
    'path', v_msg.message_text);
end;
$$;

revoke all on function public.reveal_media(uuid) from public, anon;
grant execute on function public.reveal_media(uuid) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Mail: the reader gets the words only after paying for them.
-- ---------------------------------------------------------------------------
create or replace function public.list_mail_messages(p_thread_id uuid)
returns setof jsonb
language sql
security definer
set search_path = public
stable
as $$
  with me as (select auth.uid() as id),
  t as (
    select * from public.mail_threads
    where id = p_thread_id
      and (participant1_id = (select id from me) or participant2_id = (select id from me))
  )
  select
    to_jsonb(m)
      - 'message_text' - 'photo_urls'
      || jsonb_build_object(
           'unlocked', v.unlocked,
           'message_text', case when v.unlocked then m.message_text else null end,
           'photo_urls',   case when v.unlocked then to_jsonb(m.photo_urls) else '[]'::jsonb end,
           'virtual_gifts', case when g.id is not null
                              then jsonb_build_object('id', g.id, 'name', g.name, 'icon', g.icon,
                                                      'image_url', g.image_url, 'credit_cost', g.credit_cost)
                              else null end
         )
  from public.mail_messages m
  cross join t
  left join public.virtual_gifts g on g.id = m.gift_id
  cross join lateral (
    select (coalesce(m.unlock_cost, 0) = 0
            or m.sender_id = (select id from me)
            or exists (select 1 from public.message_unlocks u
                       where u.message_id = m.id and u.user_id = (select id from me))) as unlocked
  ) v
  where m.thread_id = p_thread_id
    and coalesce(m.subject, '') <> 'Chat Message'
  order by m.created_at asc;
$$;

revoke all on function public.list_mail_messages(uuid) from public, anon;
grant execute on function public.list_mail_messages(uuid) to authenticated, service_role;

create or replace function public.mail_thread_previews(p_thread_ids uuid[])
returns setof jsonb
language sql
security definer
set search_path = public
stable
as $$
  with me as (select auth.uid() as id),
  mine as (
    select id from public.mail_threads
    where id = any(p_thread_ids)
      and (participant1_id = (select id from me) or participant2_id = (select id from me))
  ),
  msgs as (
    select m.*,
           (coalesce(m.unlock_cost, 0) = 0
            or m.sender_id = (select id from me)
            or exists (select 1 from public.message_unlocks u
                       where u.message_id = m.id and u.user_id = (select id from me))) as unlocked
    from public.mail_messages m
    where m.thread_id in (select id from mine)
      and coalesce(m.subject, '') <> 'Chat Message'
  ),
  latest as (
    select distinct on (thread_id) thread_id, created_at, sender_id, unlock_cost, unlocked,
           case when unlocked then message_text else null end as message_text
    from msgs
    order by thread_id, created_at desc
  ),
  unread as (
    select thread_id, count(*) as unread_count
    from msgs where not coalesce(is_read, false) and sender_id <> (select id from me)
    group by thread_id
  )
  select jsonb_build_object(
    'thread_id', l.thread_id,
    'created_at', l.created_at,
    'sender_id', l.sender_id,
    'unlock_cost', l.unlock_cost,
    'unlocked', l.unlocked,
    'message_text', l.message_text,
    'unread_count', coalesce(u.unread_count, 0)
  )
  from latest l
  left join unread u on u.thread_id = l.thread_id;
$$;

revoke all on function public.mail_thread_previews(uuid[]) from public, anon;
grant execute on function public.mail_thread_previews(uuid[]) to authenticated, service_role;
