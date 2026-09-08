/*
  Account deletion and data export.

  The privacy policy has said since launch that a member can "delete your
  account and its data, in your account settings" and "export your data".
  Neither existed. These are PIPEDA access and withdrawal rights the site
  claimed to honour in-product.

  Deletion happens in two parts:
    1. scrub_my_account()  - a SECURITY DEFINER RPC the member calls. It
       removes the handful of rows that do not cascade from auth.users,
       records an anonymised deletion log entry, and returns the storage
       prefixes the server must clear.
    2. /api/delete-account - the server route, using the service role,
       removes the member's storage objects and then deletes the auth user,
       which cascades every table with an ON DELETE CASCADE foreign key
       (all of them except a few that are deliberately SET NULL so that
       anonymised dispute, support and audit records survive).

  Export is a single RPC returning the member's own data as JSON.
*/

-- ---------------------------------------------------------------------------
-- Anonymised record that a deletion happened. No name, no email, no user id
-- that could be joined back to anything: the id column is a hash. This exists
-- so "I never deleted my account" can be answered, and nothing else.
-- ---------------------------------------------------------------------------
create table if not exists public.account_deletions (
  id            bigserial primary key,
  user_hash     text not null,
  deleted_at    timestamptz not null default now(),
  account_age   interval,
  had_purchases boolean not null default false
);
alter table public.account_deletions enable row level security;
revoke all on public.account_deletions from anon, authenticated;

-- ---------------------------------------------------------------------------
-- Step 1: everything the member may remove for themselves.
-- ---------------------------------------------------------------------------
create or replace function public.scrub_my_account()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me          uuid := auth.uid();
  v_is_staff    boolean;
  v_created     timestamptz;
  v_purchases   boolean;
begin
  if v_me is null then
    return jsonb_build_object('success', false, 'error', 'not_signed_in');
  end if;

  select is_staff into v_is_staff from public.app_credit_accounts where user_id = v_me;
  if coalesce(v_is_staff, false) then
    -- Staff rows are referenced as reviewers and approvers elsewhere, and
    -- those references are NO ACTION by design. A staff account is removed
    -- by an admin, not by this button.
    return jsonb_build_object('success', false, 'error', 'staff_account');
  end if;

  select created_at into v_created from auth.users where id = v_me;
  select exists (select 1 from public.app_credit_ledger where user_id = v_me and reason like 'purchase:%')
    into v_purchases;

  -- Tables that reference the member without a foreign key, so the auth
  -- delete would leave them behind.
  delete from public.media_content where author_id = v_me;
  delete from public.typing_indicators where user_id = v_me;
  delete from public.user_match_recommendations where user_id = v_me or recommended_user_id = v_me;

  -- Anonymise rather than delete where a record of the interaction must
  -- survive for other people's sake (their tickets, their disputes).
  update public.support_tickets set name = 'Deleted member', email = 'deleted@dates.care'
    where user_id = v_me;

  insert into public.account_deletions (user_hash, account_age, had_purchases)
  values (encode(extensions.digest(v_me::text, 'sha256'), 'hex'), now() - v_created, v_purchases);

  return jsonb_build_object(
    'success', true,
    'user_id', v_me,
    'storage_prefix', v_me::text || '/',
    'buckets', jsonb_build_array('profile-photos','chat-media','feed-media','mail-attachments',
                                 'verification-documents','verification-docs','user-uploads','chat-exclusive')
  );
end;
$$;

revoke all on function public.scrub_my_account() from public, anon;
grant execute on function public.scrub_my_account() to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Export. Everything about the member, as one JSON document. Photo and
-- attachment URLs are storage paths; the files themselves are not embedded.
-- Other people's messages to the member are included as received mail,
-- because they are part of the member's own record of the conversation.
-- ---------------------------------------------------------------------------
create or replace function public.export_my_data()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me uuid := auth.uid();
begin
  if v_me is null then
    return jsonb_build_object('success', false, 'error', 'not_signed_in');
  end if;

  return jsonb_build_object(
    'success', true,
    'exported_at', now(),
    'account', (select jsonb_build_object('id', id, 'email', email, 'created_at', created_at, 'last_sign_in_at', last_sign_in_at)
                from auth.users where id = v_me),
    'profile', (select to_jsonb(p) from public.user_profiles p where p.user_id = v_me),
    'photos', (select coalesce(jsonb_agg(to_jsonb(x)), '[]'::jsonb) from public.user_photos x where x.user_id = v_me),
    'settings', (select to_jsonb(s) from public.user_settings s where s.user_id = v_me),
    'notification_settings', (select to_jsonb(n) from public.user_notification_settings n where n.user_id = v_me),
    'matching_preferences', (select to_jsonb(m) from public.matching_preferences m where m.user_id = v_me),
    'likes_given', (select coalesce(jsonb_agg(to_jsonb(l)), '[]'::jsonb) from public.user_likes l where l.user_id = v_me),
    'likes_received', (select coalesce(jsonb_agg(jsonb_build_object('from', l.user_id, 'type', l.like_type, 'at', l.created_at)), '[]'::jsonb)
                       from public.user_likes l where l.target_user_id = v_me),
    'blocks', (select coalesce(jsonb_agg(to_jsonb(b)), '[]'::jsonb) from public.user_blocked b where b.user_id = v_me),
    'mail_threads', (select coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb) from public.mail_threads t
                     where t.participant1_id = v_me or t.participant2_id = v_me),
    'mail_messages', (select coalesce(jsonb_agg(to_jsonb(m)), '[]'::jsonb) from public.mail_messages m
                      where m.sender_id = v_me
                         or m.thread_id in (select id from public.mail_threads where participant1_id = v_me or participant2_id = v_me)),
    'chat_messages_sent', (select coalesce(jsonb_agg(to_jsonb(c)), '[]'::jsonb) from public.chat_messages c where c.sender_id = v_me),
    'gifts_sent', (select coalesce(jsonb_agg(to_jsonb(g)), '[]'::jsonb) from public.gift_transactions g where g.from_user_id = v_me),
    'gifts_received', (select coalesce(jsonb_agg(to_jsonb(g)), '[]'::jsonb) from public.gift_transactions g where g.to_user_id = v_me),
    'credits', (select jsonb_build_object('complimentary', complimentary_credits, 'purchased', purchased_credits, 'updated_at', updated_at)
                from public.app_credit_accounts where user_id = v_me),
    'credit_ledger', (select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at), '[]'::jsonb) from public.app_credit_ledger x where x.user_id = v_me),
    'payments', (select coalesce(jsonb_agg(to_jsonb(x)), '[]'::jsonb) from public.app_payment_intents x where x.user_id = v_me),
    'subscriptions', (select coalesce(jsonb_agg(to_jsonb(x)), '[]'::jsonb) from public.app_subscriptions x where x.user_id = v_me),
    'verification', (select jsonb_build_object('status', verification_status, 'phone_verified', phone_verified,
                                               'submitted_at', submitted_at, 'reviewed_at', reviewed_at)
                     from public.verification_requests where user_id = v_me),
    'call_invites', (select coalesce(jsonb_agg(to_jsonb(x)), '[]'::jsonb) from public.call_invites x
                     where x.caller_id = v_me or x.callee_id = v_me),
    'support_tickets', (select coalesce(jsonb_agg(jsonb_build_object('ref', ticket_ref, 'subject', subject, 'status', status, 'created_at', created_at)), '[]'::jsonb)
                        from public.support_tickets where user_id = v_me),
    'reports_made', (select coalesce(jsonb_agg(to_jsonb(x)), '[]'::jsonb) from public.abuse_reports x where x.reporter_id = v_me)
  );
end;
$$;

revoke all on function public.export_my_data() from public, anon;
grant execute on function public.export_my_data() to authenticated, service_role;
