-- Whether the calling member may start a voice or video call right now.
--
-- The Twilio token functions minted a four-hour grant with no look at the
-- balance, so a member with zero credits could call the endpoint directly
-- and join a room. The browser timer that bills per minute is easily
-- stopped. This gate mirrors spend_credits' own free paths (staff with a
-- calling grant, platinum/elite tiers) and otherwise requires at least one
-- minute of credit before a token is issued.
--
-- It does not charge. Per-minute metering still happens elsewhere; this
-- only stops the front door being open to an empty account.

create or replace function public.can_start_call(p_kind text)
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
  if auth.uid() is null then
    return jsonb_build_object('allowed', false, 'reason', 'not_signed_in');
  end if;

  v_cost := case lower(coalesce(p_kind, ''))
              when 'video' then 50
              when 'audio' then 40
              else null
            end;
  if v_cost is null then
    return jsonb_build_object('allowed', false, 'reason', 'invalid_kind');
  end if;

  select * into v_account from public.app_credit_accounts where user_id = auth.uid();
  if not found then
    return jsonb_build_object('allowed', false, 'reason', 'no_account');
  end if;

  v_total := v_account.complimentary_credits + v_account.purchased_credits;

  if v_account.is_staff and public.has_active_staff_grant(auth.uid(), 'calling') then
    return jsonb_build_object('allowed', true, 'reason', 'staff_grant', 'total_credits', v_total);
  end if;

  v_tier := public.app_active_tier(auth.uid());
  if v_tier in ('platinum', 'elite') then
    return jsonb_build_object('allowed', true, 'reason', 'subscription', 'total_credits', v_total);
  end if;

  if v_total >= v_cost then
    return jsonb_build_object('allowed', true, 'reason', 'credits', 'total_credits', v_total, 'per_minute', v_cost);
  end if;

  return jsonb_build_object('allowed', false, 'reason', 'insufficient_credits',
                            'total_credits', v_total, 'per_minute', v_cost);
end;
$$;

revoke all on function public.can_start_call(text) from public, anon;
grant execute on function public.can_start_call(text) to authenticated, service_role;
