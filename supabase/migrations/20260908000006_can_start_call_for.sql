-- Service-role variant of can_start_call, for the voice webhook.
--
-- A voice token registers the browser as a Twilio Device, and a Device is
-- how a member RECEIVES calls, so the voice token cannot be gated on credit
-- without cutting off callees. The gate for voice therefore sits where the
-- call is placed: Twilio asks twilio-voice-twiml what to do with a dial, and
-- that webhook - authenticated by Twilio's own signature - knows the caller
-- from the From parameter. It calls this with the service role.

create or replace function public.can_start_call_for(p_user_id uuid, p_kind text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_account public.app_credit_accounts%rowtype;
  v_total   integer;
  v_cost    integer;
  v_tier    text;
begin
  if auth.role() is distinct from 'service_role' then
    return jsonb_build_object('allowed', false, 'reason', 'forbidden');
  end if;

  v_cost := case lower(coalesce(p_kind, '')) when 'video' then 50 when 'audio' then 40 else null end;
  if v_cost is null then
    return jsonb_build_object('allowed', false, 'reason', 'invalid_kind');
  end if;

  select * into v_account from public.app_credit_accounts where user_id = p_user_id;
  if not found then
    return jsonb_build_object('allowed', false, 'reason', 'no_account');
  end if;

  v_total := v_account.complimentary_credits + v_account.purchased_credits;

  if v_account.is_staff and public.has_active_staff_grant(p_user_id, 'calling') then
    return jsonb_build_object('allowed', true, 'reason', 'staff_grant', 'total_credits', v_total);
  end if;

  v_tier := public.app_active_tier(p_user_id);
  if v_tier in ('platinum', 'elite') then
    return jsonb_build_object('allowed', true, 'reason', 'subscription', 'total_credits', v_total);
  end if;

  if v_total >= v_cost then
    return jsonb_build_object('allowed', true, 'reason', 'credits', 'total_credits', v_total, 'per_minute', v_cost);
  end if;

  return jsonb_build_object('allowed', false, 'reason', 'insufficient_credits', 'total_credits', v_total, 'per_minute', v_cost);
end;
$$;

revoke all on function public.can_start_call_for(uuid, text) from public, anon, authenticated;
grant execute on function public.can_start_call_for(uuid, text) to service_role;
