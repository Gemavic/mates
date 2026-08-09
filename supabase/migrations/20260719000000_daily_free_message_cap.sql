-- Caps the free-first-message-per-thread benefit to 12 grants per rolling
-- 24 hours. Once a user has used their 12 free thread-starts in the last
-- day, any further new thread's first message is charged normally (10
-- credits) instead of being free — existing paid conversations and
-- replies are completely unaffected either way. Staff remain unaffected
-- (spend_credits already treats them as free regardless of this cap).

drop function if exists public.spend_message(text);
create or replace function public.spend_message(p_thread_id text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sent_before boolean;
  v_free_today  integer;
begin
  if p_thread_id is null or length(p_thread_id) = 0 then
    return jsonb_build_object('success', false, 'error', 'missing_thread');
  end if;

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
      -- Log a zero-cost transaction so the free message is only granted once
      insert into public.app_credit_ledger (user_id, amount, balance_after, reason, thread_id)
      select auth.uid(), 0,
             a.complimentary_credits + a.purchased_credits,
             'message', p_thread_id
      from public.app_credit_accounts a where a.user_id = auth.uid();

      return jsonb_build_object('success', true, 'charged', 0, 'is_free', true,
        'free_messages_remaining_today', 12 - v_free_today - 1);
    end if;

    -- Daily free-thread quota used up — this thread's first message is
    -- charged like any other message instead of being free.
    return public.spend_credits(10, 'message', p_thread_id)
      || jsonb_build_object('is_free', false, 'daily_free_limit_reached', true);
  end if;

  return public.spend_credits(10, 'message', p_thread_id) || jsonb_build_object('is_free', false);
end;
$$;

grant execute on function public.spend_message(text) to authenticated;
