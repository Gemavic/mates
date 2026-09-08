/*
  record_like - the one place a like, super like, blink or pass is written.

  Until now the Discovery screen wrote nothing at all. Swiping right sent
  the other person a notification and advanced the card; the row that
  makes a match possible was never inserted. Super Like charged 25 credits
  client-side (well, 5 - the price was different in four files) and then
  also wrote nothing. Money for a no-op.

  This function charges and records in ONE transaction, so a failed insert
  rolls back the charge and a failed charge never records the like. The
  price lives here, not in the browser.

  Rules:
    - like, blink, pass: free.
    - super_like: 25 credits, charged through spend_credits so staff
      grants and subscription tiers are honoured exactly as elsewhere.
    - Re-sending a super like to the same person is not charged again.
    - Upgrading an existing like to a super like IS charged.
    - You cannot like yourself.
*/

create or replace function public.record_like(
  p_target_user_id uuid,
  p_like_type text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me         uuid := auth.uid();
  v_cost       integer := 0;
  v_existing   text;
  v_spend      jsonb;
  v_charged    integer := 0;
  v_balance    integer;
  v_is_match   boolean := false;
begin
  if v_me is null then
    return jsonb_build_object('success', false, 'error', 'not_signed_in');
  end if;

  if p_target_user_id is null or p_target_user_id = v_me then
    return jsonb_build_object('success', false, 'error', 'invalid_target');
  end if;

  if p_like_type not in ('like', 'super_like', 'blink', 'pass') then
    return jsonb_build_object('success', false, 'error', 'invalid_like_type');
  end if;

  if not exists (select 1 from public.user_profiles where user_id = p_target_user_id) then
    return jsonb_build_object('success', false, 'error', 'no_such_user');
  end if;

  select like_type into v_existing
  from public.user_likes
  where user_id = v_me and target_user_id = p_target_user_id
  for update;

  if p_like_type = 'super_like' and coalesce(v_existing, '') <> 'super_like' then
    v_cost := 25;
  end if;

  if v_cost > 0 then
    v_spend := public.spend_credits(v_cost, 'super_like', null);
    if not coalesce((v_spend->>'success')::boolean, false) then
      return jsonb_build_object(
        'success', false,
        'error', coalesce(v_spend->>'error', 'charge_failed'),
        'total_credits', v_spend->'total_credits',
        'required', v_cost
      );
    end if;
    v_charged := coalesce((v_spend->>'charged')::int, 0);
    v_balance := (v_spend->>'total_credits')::int;
  end if;

  insert into public.user_likes (user_id, target_user_id, like_type)
  values (v_me, p_target_user_id, p_like_type)
  on conflict (user_id, target_user_id)
  do update set like_type = excluded.like_type, created_at = now();

  if p_like_type in ('like', 'super_like') then
    select exists (
      select 1 from public.user_likes
      where user_id = p_target_user_id
        and target_user_id = v_me
        and like_type in ('like', 'super_like')
    ) into v_is_match;
  end if;

  if v_balance is null then
    select complimentary_credits + purchased_credits into v_balance
    from public.app_credit_accounts where user_id = v_me;
  end if;

  return jsonb_build_object(
    'success', true,
    'like_type', p_like_type,
    'charged', v_charged,
    'total_credits', coalesce(v_balance, 0),
    'is_match', v_is_match
  );
end;
$$;

revoke all on function public.record_like(uuid, text) from public, anon;
grant execute on function public.record_like(uuid, text) to authenticated, service_role;
