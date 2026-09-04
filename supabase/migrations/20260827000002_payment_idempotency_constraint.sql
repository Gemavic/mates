-- Turn the payment-reference idempotency guard from a check-then-act into
-- something the database enforces.
--
-- credit_purchase() and activate_subscription() both guarded against
-- double-crediting with "if exists (select 1 ...)" followed by an insert.
-- Under READ COMMITTED that is check-then-act with nothing behind it: two
-- transactions can both find no row and both insert. That was theoretical
-- while the IPN webhook was the only caller; it is not any more, because
-- /api/check-payment-status credits too, so a person tapping "Check Status
-- Now" as the IPN lands has two callers racing on one payment reference —
-- and both paths now also email a receipt.

create unique index if not exists app_credit_ledger_payment_ref_uniq
  on public.app_credit_ledger (reason)
  where reason like 'purchase:%' or reason like 'subscription:%';

-- With the index in place the loser of the race hits a unique_violation.
-- Unhandled, that would surface to the webhook as a 500 and make
-- NOWPayments retry a payment that was in fact already credited. So the
-- ledger write moves inside a block that reports the violation as exactly
-- what it is — a duplicate — which is the answer both callers already know
-- how to handle. plpgsql runs an EXCEPTION block as a subtransaction, so
-- the credit increment is rolled back with it rather than left applied.
--
-- Everything else in both functions is unchanged.

create or replace function public.credit_purchase(p_user_id uuid, p_credits integer, p_payment_ref text)
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  v_new_balance integer;
begin
  if auth.role() is distinct from 'service_role' then
    return jsonb_build_object('success', false, 'error', 'forbidden');
  end if;

  if p_credits is null or p_credits <= 0 then
    return jsonb_build_object('success', false, 'error', 'invalid_amount');
  end if;

  if exists (
    select 1 from public.app_credit_ledger
    where reason = 'purchase:' || p_payment_ref
  ) then
    return jsonb_build_object('success', false, 'error', 'duplicate_payment_ref');
  end if;

  begin
    update public.app_credit_accounts
    set purchased_credits = purchased_credits + p_credits,
        updated_at = now()
    where user_id = p_user_id
    returning complimentary_credits + purchased_credits into v_new_balance;

    if v_new_balance is null then
      return jsonb_build_object('success', false, 'error', 'no_account');
    end if;

    insert into public.app_credit_ledger (user_id, amount, balance_after, reason)
    values (p_user_id, p_credits, v_new_balance, 'purchase:' || p_payment_ref);
  exception
    when unique_violation then
      return jsonb_build_object('success', false, 'error', 'duplicate_payment_ref');
  end;

  return jsonb_build_object('success', true, 'total_credits', v_new_balance);
end;
$function$;

create or replace function public.activate_subscription(p_user_id uuid, p_tier text, p_period_end timestamp with time zone, p_payment_ref text)
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
begin
  if auth.role() is distinct from 'service_role' then
    return jsonb_build_object('success', false, 'error', 'forbidden');
  end if;

  if p_tier not in ('silver','gold','platinum','elite') then
    return jsonb_build_object('success', false, 'error', 'invalid_tier');
  end if;

  if exists (
    select 1 from public.app_credit_ledger
    where reason = 'subscription:' || p_payment_ref
  ) then
    return jsonb_build_object('success', false, 'error', 'duplicate_payment_ref');
  end if;

  begin
    insert into public.app_subscriptions (user_id, tier, status, current_period_end, payment_ref)
    values (p_user_id, p_tier, 'active', p_period_end, p_payment_ref)
    on conflict (user_id) do update
      set tier = excluded.tier,
          status = 'active',
          current_period_end = excluded.current_period_end,
          payment_ref = excluded.payment_ref,
          updated_at = now();

    insert into public.app_credit_ledger (user_id, amount, balance_after, reason)
    select p_user_id, 0, a.complimentary_credits + a.purchased_credits,
           'subscription:' || p_payment_ref
    from public.app_credit_accounts a where a.user_id = p_user_id;
  exception
    when unique_violation then
      return jsonb_build_object('success', false, 'error', 'duplicate_payment_ref');
  end;

  return jsonb_build_object('success', true, 'tier', p_tier,
                            'expires', p_period_end);
end;
$function$;
