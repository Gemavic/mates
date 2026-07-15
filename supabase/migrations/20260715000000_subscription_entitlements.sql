-- ============================================================================
-- SUBSCRIPTION TIERS & ENTITLEMENTS (v3)
-- Run AFTER the v2 credit ledger migration.
--
-- Two payment lanes, both enforced server-side:
--   • Pay-as-you-go: credits (already live from v2)
--   • Monthly subscription: silver / gold / platinum / elite
--
-- Entitlements enforced here:
--   ALL paid tiers (silver/gold/platinum/elite) → unlimited free messages
--   platinum/elite → video & audio (calls and messages) included
--   elite          → matchmaker etc. are human-delivered services
--   Tier prestige is differentiated by likes, visibility, included calls,
--   bonus credits, and human services — never by metering conversation.
--
-- Subscriptions can ONLY be activated by your payment webhook using the
-- service_role key — never from the browser.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. TABLE
-- ---------------------------------------------------------------------------

create table if not exists public.app_subscriptions (
  user_id            uuid primary key references auth.users(id) on delete cascade,
  tier               text not null check (tier in ('silver','gold','platinum','elite')),
  status             text not null default 'active'
                       check (status in ('active','canceled','expired')),
  current_period_end timestamptz not null,
  payment_ref        text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

alter table public.app_subscriptions enable row level security;

drop policy if exists "read own subscription" on public.app_subscriptions;
create policy "read own subscription"
  on public.app_subscriptions for select
  using (auth.uid() = user_id);

revoke insert, update, delete on public.app_subscriptions from anon, authenticated;

-- ---------------------------------------------------------------------------
-- 2. HELPER: current active tier for a user (null if none / expired)
-- ---------------------------------------------------------------------------

create or replace function public.app_active_tier(p_user uuid)
returns text
language sql
security definer
set search_path = public
stable
as $$
  select tier from public.app_subscriptions
  where user_id = p_user
    and status = 'active'
    and current_period_end > now();
$$;

revoke execute on function public.app_active_tier(uuid) from anon, authenticated;

-- ---------------------------------------------------------------------------
-- 3. get_my_credits now also reports the subscription
--    (client reads one RPC for balance + tier)
-- ---------------------------------------------------------------------------

drop function if exists public.get_my_credits();
create or replace function public.get_my_credits()
returns table (
  complimentary_credits integer,
  purchased_credits     integer,
  total_credits         integer,
  is_staff              boolean,
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

-- ---------------------------------------------------------------------------
-- 4. spend_message honors subscription tiers
--    ANY active paid tier: always free (unlimited messaging)
--    no subscription: first message per thread free, then 10 credits
-- ---------------------------------------------------------------------------

drop function if exists public.spend_message(text);
create or replace function public.spend_message(p_thread_id text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tier text;
  v_sent_before boolean;
begin
  if p_thread_id is null or length(p_thread_id) = 0 then
    return jsonb_build_object('success', false, 'error', 'missing_thread');
  end if;

  v_tier := public.app_active_tier(auth.uid());

  -- All paid tiers include unlimited messaging
  if v_tier in ('silver','gold','platinum','elite') then
    insert into public.app_credit_ledger (user_id, amount, balance_after, reason, thread_id)
    select auth.uid(), 0,
           a.complimentary_credits + a.purchased_credits,
           'message', p_thread_id
    from public.app_credit_accounts a where a.user_id = auth.uid();
    return jsonb_build_object('success', true, 'charged', 0, 'is_free', true,
                              'free_reason', 'subscription');
  end if;

  -- Pay-as-you-go: first message per thread free, then 10 credits
  select exists (
    select 1 from public.app_credit_ledger
    where user_id = auth.uid()
      and thread_id = p_thread_id
      and reason = 'message'
  ) into v_sent_before;

  if not v_sent_before then
    insert into public.app_credit_ledger (user_id, amount, balance_after, reason, thread_id)
    select auth.uid(), 0,
           a.complimentary_credits + a.purchased_credits,
           'message', p_thread_id
    from public.app_credit_accounts a where a.user_id = auth.uid();
    return jsonb_build_object('success', true, 'charged', 0, 'is_free', true,
                              'free_reason', 'first_in_thread');
  end if;

  return public.spend_credits(10, 'message', p_thread_id)
         || jsonb_build_object('is_free', false);
end;
$$;

grant execute on function public.spend_message(text) to authenticated;

-- ---------------------------------------------------------------------------
-- 5. spend_credits honors platinum/elite free video & audio
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

  -- Staff and zero-cost operations are free
  if v_account.is_staff or p_amount = 0 then
    return jsonb_build_object('success', true, 'charged', 0, 'total_credits', v_total);
  end if;

  -- Platinum/Elite: video & audio features are included in the subscription
  v_tier := public.app_active_tier(auth.uid());
  if v_tier in ('platinum','elite')
     and lower(coalesce(p_reason,'')) in
         ('video_call','audio_call','video','audio',
          'video_message','audio_message','video message','audio message') then
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
-- 6. WEBHOOK-ONLY: activate / renew a subscription (service_role only)
--    Idempotent per payment reference. Example call from your webhook:
--      select public.activate_subscription('<user_id>', 'gold',
--             now() + interval '1 month', 'provider:ch_abc123');
-- ---------------------------------------------------------------------------

drop function if exists public.activate_subscription(uuid, text, timestamptz, text);
create or replace function public.activate_subscription(
  p_user_id uuid,
  p_tier text,
  p_period_end timestamptz,
  p_payment_ref text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.role() is distinct from 'service_role' then
    return jsonb_build_object('success', false, 'error', 'forbidden');
  end if;

  if p_tier not in ('silver','gold','platinum','elite') then
    return jsonb_build_object('success', false, 'error', 'invalid_tier');
  end if;

  -- Idempotency: never process the same payment reference twice
  if exists (
    select 1 from public.app_credit_ledger
    where reason = 'subscription:' || p_payment_ref
  ) then
    return jsonb_build_object('success', false, 'error', 'duplicate_payment_ref');
  end if;

  insert into public.app_subscriptions (user_id, tier, status, current_period_end, payment_ref)
  values (p_user_id, p_tier, 'active', p_period_end, p_payment_ref)
  on conflict (user_id) do update
    set tier = excluded.tier,
        status = 'active',
        current_period_end = excluded.current_period_end,
        payment_ref = excluded.payment_ref,
        updated_at = now();

  -- Audit entry (amount 0 — money is tracked by your payment provider)
  insert into public.app_credit_ledger (user_id, amount, balance_after, reason)
  select p_user_id, 0, a.complimentary_credits + a.purchased_credits,
         'subscription:' || p_payment_ref
  from public.app_credit_accounts a where a.user_id = p_user_id;

  return jsonb_build_object('success', true, 'tier', p_tier,
                            'expires', p_period_end);
end;
$$;

revoke execute on function public.activate_subscription(uuid, text, timestamptz, text)
  from anon, authenticated;

-- ---------------------------------------------------------------------------
-- 7. WEBHOOK-ONLY: cancel a subscription (runs until period end)
-- ---------------------------------------------------------------------------

drop function if exists public.cancel_subscription(uuid, text);
create or replace function public.cancel_subscription(
  p_user_id uuid,
  p_payment_ref text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.role() is distinct from 'service_role' then
    return jsonb_build_object('success', false, 'error', 'forbidden');
  end if;

  update public.app_subscriptions
  set status = 'canceled', updated_at = now()
  where user_id = p_user_id;

  return jsonb_build_object('success', true);
end;
$$;

revoke execute on function public.cancel_subscription(uuid, text)
  from anon, authenticated;
