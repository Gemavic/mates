-- The data export includes the referral programme: the member's own code,
-- who they invited, and who invited them. Same function as
-- 20260908000004, with two keys added.

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
    'reports_made', (select coalesce(jsonb_agg(to_jsonb(x)), '[]'::jsonb) from public.abuse_reports x where x.reporter_id = v_me),
    'referral_code', (select code from public.referral_codes where user_id = v_me),
    'referrals', (select coalesce(jsonb_agg(to_jsonb(x)), '[]'::jsonb) from public.referrals x
                  where x.referrer_id = v_me or x.referee_id = v_me)
  );
end;
$$;
