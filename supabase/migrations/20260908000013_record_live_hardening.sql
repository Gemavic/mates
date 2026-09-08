-- Record, in the repository, the hardening that was applied to the live
-- database but never committed.
--
-- Read cold, the earlier migrations describe credit-minting functions open
-- to every signed-in member. The live project has not looked like that for
-- some time: the grants and guards below were applied by hand. Until now a
-- rebuild from these files would have reopened them. This file is a copy of
-- the live definitions, so the repository and the database agree.
--
-- Note that add_credits_atomic and spend_credits_atomic operate on the
-- LEGACY user_credits table, which nothing in the app reads any more; they
-- are kept only because retiring a function is a separate decision from
-- recording its guard. app_credit_accounts / spend_credits_for is the ledger.

-- Only the member themself, an admin, or the service role.
create or replace function public.app_caller_is_self_or_admin(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(auth.role(), '') = 'service_role'
      or (auth.uid() is not null and p_user_id = auth.uid())
      or coalesce((select is_admin from public.app_credit_accounts where user_id = auth.uid()), false);
$$;
revoke all on function public.app_caller_is_self_or_admin(uuid) from public, anon, authenticated;
grant execute on function public.app_caller_is_self_or_admin(uuid) to service_role;

-- Legacy ledger debit: guarded, and only reachable through the guard.
create or replace function public.spend_credits_atomic(p_user_id uuid, p_amount integer, p_description text, p_category text default 'general')
returns json
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.app_caller_is_self_or_admin(p_user_id) then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  return public.spend_credits_atomic_unguarded(p_user_id, p_amount, p_description, p_category);
end
$$;
revoke all on function public.spend_credits_atomic(uuid, integer, text, text) from public, anon;
grant execute on function public.spend_credits_atomic(uuid, integer, text, text) to authenticated, service_role;

-- Legacy ledger credit: service role only. Never callable from a browser.
revoke all on function public.add_credits_atomic(uuid, integer, text, text, text) from public, anon, authenticated;
grant execute on function public.add_credits_atomic(uuid, integer, text, text, text) to service_role;

-- Reward credits: service role only, capped at 25 per claim and 50 per day.
create or replace function public.claim_reward_credits(p_amount integer, p_reason text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_today_total integer;
  v_new_balance integer;
begin
  if p_amount is null or p_amount <= 0 or p_amount > 25 then
    return jsonb_build_object('success', false, 'error', 'invalid_amount');
  end if;

  select coalesce(sum(amount), 0) into v_today_total
  from public.app_credit_ledger
  where user_id = auth.uid()
    and amount > 0
    and reason like 'reward:%'
    and created_at > now() - interval '24 hours';

  if v_today_total + p_amount > 50 then
    return jsonb_build_object('success', false, 'error', 'daily_reward_cap');
  end if;

  update public.app_credit_accounts
  set complimentary_credits = complimentary_credits + p_amount,
      updated_at = now()
  where user_id = auth.uid()
  returning complimentary_credits + purchased_credits into v_new_balance;

  if v_new_balance is null then
    return jsonb_build_object('success', false, 'error', 'no_account');
  end if;

  insert into public.app_credit_ledger (user_id, amount, balance_after, reason)
  values (auth.uid(), p_amount, v_new_balance, 'reward:' || coalesce(p_reason, 'unspecified'));

  return jsonb_build_object('success', true, 'total_credits', v_new_balance);
end;
$$;
revoke all on function public.claim_reward_credits(integer, text) from public, anon, authenticated;
grant execute on function public.claim_reward_credits(integer, text) to service_role;

-- Staff lookup by e-mail: moderators only.
create or replace function public.staff_lookup_user_by_email(p_email text)
returns table(user_id uuid, email text, full_name text)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.can_moderate(auth.uid()) then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  return query
  select up.user_id, up.email, up.full_name
  from user_profiles up
  where up.email = p_email
  limit 1;
end;
$$;
revoke all on function public.staff_lookup_user_by_email(text) from public, anon;
grant execute on function public.staff_lookup_user_by_email(text) to authenticated, service_role;
