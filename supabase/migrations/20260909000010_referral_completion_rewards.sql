-- Referral rewards that arrive when the friend finishes their profile.
--
-- The programme paid the inviter 50 credits after the friend had been a
-- member for thirty days, verified and still active. That reward stays.
-- But thirty days is invisible to a person deciding today whether to send
-- the link, so a first thank-you now lands the moment the invited friend
-- completes their profile (photo, gender, who they seek, country, city):
-- 20 credits to the inviter and 20 to the friend.
--
-- Completion is the trigger because it is the one thing a fake account
-- cannot do cheaply: the photo is screened, and a profile without one is
-- shown to nobody. The monthly cap applies to these too. Nothing is paid
-- for merely signing up.

alter table public.referrals
  add column if not exists completed_at timestamptz,
  add column if not exists completion_credits integer;

create or replace function public.referral_terms()
returns jsonb
language sql
immutable
as $$
  select jsonb_build_object(
    'reward_credits', 50,          -- complimentary credits to the inviter after thirty days
    'completion_credits', 20,      -- to each side when the friend completes their profile
    'days_required', 30,
    'active_within_days', 7,
    'monthly_cap', 10,
    'attach_window_hours', 48,
    'expires_after_days', 90
  );
$$;

-- Called by the invited member's own session once their profile is
-- complete. Idempotent: pays once, then does nothing. The server checks
-- everything; the app only asks.
create or replace function public.claim_referral_completion()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me uuid := auth.uid();
  v_terms jsonb := public.referral_terms();
  v_credits integer := (v_terms->>'completion_credits')::int;
  v_cap integer := (v_terms->>'monthly_cap')::int;
  v_r record;
  v_complete boolean;
  v_bal_ref integer;
  v_bal_me integer;
begin
  if v_me is null then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  select r.* into v_r
  from public.referrals r
  where r.referee_id = v_me and r.status = 'pending' and r.completed_at is null
  for update;

  if not found then
    return jsonb_build_object('paid', false, 'reason', 'nothing_pending');
  end if;

  select coalesce((public.my_profile_completion()->>'complete')::boolean, false) into v_complete;
  if not v_complete then
    return jsonb_build_object('paid', false, 'reason', 'profile_incomplete');
  end if;

  -- Neither side thrown out.
  if exists (select 1 from public.moderation_actions m
             where m.target_user_id in (v_me, v_r.referrer_id)
               and m.action_type in ('permanent_ban', 'account_suspension')
               and (m.expires_at is null or m.expires_at > now())) then
    return jsonb_build_object('paid', false, 'reason', 'not_in_good_standing');
  end if;

  -- The inviter's monthly cap counts both kinds of thank-you.
  if (select count(*) from public.referrals
      where referrer_id = v_r.referrer_id
        and ((status = 'rewarded' and rewarded_at >= date_trunc('month', now()))
          or (completed_at is not null and completed_at >= date_trunc('month', now())))) >= v_cap then
    return jsonb_build_object('paid', false, 'reason', 'monthly_cap');
  end if;

  update public.app_credit_accounts
  set complimentary_credits = complimentary_credits + v_credits, updated_at = now()
  where user_id = v_r.referrer_id
  returning complimentary_credits + purchased_credits into v_bal_ref;

  update public.app_credit_accounts
  set complimentary_credits = complimentary_credits + v_credits, updated_at = now()
  where user_id = v_me
  returning complimentary_credits + purchased_credits into v_bal_me;

  if v_bal_ref is null or v_bal_me is null then
    return jsonb_build_object('paid', false, 'reason', 'no_credit_account');
  end if;

  insert into public.app_credit_ledger (user_id, amount, balance_after, reason) values
    (v_r.referrer_id, v_credits, v_bal_ref, 'referral_complete:' || v_me),
    (v_me, v_credits, v_bal_me, 'referral_welcome:' || v_r.referrer_id);

  update public.referrals
  set completed_at = now(), completion_credits = v_credits
  where id = v_r.id;

  return jsonb_build_object('paid', true, 'credits', v_credits);
end;
$$;

revoke all on function public.claim_referral_completion() from public, anon;
grant execute on function public.claim_referral_completion() to authenticated;

-- The inviter's page shows the new stage too.
create or replace function public.my_referrals()
returns jsonb
language sql
security definer
set search_path = public
stable
as $$
  with me as (select auth.uid() as id),
  rows as (
    select r.id, r.status, r.created_at, r.qualifies_at, r.rewarded_at, r.credits, r.void_reason,
           r.completed_at, r.completion_credits,
           coalesce(nullif(trim(p.first_name), ''), nullif(split_part(coalesce(p.full_name, ''), ' ', 1), ''), 'Member') as first_name,
           coalesce(p.is_verified, false) as is_verified
    from public.referrals r
    left join public.user_profiles p on p.user_id = r.referee_id
    where r.referrer_id = (select id from me)
    order by r.created_at desc
  )
  select jsonb_build_object(
    'code', (select code from public.referral_codes where user_id = (select id from me)),
    'terms', public.referral_terms(),
    'rewarded_this_month', (
      select count(*) from public.referrals
      where referrer_id = (select id from me)
        and ((status = 'rewarded' and rewarded_at >= date_trunc('month', now()))
          or (completed_at is not null and completed_at >= date_trunc('month', now())))
    ),
    'total_credits_earned', (
      select coalesce(sum(coalesce(credits, 0) + coalesce(completion_credits, 0)), 0) from public.referrals
      where referrer_id = (select id from me)
    ),
    'invites', coalesce((select jsonb_agg(to_jsonb(rows)) from rows), '[]'::jsonb)
  );
$$;
