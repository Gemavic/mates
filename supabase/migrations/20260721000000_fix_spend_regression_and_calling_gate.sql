-- Corrects two issues found while wiring in the new staff-access-request
-- system:
--
-- 1. REGRESSION FIX: the previous daily-free-message-cap migration
--    (20260719000000) was written against an older spend_message()
--    definition and unintentionally reverted the subscription-tier-aware
--    version from 20260715000000 — silver/gold/platinum/elite subscribers
--    would have started being charged 10 credits per message after their
--    first free one per thread, breaking their "unlimited messaging"
--    subscription benefit. This restores tier-awareness AND keeps the
--    12-per-24h cap, correctly layered: paid tiers remain always free;
--    the daily cap only applies to pay-as-you-go users' free-first-
--    message-per-thread benefit.
--
-- 2. REAL ENFORCEMENT FIX: is_staff was found to still unconditionally
--    bypass spend_credits() for EVERY reason, including calling — meaning
--    the client-side hasFreeCallingAccess() check added alongside this
--    migration was cosmetic only. The actual charge (called every minute
--    during a live call) would have succeeded for free for any is_staff
--    account regardless of whether they had an approved grant. Fixed by
--    moving the calling-specific bypass to require an active grant,
--    server-side, at the one place that actually matters.

-- ---------------------------------------------------------------------------
-- spend_message: tier-aware + daily free-thread cap (pay-as-you-go only)
-- ---------------------------------------------------------------------------
drop function if exists public.spend_message(text);
create or replace function public.spend_message(p_thread_id text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tier        text;
  v_sent_before boolean;
  v_free_today  integer;
begin
  if p_thread_id is null or length(p_thread_id) = 0 then
    return jsonb_build_object('success', false, 'error', 'missing_thread');
  end if;

  v_tier := public.app_active_tier(auth.uid());

  -- All paid tiers include unlimited messaging, no daily cap applies
  if v_tier in ('silver','gold','platinum','elite') then
    insert into public.app_credit_ledger (user_id, amount, balance_after, reason, thread_id)
    select auth.uid(), 0,
           a.complimentary_credits + a.purchased_credits,
           'message', p_thread_id
    from public.app_credit_accounts a where a.user_id = auth.uid();
    return jsonb_build_object('success', true, 'charged', 0, 'is_free', true,
                              'free_reason', 'subscription');
  end if;

  -- Pay-as-you-go: first message per thread free, capped at 12 free
  -- thread-starts per rolling 24 hours; after that, charged normally.
  select exists (
    select 1 from public.app_credit_ledger
    where user_id = auth.uid()
      and thread_id = p_thread_id
      and reason = 'message'
  ) into v_sent_before;

  if not v_sent_before then
    select count(*) into v_free_today
    from public.app_credit_ledger
    where user_id = auth.uid()
      and reason = 'message'
      and amount = 0
      and created_at > now() - interval '24 hours';

    if v_free_today < 12 then
      insert into public.app_credit_ledger (user_id, amount, balance_after, reason, thread_id)
      select auth.uid(), 0,
             a.complimentary_credits + a.purchased_credits,
             'message', p_thread_id
      from public.app_credit_accounts a where a.user_id = auth.uid();
      return jsonb_build_object('success', true, 'charged', 0, 'is_free', true,
        'free_reason', 'first_in_thread', 'free_messages_remaining_today', 12 - v_free_today - 1);
    end if;

    return public.spend_credits(10, 'message', p_thread_id)
      || jsonb_build_object('is_free', false, 'daily_free_limit_reached', true);
  end if;

  return public.spend_credits(10, 'message', p_thread_id) || jsonb_build_object('is_free', false);
end;
$$;

grant execute on function public.spend_message(text) to authenticated;

-- ---------------------------------------------------------------------------
-- spend_credits: calling now requires is_staff AND an active approved
-- 'calling' grant, not is_staff alone. Every other reason (messages,
-- gifts, etc.) is unaffected — is_staff alone remains sufficient there,
-- unchanged.
-- ---------------------------------------------------------------------------
drop function if exists public.spend_credits(integer, text, text);
create or replace function public.spend_credits(
  p_amount integer,
  p_reason text,
  p_thread_id text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_account public.app_credit_accounts%rowtype;
  v_tier    text;
  v_total   integer;
  v_from_comp integer;
  v_from_purch integer;
  v_is_calling boolean;
begin
  if p_amount is null or p_amount < 0 then
    return jsonb_build_object('success', false, 'error', 'invalid_amount');
  end if;

  select * into v_account
  from public.app_credit_accounts
  where user_id = auth.uid()
  for update;

  if not found then
    return jsonb_build_object('success', false, 'error', 'no_account');
  end if;

  v_total := v_account.complimentary_credits + v_account.purchased_credits;

  v_is_calling := lower(coalesce(p_reason,'')) in
    ('video_call','audio_call','video','audio',
     'video_message','audio_message','video message','audio message');

  -- Staff bypass: free for every reason EXCEPT calling, which additionally
  -- requires a currently-active, admin-approved grant (see
  -- app_staff_access_requests / has_active_staff_grant()).
  if p_amount = 0
     or (v_account.is_staff and not v_is_calling)
     or (v_account.is_staff and v_is_calling
         and public.has_active_staff_grant(auth.uid(), 'calling')) then
    insert into public.app_credit_ledger (user_id, amount, balance_after, reason, thread_id)
    values (auth.uid(), 0, v_total, coalesce(p_reason, 'spend'), p_thread_id);
    return jsonb_build_object('success', true, 'charged', 0, 'total_credits', v_total);
  end if;

  -- Platinum/Elite: video & audio features are included in the subscription
  v_tier := public.app_active_tier(auth.uid());
  if v_tier in ('platinum','elite') and v_is_calling then
    insert into public.app_credit_ledger (user_id, amount, balance_after, reason, thread_id)
    values (auth.uid(), 0, v_total, lower(p_reason), p_thread_id);
    return jsonb_build_object('success', true, 'charged', 0, 'total_credits', v_total,
                              'free_reason', 'subscription');
  end if;

  if v_total < p_amount then
    return jsonb_build_object('success', false, 'error', 'insufficient_credits',
      'total_credits', v_total);
  end if;

  v_from_comp  := least(v_account.complimentary_credits, p_amount);
  v_from_purch := p_amount - v_from_comp;

  update public.app_credit_accounts
  set complimentary_credits = complimentary_credits - v_from_comp,
      purchased_credits     = purchased_credits - v_from_purch,
      updated_at            = now()
  where user_id = auth.uid();

  insert into public.app_credit_ledger (user_id, amount, balance_after, reason, thread_id)
  values (auth.uid(), -p_amount, v_total - p_amount, coalesce(p_reason, 'spend'), p_thread_id);

  return jsonb_build_object('success', true, 'charged', p_amount,
    'total_credits', v_total - p_amount);
end;
$$;

grant execute on function public.spend_credits(integer, text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- get_my_credits: also expose is_admin, so the client can show the
-- approval queue only to admins without a separate round-trip.
-- ---------------------------------------------------------------------------
drop function if exists public.get_my_credits();
create or replace function public.get_my_credits()
returns table (
  complimentary_credits integer,
  purchased_credits     integer,
  total_credits         integer,
  is_staff              boolean,
  is_admin              boolean,
  tier                  text,
  tier_expires          timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  select a.complimentary_credits,
         a.purchased_credits,
         a.complimentary_credits + a.purchased_credits as total_credits,
         a.is_staff,
         a.is_admin,
         s.tier,
         s.current_period_end
  from public.app_credit_accounts a
  left join public.app_subscriptions s
    on s.user_id = a.user_id
   and s.status = 'active'
   and s.current_period_end > now()
  where a.user_id = auth.uid();
end;
$$;

grant execute on function public.get_my_credits() to authenticated;
