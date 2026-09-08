-- Gifts and stickers: one server function charges and delivers.
--
-- Three screens (GiftShop, QuickGiftBar, StickerPicker) each read the price
-- out of the catalogue row, passed that number to spend_credits from the
-- browser, and then inserted the mail_messages row themselves. Two problems:
-- the browser named the price, and a failed insert after a successful charge
-- left the member paid-up with nothing delivered.
--
-- send_gift_message() looks the price up itself, charges through the same
-- ledger path as everything else, and writes the message in the same
-- transaction - so a gift is either paid for and delivered, or neither.
-- The deployed send-gift edge function, which charged the legacy
-- user_credits table nobody reads any more, is retired.

create or replace function public.send_gift_message(
  p_thread_id  uuid,
  p_gift_id    uuid default null,
  p_sticker_id uuid default null,
  p_note       text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_thread   public.mail_threads%rowtype;
  v_price    integer;
  v_name     text;
  v_icon     text;
  v_text     text;
  v_subject  text;
  v_reason   text;
  v_spend    jsonb;
  v_msg_id   uuid;
begin
  if auth.uid() is null then
    return jsonb_build_object('success', false, 'error', 'not_signed_in');
  end if;

  if (p_gift_id is null) = (p_sticker_id is null) then
    return jsonb_build_object('success', false, 'error', 'choose_one');
  end if;

  select * into v_thread from public.mail_threads where id = p_thread_id;
  if not found or (v_thread.participant1_id <> auth.uid() and v_thread.participant2_id <> auth.uid()) then
    return jsonb_build_object('success', false, 'error', 'not_a_participant');
  end if;

  if p_gift_id is not null then
    select credit_cost, name, coalesce(icon, '🎁') into v_price, v_name, v_icon
    from public.virtual_gifts where id = p_gift_id and coalesce(is_active, true);
    if not found then
      return jsonb_build_object('success', false, 'error', 'gift_not_found');
    end if;
    v_text := v_icon || ' Sent you a ' || v_name || '!';
    v_subject := 'Gift';
    v_reason := 'gift';
  else
    select credit_cost, name, coalesce(emoji, name) into v_price, v_name, v_icon
    from public.stickers where id = p_sticker_id and coalesce(is_active, true);
    if not found then
      return jsonb_build_object('success', false, 'error', 'sticker_not_found');
    end if;
    v_text := v_icon;
    v_subject := 'Sticker';
    v_reason := 'sticker';
  end if;

  v_price := greatest(coalesce(v_price, 0), 0);

  -- Charges the catalogue price. Staff are free on the same rules as
  -- everywhere else (spend_credits_for handles that).
  v_spend := public.spend_credits_for(auth.uid(), v_price, v_reason, p_thread_id::text);
  if coalesce((v_spend->>'success')::boolean, false) is not true then
    return jsonb_build_object('success', false,
      'error', coalesce(v_spend->>'error', 'spend_failed'),
      'total_credits', v_spend->'total_credits',
      'price', v_price);
  end if;

  insert into public.mail_messages
    (thread_id, sender_id, subject, message_text, gift_id, gift_note, sticker_id,
     credits_spent, has_photos, is_delivered, delivered_at, is_read)
  values
    (p_thread_id, auth.uid(), v_subject, v_text, p_gift_id,
     case when p_gift_id is not null then nullif(left(coalesce(p_note, ''), 500), '') end,
     p_sticker_id, coalesce((v_spend->>'charged')::integer, 0), false, true, now(), false)
  returning id into v_msg_id;

  update public.mail_threads set updated_at = now() where id = p_thread_id;

  return jsonb_build_object('success', true,
    'message_id', v_msg_id,
    'text', v_text,
    'charged', coalesce((v_spend->>'charged')::integer, 0),
    'total_credits', v_spend->'total_credits');
end;
$$;

revoke all on function public.send_gift_message(uuid, uuid, uuid, text) from public, anon;
grant execute on function public.send_gift_message(uuid, uuid, uuid, text) to authenticated, service_role;
