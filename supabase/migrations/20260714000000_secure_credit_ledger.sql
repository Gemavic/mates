-- ============================================================================
-- SECURE CREDIT LEDGER
-- Server-side source of truth for all credits. Replaces localStorage credits.
--
-- Design principles:
--   1. Clients can only READ their own balance (RLS SELECT policy).
--   2. Clients can NEVER write balances directly. All mutations go through
--      SECURITY DEFINER functions that validate and log atomically.
--   3. Every mutation is recorded in an append-only transaction ledger.
--   4. Purchases are credited ONLY by your payment webhook using the
--      service_role key (never from the browser).
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. TABLES
-- ---------------------------------------------------------------------------

create table if not exists public.credit_accounts (
  user_id              uuid primary key references auth.users(id) on delete cascade,
  complimentary_credits integer not null default 0 check (complimentary_credits >= 0),
  purchased_credits     integer not null default 0 check (purchased_credits >= 0),
  is_staff              boolean not null default false,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create table if not exists public.credit_transactions (
  id          bigint generated always as identity primary key,
  user_id     uuid not null references auth.users(id) on delete cascade,
  amount      integer not null,                -- negative = spend, positive = grant
  balance_after integer not null,
  reason      text not null,
  thread_id   text,                            -- optional: message thread reference
  created_at  timestamptz not null default now()
);

create index if not exists idx_credit_tx_user_created
  on public.credit_transactions (user_id, created_at desc);

create index if not exists idx_credit_tx_user_thread
  on public.credit_transactions (user_id, thread_id)
  where thread_id is not null;

-- ---------------------------------------------------------------------------
-- 2. ROW LEVEL SECURITY — read own data only; NO client writes at all
-- ---------------------------------------------------------------------------

alter table public.credit_accounts     enable row level security;
alter table public.credit_transactions enable row level security;

drop policy if exists "read own credit account" on public.credit_accounts;
create policy "read own credit account"
  on public.credit_accounts for select
  using (auth.uid() = user_id);

drop policy if exists "read own transactions" on public.credit_transactions;
create policy "read own transactions"
  on public.credit_transactions for select
  using (auth.uid() = user_id);

-- Deliberately NO insert/update/delete policies for authenticated users.
-- Only SECURITY DEFINER functions below (and service_role) can mutate.

revoke insert, update, delete on public.credit_accounts     from anon, authenticated;
revoke insert, update, delete on public.credit_transactions from anon, authenticated;

-- ---------------------------------------------------------------------------
-- 3. WELCOME CREDITS — granted automatically when an account is created
-- ---------------------------------------------------------------------------

create or replace function public.handle_new_user_credits()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.credit_accounts (user_id, complimentary_credits)
  values (new.id, 20)                       -- 20 welcome credits
  on conflict (user_id) do nothing;

  insert into public.credit_transactions (user_id, amount, balance_after, reason)
  values (new.id, 20, 20, 'Welcome bonus');

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_credits on auth.users;
create trigger on_auth_user_created_credits
  after insert on auth.users
  for each row execute function public.handle_new_user_credits();

-- Backfill accounts for users that already exist
insert into public.credit_accounts (user_id, complimentary_credits)
select id, 20 from auth.users
on conflict (user_id) do nothing;

-- ---------------------------------------------------------------------------
-- 4. RPC: get_my_credits — the ONLY thing the client reads on load
-- ---------------------------------------------------------------------------

create or replace function public.get_my_credits()
returns table (
  complimentary_credits integer,
  purchased_credits     integer,
  total_credits         integer,
  is_staff              boolean
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
         a.is_staff
  from public.credit_accounts a
  where a.user_id = auth.uid();
end;
$$;

grant execute on function public.get_my_credits() to authenticated;

-- ---------------------------------------------------------------------------
-- 5. RPC: spend_credits — atomic validate + deduct + log
--    Deducts complimentary credits first, then purchased.
-- ---------------------------------------------------------------------------

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
  v_account public.credit_accounts%rowtype;
  v_total   integer;
  v_from_comp integer;
  v_from_purch integer;
begin
  if p_amount is null or p_amount < 0 then
    return jsonb_build_object('success', false, 'error', 'invalid_amount');
  end if;

  -- Lock the row so concurrent spends can't double-deduct
  select * into v_account
  from public.credit_accounts
  where user_id = auth.uid()
  for update;

  if not found then
    return jsonb_build_object('success', false, 'error', 'no_account');
  end if;

  -- Staff use features free of charge
  if v_account.is_staff or p_amount = 0 then
    return jsonb_build_object('success', true, 'charged', 0,
      'total_credits', v_account.complimentary_credits + v_account.purchased_credits);
  end if;

  v_total := v_account.complimentary_credits + v_account.purchased_credits;
  if v_total < p_amount then
    return jsonb_build_object('success', false, 'error', 'insufficient_credits',
      'total_credits', v_total);
  end if;

  v_from_comp  := least(v_account.complimentary_credits, p_amount);
  v_from_purch := p_amount - v_from_comp;

  update public.credit_accounts
  set complimentary_credits = complimentary_credits - v_from_comp,
      purchased_credits     = purchased_credits - v_from_purch,
      updated_at            = now()
  where user_id = auth.uid();

  insert into public.credit_transactions (user_id, amount, balance_after, reason, thread_id)
  values (auth.uid(), -p_amount, v_total - p_amount, coalesce(p_reason, 'spend'), p_thread_id);

  return jsonb_build_object('success', true, 'charged', p_amount,
    'total_credits', v_total - p_amount);
end;
$$;

grant execute on function public.spend_credits(integer, text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- 6. RPC: spend_message — first message in a thread is FREE, then 10 credits
-- ---------------------------------------------------------------------------

create or replace function public.spend_message(p_thread_id text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sent_before boolean;
begin
  if p_thread_id is null or length(p_thread_id) = 0 then
    return jsonb_build_object('success', false, 'error', 'missing_thread');
  end if;

  select exists (
    select 1 from public.credit_transactions
    where user_id = auth.uid()
      and thread_id = p_thread_id
      and reason = 'message'
  ) into v_sent_before;

  if not v_sent_before then
    -- Log a zero-cost transaction so the free message is only granted once
    insert into public.credit_transactions (user_id, amount, balance_after, reason, thread_id)
    select auth.uid(), 0,
           a.complimentary_credits + a.purchased_credits,
           'message', p_thread_id
    from public.credit_accounts a where a.user_id = auth.uid();

    return jsonb_build_object('success', true, 'charged', 0, 'is_free', true);
  end if;

  return public.spend_credits(10, 'message', p_thread_id) || jsonb_build_object('is_free', false);
end;
$$;

grant execute on function public.spend_message(text) to authenticated;

-- ---------------------------------------------------------------------------
-- 7. RPC: claim_reward_credits — small, capped complimentary grants
--    (quiz rewards, profile completion, etc.) Max 50/day per user.
-- ---------------------------------------------------------------------------

create or replace function public.claim_reward_credits(
  p_amount integer,
  p_reason text
)
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
  from public.credit_transactions
  where user_id = auth.uid()
    and amount > 0
    and reason like 'reward:%'
    and created_at > now() - interval '24 hours';

  if v_today_total + p_amount > 50 then
    return jsonb_build_object('success', false, 'error', 'daily_reward_cap');
  end if;

  update public.credit_accounts
  set complimentary_credits = complimentary_credits + p_amount,
      updated_at = now()
  where user_id = auth.uid()
  returning complimentary_credits + purchased_credits into v_new_balance;

  if v_new_balance is null then
    return jsonb_build_object('success', false, 'error', 'no_account');
  end if;

  insert into public.credit_transactions (user_id, amount, balance_after, reason)
  values (auth.uid(), p_amount, v_new_balance, 'reward:' || coalesce(p_reason, 'unspecified'));

  return jsonb_build_object('success', true, 'total_credits', v_new_balance);
end;
$$;

grant execute on function public.claim_reward_credits(integer, text) to authenticated;

-- ---------------------------------------------------------------------------
-- 8. PURCHASES — service role only (call from your payment webhook backend)
--    Never expose this to the browser. Example call from a webhook:
--      select public.credit_purchase('<user_id>', 125, 'stripe:pi_abc123');
-- ---------------------------------------------------------------------------

create or replace function public.credit_purchase(
  p_user_id uuid,
  p_credits integer,
  p_payment_ref text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_new_balance integer;
begin
  -- Only callable with the service_role key (webhook/server), never anon/auth
  if auth.role() is distinct from 'service_role' then
    return jsonb_build_object('success', false, 'error', 'forbidden');
  end if;

  if p_credits is null or p_credits <= 0 then
    return jsonb_build_object('success', false, 'error', 'invalid_amount');
  end if;

  -- Idempotency: never credit the same payment reference twice
  if exists (
    select 1 from public.credit_transactions
    where reason = 'purchase:' || p_payment_ref
  ) then
    return jsonb_build_object('success', false, 'error', 'duplicate_payment_ref');
  end if;

  update public.credit_accounts
  set purchased_credits = purchased_credits + p_credits,
      updated_at = now()
  where user_id = p_user_id
  returning complimentary_credits + purchased_credits into v_new_balance;

  if v_new_balance is null then
    return jsonb_build_object('success', false, 'error', 'no_account');
  end if;

  insert into public.credit_transactions (user_id, amount, balance_after, reason)
  values (p_user_id, p_credits, v_new_balance, 'purchase:' || p_payment_ref);

  return jsonb_build_object('success', true, 'total_credits', v_new_balance);
end;
$$;

-- No grant to authenticated/anon: service_role bypasses RLS and can execute.
revoke execute on function public.credit_purchase(uuid, integer, text) from anon, authenticated;
