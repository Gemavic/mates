-- Referral programme.
--
-- Members asked for a way to bring friends and family. The rules, in order
-- of importance:
--
--   * Rewards are complimentary credits only. Never cash, never purchased
--     credits (which are refundable), never anything that leaves the site.
--   * The reward vests only after the invited person has been a member for
--     REFERRAL_DAYS days, is verified, is still active, and is in good
--     standing. Until then it is a pending line on the inviter's page, and
--     if the friend leaves or is suspended it never vests at all.
--   * The invited person receives exactly what every new member receives -
--     the welcome bonus - and nothing more. There is no incentive to sign up
--     for a bonus rather than for the site.
--   * A member may earn at most REFERRAL_MONTHLY_CAP rewards in any calendar
--     month. Enough for someone who really is bringing their family; not
--     enough to be worth running fake accounts for.
--   * The invitation carries the member's own name. The site does not send
--     messages on anyone's behalf and never reads anyone's contacts; the
--     member shares their link from their own phone, to people they know.
--
-- Everything that moves credits is a SECURITY DEFINER function that only
-- the daily cron can run. The browser can read its own code and its own
-- list, attach a code to a brand-new account, and look up the first name
-- behind a code. That is all.

-- ---------------------------------------------------------------------------
-- Terms of the programme, in one place, readable by the app.
-- ---------------------------------------------------------------------------
create or replace function public.referral_terms()
returns jsonb
language sql
immutable
as $$
  select jsonb_build_object(
    'reward_credits', 50,          -- complimentary credits to the inviter
    'days_required', 30,           -- membership age before it can vest
    'active_within_days', 7,       -- friend must have been seen this recently at vesting
    'monthly_cap', 10,             -- rewards per inviter per calendar month
    'attach_window_hours', 48,     -- a code must be attached within this long of sign-up
    'expires_after_days', 90       -- a pending referral that never qualifies is closed
  );
$$;
grant execute on function public.referral_terms() to anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Codes: one per member, made on first request, never changed.
-- ---------------------------------------------------------------------------
create table if not exists public.referral_codes (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  code       text not null unique check (code ~ '^[A-Z2-9]{8}$'),
  created_at timestamptz not null default now()
);
alter table public.referral_codes enable row level security;
drop policy if exists "referral codes: read own" on public.referral_codes;
create policy "referral codes: read own" on public.referral_codes
  for select to authenticated using (user_id = auth.uid());
revoke all on public.referral_codes from anon, authenticated;
grant select on public.referral_codes to authenticated;
grant all on public.referral_codes to service_role;

-- ---------------------------------------------------------------------------
-- Referrals: who invited whom, and where the reward stands.
-- ---------------------------------------------------------------------------
create table if not exists public.referrals (
  id            uuid primary key default gen_random_uuid(),
  referrer_id   uuid not null references auth.users(id) on delete cascade,
  referee_id    uuid not null unique references auth.users(id) on delete cascade,
  code          text not null,
  status        text not null default 'pending'
                check (status in ('pending', 'rewarded', 'void')),
  created_at    timestamptz not null default now(),
  qualifies_at  timestamptz not null,
  rewarded_at   timestamptz,
  credits       integer,
  void_reason   text,
  check (referrer_id <> referee_id)
);
create index if not exists referrals_referrer_idx on public.referrals (referrer_id, created_at desc);
create index if not exists referrals_pending_idx on public.referrals (qualifies_at) where status = 'pending';

alter table public.referrals enable row level security;
-- The inviter sees their own list; the invited person sees the one row
-- about them (so "invited by" can be shown honestly, and exported).
drop policy if exists "referrals: read own" on public.referrals;
create policy "referrals: read own" on public.referrals
  for select to authenticated using (referrer_id = auth.uid() or referee_id = auth.uid());
revoke all on public.referrals from anon, authenticated;
grant select on public.referrals to authenticated;
grant all on public.referrals to service_role;

-- ---------------------------------------------------------------------------
-- my_referral_code(): the member's own code, created on first call.
-- ---------------------------------------------------------------------------
create or replace function public.my_referral_code()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code text;
  v_alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- no 0/O/1/I
  v_try integer := 0;
begin
  if auth.uid() is null then
    raise exception 'not signed in' using errcode = '42501';
  end if;

  select code into v_code from public.referral_codes where user_id = auth.uid();
  if v_code is not null then
    return v_code;
  end if;

  loop
    v_try := v_try + 1;
    v_code := '';
    for i in 1..8 loop
      v_code := v_code || substr(v_alphabet, 1 + floor(random() * length(v_alphabet))::int, 1);
    end loop;
    begin
      insert into public.referral_codes (user_id, code) values (auth.uid(), v_code);
      return v_code;
    exception when unique_violation then
      -- Either the code collided (retry) or a concurrent call already made
      -- this member's code (return it).
      select code into v_code from public.referral_codes where user_id = auth.uid();
      if v_code is not null then
        return v_code;
      end if;
      if v_try > 5 then
        raise;
      end if;
    end;
  end loop;
end;
$$;
revoke all on function public.my_referral_code() from public, anon;
grant execute on function public.my_referral_code() to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- referral_preview(code): the first name behind a code, for the invitation
-- page. Anonymous - the person has not signed up yet. Returns nothing for an
-- unknown code, and nothing but a first name for a known one.
-- ---------------------------------------------------------------------------
create or replace function public.referral_preview(p_code text)
returns jsonb
language sql
security definer
set search_path = public
stable
as $$
  select jsonb_build_object(
    'first_name', coalesce(nullif(trim(p.first_name), ''), nullif(split_part(coalesce(p.full_name, ''), ' ', 1), ''), 'A member')
  )
  from public.referral_codes c
  join public.user_profiles p on p.user_id = c.user_id
  where c.code = upper(trim(p_code))
    and not exists (
      select 1 from public.moderation_actions m
      where m.target_user_id = c.user_id
        and m.action_type in ('temporary_ban', 'permanent_ban', 'account_suspension')
        and (m.expires_at is null or m.expires_at > now())
    );
$$;
revoke all on function public.referral_preview(text) from public;
grant execute on function public.referral_preview(text) to anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- attach_referral(code): a brand-new member says who invited them.
-- ---------------------------------------------------------------------------
create or replace function public.attach_referral(p_code text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me        uuid := auth.uid();
  v_created   timestamptz;
  v_referrer  uuid;
  v_terms     jsonb := public.referral_terms();
begin
  if v_me is null then
    return jsonb_build_object('success', false, 'error', 'not_signed_in');
  end if;

  select created_at into v_created from auth.users where id = v_me;
  if v_created is null or v_created < now() - ((v_terms->>'attach_window_hours') || ' hours')::interval then
    -- Only a new account can be "invited". An existing member clicking a
    -- friend's link is welcome, but nobody is paid for it.
    return jsonb_build_object('success', false, 'error', 'not_a_new_account');
  end if;

  select user_id into v_referrer from public.referral_codes where code = upper(trim(p_code));
  if v_referrer is null then
    return jsonb_build_object('success', false, 'error', 'unknown_code');
  end if;
  if v_referrer = v_me then
    return jsonb_build_object('success', false, 'error', 'own_code');
  end if;

  if exists (select 1 from public.referrals where referee_id = v_me) then
    return jsonb_build_object('success', true, 'already', true);
  end if;

  insert into public.referrals (referrer_id, referee_id, code, qualifies_at)
  values (v_referrer, v_me, upper(trim(p_code)),
          v_created + ((v_terms->>'days_required') || ' days')::interval);

  return jsonb_build_object('success', true, 'already', false);
end;
$$;
revoke all on function public.attach_referral(text) from public, anon;
grant execute on function public.attach_referral(text) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- my_referrals(): everything the inviter's page shows.
-- ---------------------------------------------------------------------------
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
      where referrer_id = (select id from me) and status = 'rewarded'
        and rewarded_at >= date_trunc('month', now())
    ),
    'total_credits_earned', (
      select coalesce(sum(credits), 0) from public.referrals
      where referrer_id = (select id from me) and status = 'rewarded'
    ),
    'invites', coalesce((select jsonb_agg(to_jsonb(rows)) from rows), '[]'::jsonb)
  );
$$;
revoke all on function public.my_referrals() from public, anon;
grant execute on function public.my_referrals() to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- settle_referrals(): the daily job. Vests what has qualified, closes what
-- never will. The only place referral credits are created.
-- ---------------------------------------------------------------------------
create or replace function public.settle_referrals()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_terms    jsonb := public.referral_terms();
  v_reward   integer := (v_terms->>'reward_credits')::int;
  v_cap      integer := (v_terms->>'monthly_cap')::int;
  v_active   interval := ((v_terms->>'active_within_days') || ' days')::interval;
  v_expire   interval := ((v_terms->>'expires_after_days') || ' days')::interval;
  v_r        record;
  v_rewarded integer := 0;
  v_voided   integer := 0;
  v_deferred integer := 0;
  v_balance  integer;
begin
  if coalesce(auth.role(), '') <> 'service_role' and session_user <> 'postgres' then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  for v_r in
    select r.id, r.referrer_id, r.referee_id, r.created_at, r.qualifies_at,
           p.is_verified, p.last_active,
           exists (select 1 from public.moderation_actions m
                   where m.target_user_id = r.referee_id
                     and m.action_type in ('permanent_ban', 'account_suspension')
                     and (m.expires_at is null or m.expires_at > now())) as referee_out,
           exists (select 1 from public.moderation_actions m
                   where m.target_user_id = r.referrer_id
                     and m.action_type in ('permanent_ban', 'account_suspension')
                     and (m.expires_at is null or m.expires_at > now())) as referrer_out
    from public.referrals r
    left join public.user_profiles p on p.user_id = r.referee_id
    where r.status = 'pending'
      and r.qualifies_at <= now()
    order by r.qualifies_at
    for update of r skip locked
  loop
    -- Gone for good, or thrown out: nothing to pay.
    if v_r.referee_out or v_r.referrer_out then
      update public.referrals set status = 'void', void_reason = 'account_not_in_good_standing' where id = v_r.id;
      v_voided := v_voided + 1;
      continue;
    end if;

    -- Not verified, or not around any more: keep waiting, up to the expiry.
    if coalesce(v_r.is_verified, false) is not true
       or v_r.last_active is null
       or v_r.last_active < now() - v_active then
      if v_r.created_at < now() - v_expire then
        update public.referrals set status = 'void',
          void_reason = case when coalesce(v_r.is_verified, false) then 'not_active' else 'not_verified' end
        where id = v_r.id;
        v_voided := v_voided + 1;
      else
        v_deferred := v_deferred + 1;
      end if;
      continue;
    end if;

    -- Monthly cap on the inviter.
    if (select count(*) from public.referrals
        where referrer_id = v_r.referrer_id and status = 'rewarded'
          and rewarded_at >= date_trunc('month', now())) >= v_cap then
      v_deferred := v_deferred + 1;   -- tries again next month
      continue;
    end if;

    -- Pay: complimentary credits, on the live ledger, with a reason that
    -- names the programme and stays outside the 'reward:%' daily-cap family.
    update public.app_credit_accounts
    set complimentary_credits = complimentary_credits + v_reward, updated_at = now()
    where user_id = v_r.referrer_id
    returning complimentary_credits + purchased_credits into v_balance;

    if v_balance is null then
      -- No credit account (should not happen); leave it pending for a human.
      v_deferred := v_deferred + 1;
      continue;
    end if;

    insert into public.app_credit_ledger (user_id, amount, balance_after, reason)
    values (v_r.referrer_id, v_reward, v_balance, 'referral:' || v_r.referee_id);

    update public.referrals
    set status = 'rewarded', rewarded_at = now(), credits = v_reward
    where id = v_r.id;
    v_rewarded := v_rewarded + 1;
  end loop;

  return jsonb_build_object('rewarded', v_rewarded, 'voided', v_voided, 'deferred', v_deferred);
end;
$$;
revoke all on function public.settle_referrals() from public, anon, authenticated;
grant execute on function public.settle_referrals() to service_role;

-- Once a day, quietly.
select cron.schedule('referral-settle', '15 4 * * *', 'select public.settle_referrals();');
