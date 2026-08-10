-- Replaces per-message chat billing with real per-minute billing,
-- matching what the app's own pricing footnote has promised all along
-- ("Live chat: 2 credits/min") but was never actually implemented —
-- chat was instead charging a flat 10 credits per message, identical to
-- Mail's model, which is why the two felt indistinguishable in testing.
--
-- Sending a message itself is now free; credits are instead consumed by
-- an ambient per-minute timer while a chat window is actively open
-- (implemented client-side, mirroring the exact pattern already proven
-- for Video/Audio calls). This migration only needs to teach
-- spend_credits() to correctly recognize the new 'live_chat_minute'
-- reason and exempt every subscription tier (not just platinum/elite,
-- which is what the existing calling exemption covers) — matching
-- spend_message()'s existing promise that ALL paid tiers include
-- unlimited messaging.

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
  v_is_live_chat boolean;
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

  v_is_live_chat := lower(coalesce(p_reason,'')) = 'live_chat_minute';

  v_tier := public.app_active_tier(auth.uid());

  -- Staff bypass: free for every reason EXCEPT calling, which requires an
  -- active grant (unchanged from before).
  if p_amount = 0
     or (v_account.is_staff and not v_is_calling)
     or (v_account.is_staff and v_is_calling
         and public.has_active_staff_grant(auth.uid(), 'calling')) then
    insert into public.app_credit_ledger (user_id, amount, balance_after, reason, thread_id)
    values (auth.uid(), 0, v_total, coalesce(p_reason, 'spend'), p_thread_id);
    return jsonb_build_object('success', true, 'charged', 0, 'total_credits', v_total);
  end if;

  -- Platinum/Elite: video & audio calling is included in the subscription
  if v_tier in ('platinum','elite') and v_is_calling then
    insert into public.app_credit_ledger (user_id, amount, balance_after, reason, thread_id)
    values (auth.uid(), 0, v_total, lower(p_reason), p_thread_id);
    return jsonb_build_object('success', true, 'charged', 0, 'total_credits', v_total,
                              'free_reason', 'subscription');
  end if;

  -- ALL paid tiers include unlimited messaging, live chat included —
  -- matches spend_message()'s existing promise exactly.
  if v_tier in ('silver','gold','platinum','elite') and v_is_live_chat then
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

-- spend_message() now only handles Mail — first letter free, then a flat
-- charge for follow-ups (unchanged). Live chat no longer calls this
-- function at all; it's billed entirely by the ambient per-minute timer.
-- No change needed to spend_message() itself here, since Mail's existing
-- behavior is exactly what we want to keep for Mail specifically — this
-- comment documents the split for future reference, since the two
-- features sharing a spend function was the root of the reported
-- confusion in the first place.
