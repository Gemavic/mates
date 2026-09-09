-- Account deletion with care.
--
-- Until now "Delete my account" removed the auth user at once, and the
-- cascade took with it the reports filed AGAINST the member, their
-- moderation record, their payment ledger, and every message they had sent
-- - out of the other person's conversation too. A member who had just
-- defrauded someone could erase the complaint, the evidence and the payment
-- trail with one tap.
--
-- From now on deletion is a request with a fourteen-day cooling period:
--
--   1. The member asks. Their profile is hidden and they can no longer
--      message, call, like or post (restrictive RLS policies below, plus a
--      gate in the app). They can change their mind at any point.
--   2. If anything is open on the account - a report against them, a
--      dispute, a payment still settling, a moderation review, or a hold a
--      staff member placed - the request is HELD and staff see it with the
--      reason. A held request does not run until an admin releases it.
--   3. Fourteen days after an unheld request, retire_account() runs: it
--      writes a retention record (who this was, how to reach them, what
--      they paid, what was reported), scrubs everything personal, and
--      anonymises the sign-in. The auth row itself is kept, banned and
--      nameless, so that every message, ledger line, report and call record
--      keeps its foreign keys; the other party to a conversation still has
--      the whole conversation, labelled "Deleted member".
--   4. Seven years later the row is purged for good, cascade and all.
--
-- Retained records are readable only through lawful_access_lookup(), which
-- requires an admin, a written reason, and writes an access log line.
-- Nobody browses them.

-- ===========================================================================
-- 1. Requests
-- ===========================================================================
create table if not exists public.account_deletion_requests (
  user_id          uuid primary key references auth.users(id) on delete cascade,
  status           text not null default 'pending'
                   check (status in ('pending', 'held', 'cancelled', 'completed')),
  requested_at     timestamptz not null default now(),
  due_at           timestamptz not null,
  prior_visibility text,
  hold_reason      text,
  held_by          uuid references auth.users(id) on delete set null,
  held_at          timestamptz,
  released_by      uuid references auth.users(id) on delete set null,
  released_at      timestamptz,
  release_note     text,
  cancelled_at     timestamptz,
  completed_at     timestamptz,
  updated_at       timestamptz not null default now()
);
alter table public.account_deletion_requests enable row level security;
revoke all on public.account_deletion_requests from anon, authenticated;
-- No policies: the browser reaches this table only through the functions below.

create index if not exists account_deletion_requests_due_idx
  on public.account_deletion_requests (due_at) where status = 'pending';

-- ===========================================================================
-- 2. Retained records and the access log
-- ===========================================================================
create table if not exists public.account_retention_records (
  user_id             uuid primary key,   -- deliberately no FK: outlives the row
  retired_at          timestamptz not null default now(),
  retain_until        timestamptz not null default now() + interval '7 years',
  account_created_at  timestamptz,
  last_sign_in_at     timestamptz,
  email               text,
  phone               text,
  verified_phone      text,
  full_name           text,
  first_name          text,
  date_of_birth       date,
  gender              text,
  location            text,
  verification_status text,
  phone_verified      boolean,
  verified_at         timestamptz,
  payments            jsonb,   -- [{status, count, usd}] from app_payment_intents
  credits_purchased   integer,
  reports_against     integer,
  reports_made        integer,
  moderation_actions  integer,
  deletion_requested_at timestamptz,
  deletion_hold_reason  text
);
alter table public.account_retention_records enable row level security;
revoke all on public.account_retention_records from anon, authenticated;

create table if not exists public.lawful_access_log (
  id          bigserial primary key,
  actor_id    uuid references auth.users(id) on delete set null,
  subject_id  uuid not null,
  reason      text not null,
  accessed_at timestamptz not null default now()
);
alter table public.lawful_access_log enable row level security;
revoke all on public.lawful_access_log from anon, authenticated;

-- ===========================================================================
-- 3. Helpers
-- ===========================================================================

-- True while the member may act: no pending or held deletion request.
create or replace function public.account_can_act()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select not exists (
    select 1 from public.account_deletion_requests r
    where r.user_id = auth.uid() and r.status in ('pending', 'held')
  );
$$;
revoke all on function public.account_can_act() from public, anon;
grant execute on function public.account_can_act() to authenticated;

-- A member who has asked to leave can read, but not add to, the site.
do $$
declare
  t text;
begin
  foreach t in array array['mail_messages','mail_threads','chat_messages','call_invites',
                           'user_likes','app_feed_posts','app_feed_comments','gift_transactions',
                           'app_payment_intents']
  loop
    if to_regclass('public.' || t) is not null then
      execute format('drop policy if exists "leaving members cannot add" on public.%I', t);
      execute format('create policy "leaving members cannot add" on public.%I as restrictive for insert to authenticated with check (public.account_can_act())', t);
    end if;
  end loop;
end $$;

-- What is open on an account. Returns null when nothing is.
create or replace function public.deletion_hold_reason_for(p_user uuid)
returns text
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_parts text[] := '{}';
  n int;
begin
  select count(*) into n from public.abuse_reports
    where reported_user_id = p_user and status in ('pending', 'under_review', 'escalated');
  if n > 0 then v_parts := v_parts || format('%s open report(s) against the member', n); end if;

  select count(*) into n from public.moderation_queue
    where user_id = p_user and status in ('pending', 'in_review');
  if n > 0 then v_parts := v_parts || format('%s item(s) in the moderation queue', n); end if;

  select count(*) into n from public.app_dispute_submissions
    where user_id = p_user and status in ('open', 'in_review');
  if n > 0 then v_parts := v_parts || format('%s open dispute(s)', n); end if;

  select count(*) into n from public.app_payment_intents
    where user_id = p_user
      and status in ('pending', 'waiting', 'confirming', 'sending', 'partially_paid');
  if n > 0 then v_parts := v_parts || format('%s payment(s) still settling', n); end if;

  select count(*) into n from public.moderation_actions
    where target_user_id = p_user
      and action_type in ('temporary_ban', 'permanent_ban', 'account_suspension', 'manual_review')
      and (expires_at is null or expires_at > now());
  if n > 0 then v_parts := v_parts || format('%s active moderation action(s)', n); end if;

  if array_length(v_parts, 1) is null then return null; end if;
  return array_to_string(v_parts, '; ');
end;
$$;
revoke all on function public.deletion_hold_reason_for(uuid) from public, anon, authenticated;

-- ===========================================================================
-- 4. The member's side
-- ===========================================================================
create or replace function public.request_account_deletion()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me     uuid := auth.uid();
  v_staff  boolean;
  v_vis    text;
  v_reason text;
  v_row    public.account_deletion_requests%rowtype;
begin
  if v_me is null then
    return jsonb_build_object('success', false, 'error', 'not_signed_in');
  end if;
  select coalesce(is_staff, false) or coalesce(is_admin, false) into v_staff
    from public.app_credit_accounts where user_id = v_me;
  if coalesce(v_staff, false) then
    return jsonb_build_object('success', false, 'error', 'staff_account');
  end if;

  select profile_visibility into v_vis from public.user_profiles where user_id = v_me;
  v_reason := public.deletion_hold_reason_for(v_me);

  insert into public.account_deletion_requests as r
    (user_id, status, requested_at, due_at, prior_visibility, hold_reason, held_at)
  values
    (v_me, case when v_reason is null then 'pending' else 'held' end,
     now(), now() + interval '14 days', v_vis, v_reason,
     case when v_reason is null then null else now() end)
  on conflict (user_id) do update
    set status       = excluded.status,
        requested_at = excluded.requested_at,
        due_at       = excluded.due_at,
        prior_visibility = excluded.prior_visibility,
        hold_reason  = excluded.hold_reason,
        held_at      = excluded.held_at,
        held_by      = null, released_by = null, released_at = null, release_note = null,
        cancelled_at = null, completed_at = null,
        updated_at   = now()
    where r.status in ('cancelled')   -- a completed row never comes back
  returning * into v_row;

  if v_row.user_id is null then
    select * into v_row from public.account_deletion_requests where user_id = v_me;
    return jsonb_build_object('success', true, 'already', true, 'status', v_row.status,
                              'due_at', v_row.due_at, 'held', v_row.status = 'held');
  end if;

  -- Out of Discovery at once; calls and messages are stopped by policy.
  update public.user_profiles
     set profile_visibility = 'private', is_online = false, updated_at = now()
   where user_id = v_me;
  delete from public.push_subscriptions where user_id = v_me;

  return jsonb_build_object('success', true, 'status', v_row.status, 'due_at', v_row.due_at,
                            'held', v_row.status = 'held');
end;
$$;
revoke all on function public.request_account_deletion() from public, anon;
grant execute on function public.request_account_deletion() to authenticated;

create or replace function public.cancel_account_deletion()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me  uuid := auth.uid();
  v_row public.account_deletion_requests%rowtype;
begin
  if v_me is null then
    return jsonb_build_object('success', false, 'error', 'not_signed_in');
  end if;
  update public.account_deletion_requests
     set status = 'cancelled', cancelled_at = now(), updated_at = now()
   where user_id = v_me and status in ('pending', 'held')
  returning * into v_row;
  if v_row.user_id is null then
    return jsonb_build_object('success', false, 'error', 'no_request');
  end if;
  update public.user_profiles
     set profile_visibility = coalesce(v_row.prior_visibility, 'public'), updated_at = now()
   where user_id = v_me;
  return jsonb_build_object('success', true);
end;
$$;
revoke all on function public.cancel_account_deletion() from public, anon;
grant execute on function public.cancel_account_deletion() to authenticated;

create or replace function public.my_deletion_request()
returns jsonb
language sql
security definer
set search_path = public
stable
as $$
  select jsonb_build_object('status', status, 'requested_at', requested_at, 'due_at', due_at,
                            'held', status = 'held')
  from public.account_deletion_requests
  where user_id = auth.uid() and status in ('pending', 'held');
$$;
revoke all on function public.my_deletion_request() from public, anon;
grant execute on function public.my_deletion_request() to authenticated;

-- ===========================================================================
-- 5. Staff side (admins)
-- ===========================================================================
create or replace function public.deletion_requests_for_staff()
returns table (
  user_id uuid, status text, requested_at timestamptz, due_at timestamptz,
  hold_reason text, held_at timestamptz, released_at timestamptz, completed_at timestamptz,
  display_name text, email text, open_now text
)
language sql
security definer
set search_path = public
stable
as $$
  select r.user_id, r.status, r.requested_at, r.due_at, r.hold_reason, r.held_at, r.released_at, r.completed_at,
         coalesce(nullif(p.first_name, ''), nullif(p.full_name, ''), 'Member') as display_name,
         u.email,
         public.deletion_hold_reason_for(r.user_id) as open_now
  from public.account_deletion_requests r
  left join public.user_profiles p on p.user_id = r.user_id
  left join auth.users u on u.id = r.user_id
  where public.care_blog_can_edit()   -- is_admin on app_credit_accounts
    and r.status in ('pending', 'held')
     or (public.care_blog_can_edit() and r.status in ('cancelled', 'completed') and r.updated_at > now() - interval '90 days')
  order by case r.status when 'held' then 0 when 'pending' then 1 else 2 end, r.due_at;
$$;
revoke all on function public.deletion_requests_for_staff() from public, anon;
grant execute on function public.deletion_requests_for_staff() to authenticated;

create or replace function public.hold_account_deletion(p_user uuid, p_reason text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.care_blog_can_edit() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if length(trim(coalesce(p_reason, ''))) < 10 then
    raise exception 'A reason of at least 10 characters is required' using errcode = '22023';
  end if;
  update public.account_deletion_requests
     set status = 'held', hold_reason = trim(p_reason), held_by = auth.uid(), held_at = now(), updated_at = now()
   where user_id = p_user and status in ('pending', 'held');
  if not found then
    return jsonb_build_object('success', false, 'error', 'no_request');
  end if;
  return jsonb_build_object('success', true);
end;
$$;
revoke all on function public.hold_account_deletion(uuid, text) from public, anon;
grant execute on function public.hold_account_deletion(uuid, text) to authenticated;

create or replace function public.release_account_deletion(p_user uuid, p_note text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.care_blog_can_edit() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if length(trim(coalesce(p_note, ''))) < 10 then
    raise exception 'A note of at least 10 characters is required' using errcode = '22023';
  end if;
  update public.account_deletion_requests
     set status = 'pending', released_by = auth.uid(), released_at = now(), release_note = trim(p_note),
         -- give the executor a clear day; never earlier than the original date
         due_at = greatest(due_at, now() + interval '1 day'),
         updated_at = now()
   where user_id = p_user and status = 'held';
  if not found then
    return jsonb_build_object('success', false, 'error', 'not_held');
  end if;
  return jsonb_build_object('success', true);
end;
$$;
revoke all on function public.release_account_deletion(uuid, text) from public, anon;
grant execute on function public.release_account_deletion(uuid, text) to authenticated;

-- ===========================================================================
-- 6. Retirement (service role only; run by /api/run-account-deletions)
-- ===========================================================================
create or replace function public.due_account_deletions()
returns table (user_id uuid)
language sql
security definer
set search_path = public
stable
as $$
  select r.user_id
  from public.account_deletion_requests r
  where coalesce(auth.role(), '') = 'service_role'
    and r.status = 'pending' and r.due_at <= now()
    and public.deletion_hold_reason_for(r.user_id) is null
  order by r.due_at
  limit 50;
$$;
revoke all on function public.due_account_deletions() from public, anon, authenticated;
grant execute on function public.due_account_deletions() to service_role;

create or replace function public.retire_account(p_user uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_req   public.account_deletion_requests%rowtype;
  v_anon  text := 'deleted-' || replace(p_user::text, '-', '') || '@deleted.dates.care';
  v_created timestamptz;
  v_purchases boolean;
begin
  if coalesce(auth.role(), '') <> 'service_role' and session_user <> 'postgres' then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  select * into v_req from public.account_deletion_requests where user_id = p_user for update;
  if v_req.user_id is null or v_req.status <> 'pending' then
    return jsonb_build_object('success', false, 'error', 'not_pending');
  end if;
  if v_req.due_at > now() then
    return jsonb_build_object('success', false, 'error', 'not_due');
  end if;
  if public.deletion_hold_reason_for(p_user) is not null then
    update public.account_deletion_requests
       set status = 'held', hold_reason = public.deletion_hold_reason_for(p_user), held_at = now(), updated_at = now()
     where user_id = p_user;
    return jsonb_build_object('success', false, 'error', 'held');
  end if;

  -- ---- the retention record: what a lawful request could ask for --------
  insert into public.account_retention_records as k
    (user_id, account_created_at, last_sign_in_at, email, phone, verified_phone,
     full_name, first_name, date_of_birth, gender, location,
     verification_status, phone_verified, verified_at,
     payments, credits_purchased, reports_against, reports_made, moderation_actions,
     deletion_requested_at, deletion_hold_reason)
  select u.id, u.created_at, u.last_sign_in_at, u.email, u.phone, v.phone_number,
         p.full_name, p.first_name, p.date_of_birth, p.gender, p.location,
         p.verification_status, v.phone_verified, v.submitted_at,
         (select coalesce(jsonb_agg(jsonb_build_object('status', s.status, 'count', s.n, 'usd', s.usd)), '[]'::jsonb)
            from (select status, count(*) n, sum(coalesce(amount_usd, 0)) usd
                    from public.app_payment_intents where user_id = p_user group by status) s),
         (select coalesce(sum(amount), 0) from public.app_credit_ledger where user_id = p_user and reason like 'purchase:%'),
         (select count(*) from public.abuse_reports where reported_user_id = p_user),
         (select count(*) from public.abuse_reports where reporter_id = p_user),
         (select count(*) from public.moderation_actions where target_user_id = p_user),
         v_req.requested_at, v_req.hold_reason
  from auth.users u
  left join public.user_profiles p on p.user_id = u.id
  left join public.verification_requests v on v.user_id = u.id
  where u.id = p_user
  on conflict (user_id) do nothing;

  select created_at into v_created from auth.users where id = p_user;
  select exists (select 1 from public.app_credit_ledger where user_id = p_user and reason like 'purchase:%')
    into v_purchases;

  -- ---- scrub everything personal ------------------------------------------
  delete from public.user_photos where user_id = p_user;
  delete from public.user_settings where user_id = p_user;
  delete from public.user_preferences where user_id = p_user;
  delete from public.user_notification_settings where user_id = p_user;
  delete from public.matching_preferences where user_id = p_user;
  delete from public.user_likes where user_id = p_user or target_user_id = p_user;
  delete from public.matches where user1_id = p_user or user2_id = p_user;
  delete from public.match_scores where user_id = p_user or potential_match_id = p_user;
  delete from public.matching_interactions where user_id = p_user or target_user_id = p_user;
  delete from public.user_match_recommendations where user_id = p_user or recommended_user_id = p_user;
  delete from public.saved_favorites where user_id = p_user;
  delete from public.push_subscriptions where user_id = p_user;
  delete from public.user_2fa_settings where user_id = p_user;
  delete from public.biometric_data where user_id = p_user;
  delete from public.personal_information where user_id = p_user;
  delete from public.user_personality_profile where user_id = p_user;
  delete from public.quiz_results where user_id = p_user;
  delete from public.media_content where author_id = p_user;
  delete from public.typing_indicators where user_id = p_user;
  delete from public.app_feed_posts where user_id = p_user;
  delete from public.app_feed_comments where user_id = p_user;
  delete from public.app_feed_likes where user_id = p_user;
  delete from public.forum_posts where user_id = p_user;
  delete from public.forum_replies where user_id = p_user;
  delete from public.blog_comments where user_id = p_user;
  delete from public.user_comments where user_id = p_user;
  delete from public.referral_codes where user_id = p_user;
  delete from public.user_achievements where user_id = p_user;
  delete from public.feature_usage_tracking where user_id = p_user;
  delete from public.user_behavioral_metrics where user_id = p_user;
  delete from public.algorithm_feedback where user_id = p_user;
  delete from public.app_starred_threads where user_id = p_user;
  delete from public.photo_access_grants where photo_owner_id = p_user or granted_to_user_id = p_user;
  delete from public.media_reveals where user_id = p_user;
  delete from public.call_invites where caller_id = p_user or callee_id = p_user;
  delete from public.app_login_days where user_id = p_user;
  delete from public.user_rate_limits where user_id = p_user;

  -- Profile becomes a tombstone so the other side of every conversation
  -- still has a name to show. Nothing identifying stays on it.
  perform set_config('app.verification_checked', '1', true);
  update public.user_profiles
     set email = v_anon, full_name = 'Deleted member', first_name = 'Deleted member',
         bio = null, interests = '[]'::jsonb, location = null, occupation = null, education = null,
         looking_for = null, geo_location = null, location_updated_at = null,
         date_of_birth = null, gender = null, relationship_status = null,
         profile_visibility = 'private', is_online = false, show_online_status = false,
         is_verified = false, verification_status = 'deleted', updated_at = now()
   where user_id = p_user;
  update public.profiles
     set username = null, display_name = 'Deleted member', avatar_url = null, bio = null, updated_at = now()
   where id = p_user;

  -- Verification documents were promised gone within 90 days; the files are
  -- removed by the API route, the paths go here.
  update public.verification_requests
     set selfie_url = null, government_id_url = null, address_proof_url = null,
         address_info = null, full_name = 'Deleted member', updated_at = now()
   where user_id = p_user;

  -- Credits are forfeited (the ledger keeps the history).
  update public.app_credit_accounts
     set complimentary_credits = 0, purchased_credits = 0, updated_at = now()
   where user_id = p_user;

  update public.support_tickets set name = 'Deleted member', email = v_anon where user_id = p_user;

  -- ---- the sign-in: nameless and banned, row kept ------------------------
  update auth.users
     set email = v_anon, phone = null,
         raw_user_meta_data = '{}'::jsonb,
         raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object('deleted', true),
         encrypted_password = null,
         banned_until = now() + interval '100 years',
         updated_at = now()
   where id = p_user;
  update auth.identities
     set identity_data = jsonb_build_object('sub', p_user::text, 'email', v_anon), updated_at = now()
   where user_id = p_user;
  delete from auth.sessions where user_id = p_user;
  delete from auth.refresh_tokens where user_id = p_user::text;
  delete from auth.mfa_factors where user_id = p_user;

  insert into public.account_deletions (user_hash, account_age, had_purchases)
  values (encode(extensions.digest(p_user::text, 'sha256'), 'hex'), now() - v_created, v_purchases);

  update public.account_deletion_requests
     set status = 'completed', completed_at = now(), updated_at = now()
   where user_id = p_user;

  return jsonb_build_object('success', true, 'user_id', p_user, 'storage_prefix', p_user::text || '/');
end;
$$;
revoke all on function public.retire_account(uuid) from public, anon, authenticated;
grant execute on function public.retire_account(uuid) to service_role;

-- After the retention period the row goes for good.
create or replace function public.purge_expired_retention()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  n integer := 0;
  r record;
begin
  if coalesce(auth.role(), '') <> 'service_role' and session_user <> 'postgres' then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  for r in select user_id from public.account_retention_records where retain_until <= now() limit 100 loop
    delete from auth.users where id = r.user_id;
    delete from public.account_retention_records where user_id = r.user_id;
    n := n + 1;
  end loop;
  return n;
end;
$$;
revoke all on function public.purge_expired_retention() from public, anon, authenticated;

-- ===========================================================================
-- 7. Lawful access: admin + written reason + log line
-- ===========================================================================
create or replace function public.lawful_access_lookup(p_user uuid, p_reason text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.care_blog_can_edit() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if length(trim(coalesce(p_reason, ''))) < 20 then
    raise exception 'State the lawful basis (at least 20 characters): the order, file number or request' using errcode = '22023';
  end if;
  insert into public.lawful_access_log (actor_id, subject_id, reason) values (auth.uid(), p_user, trim(p_reason));

  return jsonb_build_object(
    'subject', p_user,
    'retained', (select to_jsonb(k) from public.account_retention_records k where k.user_id = p_user),
    'account', (select jsonb_build_object('created_at', created_at, 'last_sign_in_at', last_sign_in_at, 'email', email, 'phone', phone)
                from auth.users where id = p_user),
    'profile', (select jsonb_build_object('full_name', full_name, 'first_name', first_name, 'date_of_birth', date_of_birth,
                                          'location', location, 'verification_status', verification_status)
                from public.user_profiles where user_id = p_user),
    'verification', (select jsonb_build_object('phone_number', phone_number, 'phone_verified', phone_verified,
                                               'status', verification_status, 'submitted_at', submitted_at)
                     from public.verification_requests where user_id = p_user),
    'payments', (select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at), '[]'::jsonb) from public.app_payment_intents x where x.user_id = p_user),
    'credit_ledger', (select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at), '[]'::jsonb) from public.app_credit_ledger x where x.user_id = p_user),
    'reports_against', (select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at), '[]'::jsonb) from public.abuse_reports x where x.reported_user_id = p_user),
    'reports_made', (select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at), '[]'::jsonb) from public.abuse_reports x where x.reporter_id = p_user),
    'moderation_actions', (select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at), '[]'::jsonb) from public.moderation_actions x where x.target_user_id = p_user),
    'sign_in_events', (select coalesce(jsonb_agg(jsonb_build_object('at', "timestamp", 'event', event_type, 'ip', ip_address, 'agent', user_agent, 'ok', success) order by "timestamp" desc), '[]'::jsonb)
                       from (select * from public.security_audit_log where user_id = p_user order by "timestamp" desc limit 500) x),
    'mail_threads', (select coalesce(jsonb_agg(jsonb_build_object('thread_id', t.id, 'with', case when t.participant1_id = p_user then t.participant2_id else t.participant1_id end,
                                                                  'created_at', t.created_at, 'updated_at', t.updated_at)), '[]'::jsonb)
                     from public.mail_threads t where t.participant1_id = p_user or t.participant2_id = p_user),
    'mail_messages', (select coalesce(jsonb_agg(jsonb_build_object('id', m.id, 'thread_id', m.thread_id, 'sender_id', m.sender_id, 'subject', m.subject,
                                                                   'text', m.message_text, 'photos', m.photo_urls, 'created_at', m.created_at) order by m.created_at), '[]'::jsonb)
                      from public.mail_messages m
                      where m.sender_id = p_user
                         or m.thread_id in (select id from public.mail_threads where participant1_id = p_user or participant2_id = p_user)),
    'chat_messages', (select coalesce(jsonb_agg(jsonb_build_object('id', c.id, 'thread_id', c.thread_id, 'sender_id', c.sender_id, 'text', c.message_text,
                                                                   'media', c.media_url, 'created_at', c.created_at) order by c.created_at), '[]'::jsonb)
                      from public.chat_messages c where c.sender_id = p_user
                         or c.thread_id in (select id from public.mail_threads where participant1_id = p_user or participant2_id = p_user)),
    'calls', (select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at), '[]'::jsonb) from public.call_sessions x where x.caller_id = p_user or x.callee_id = p_user),
    'gifts', (select coalesce(jsonb_agg(to_jsonb(x)), '[]'::jsonb) from public.gift_transactions x where x.from_user_id = p_user or x.to_user_id = p_user)
  );
end;
$$;
revoke all on function public.lawful_access_lookup(uuid, text) from public, anon;
grant execute on function public.lawful_access_lookup(uuid, text) to authenticated;

create or replace function public.lawful_access_history()
returns table (id bigint, actor_id uuid, subject_id uuid, reason text, accessed_at timestamptz)
language sql
security definer
set search_path = public
stable
as $$
  select id, actor_id, subject_id, reason, accessed_at
  from public.lawful_access_log
  where public.care_blog_can_edit()
  order by accessed_at desc limit 200;
$$;
revoke all on function public.lawful_access_history() from public, anon;
grant execute on function public.lawful_access_history() to authenticated;

-- ===========================================================================
-- 8. The old one-tap path is closed
-- ===========================================================================
revoke execute on function public.scrub_my_account() from authenticated;

-- Retirement is driven from Vercel (it also removes the member's files):
-- the daily job asks /api/run-account-deletions with a shared key.
do $$
begin
  if not exists (select 1 from vault.secrets where name = 'deletion_run_key') then
    perform vault.create_secret(encode(gen_random_bytes(24), 'hex'), 'deletion_run_key',
      'Shared key between the deletion cron and /api/run-account-deletions');
  end if;
end $$;

create or replace function public.deletion_run_key_matches(p_key text)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(auth.role(), '') = 'service_role'
     and p_key is not null
     and p_key = (select decrypted_secret from vault.decrypted_secrets where name = 'deletion_run_key' limit 1);
$$;
revoke all on function public.deletion_run_key_matches(text) from public, anon, authenticated;
grant execute on function public.deletion_run_key_matches(text) to service_role;

create or replace function public.kick_account_deletions()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_key text;
begin
  if coalesce(auth.role(), '') <> 'service_role' and session_user <> 'postgres' then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  perform public.purge_expired_retention();
  if not exists (select 1 from public.account_deletion_requests where status = 'pending' and due_at <= now()) then
    return;
  end if;
  select decrypted_secret into v_key from vault.decrypted_secrets where name = 'deletion_run_key';
  if v_key is null then return; end if;
  perform net.http_post(
    url := 'https://dates.care/api/run-account-deletions',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-run-key', v_key),
    body := '{}'::jsonb,
    timeout_milliseconds := 60000
  );
end;
$$;
revoke all on function public.kick_account_deletions() from public, anon, authenticated;

select cron.schedule('account-deletions', '30 5 * * *', 'select public.kick_account_deletions();');

-- The tombstone is the one private profile everyone may read, so that the
-- other side of a conversation sees "Deleted member" rather than "User".
drop policy if exists "Members can see that a member was deleted" on public.user_profiles;
create policy "Members can see that a member was deleted"
  on public.user_profiles for select
  to authenticated
  using (verification_status = 'deleted');
