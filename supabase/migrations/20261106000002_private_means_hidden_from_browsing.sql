-- "Private" hides a profile from browsing - not from people you already talk to.
--
-- Settings promises: "Your profile won't appear in Discovery for others to
-- find." But the database hid a private profile from EVERYONE, including
-- members who already had a conversation, a match or a call with that person,
-- so their name and photos vanished from those chats.
--
-- After this, a private profile (and its photos) stays visible only to its
-- owner and to members already in contact with it: a conversation, a match,
-- or a call between the two. Browsing, search and Near You still never show it.

create or replace function public.in_contact_with(p_other uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select auth.uid() is not null and p_other is not null and (
    exists (select 1 from public.mail_threads t
             where (t.participant1_id = auth.uid() and t.participant2_id = p_other)
                or (t.participant2_id = auth.uid() and t.participant1_id = p_other))
    or exists (select 1 from public.matches m
             where (m.user1_id = auth.uid() and m.user2_id = p_other)
                or (m.user2_id = auth.uid() and m.user1_id = p_other))
    or exists (select 1 from public.call_invites c
             where (c.caller_id = auth.uid() and c.callee_id = p_other)
                or (c.callee_id = auth.uid() and c.caller_id = p_other))
  );
$$;

revoke all on function public.in_contact_with(uuid) from public, anon;
grant execute on function public.in_contact_with(uuid) to authenticated;

alter policy "Users can view profiles" on public.user_profiles
  using (
    user_id = (select auth.uid())
    or ((profile_visibility = 'public') and (select public.can_see_members()))
    or public.in_contact_with(user_id)
  );

alter policy "View user photos" on public.user_photos
  using (
    user_id = (select auth.uid())
    or ((select public.can_see_members()) and exists (
          select 1 from public.user_profiles up
           where up.user_id = user_photos.user_id
             and (up.profile_visibility is null or up.profile_visibility = 'public')))
    or public.in_contact_with(user_photos.user_id)
  );

-- Check: should say "ok".
select case when exists (select 1 from pg_proc where proname = 'in_contact_with') then 'ok' else 'missing' end as result;
