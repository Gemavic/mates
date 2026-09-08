/*
  A price table the server owns.

  Every charge in the app went through spend_credits(p_amount, p_reason),
  and the amount came from the browser. The server never looked a price up.
  A member could call spend_credits(1, 'video_call') and buy a minute of
  video for one credit. The constants in src/lib/exclusivePricing.ts are the
  same numbers; they now live here as well, and here is what is enforced.

  Three things:
    1. app_action_prices - one row per fixed-price action.
    2. charge_action(action, units, thread) and charge_mail(...) - RPCs that
       look the price up and call spend_credits themselves. New call sites
       use these.
    3. spend_credits itself now refuses an amount that does not match the
       table for a reason that is in the table. Old call sites that already
       send the right number keep working; a client sending the wrong number
       is refused with price_mismatch, whichever path it took.
*/

create table if not exists public.app_action_prices (
  action      text primary key,
  credits     integer not null check (credits >= 0),
  description text not null,
  updated_at  timestamptz not null default now()
);
alter table public.app_action_prices enable row level security;
create policy "prices are public" on public.app_action_prices for select to anon, authenticated using (true);
revoke insert, update, delete on public.app_action_prices from anon, authenticated;

insert into public.app_action_prices (action, credits, description) values
  ('super_like',        25, 'Super like'),
  ('video_call',        50, 'Video call, per minute, caller pays'),
  ('audio_call',        40, 'Voice call, per minute, caller pays'),
  ('media_reveal',      10, 'Reveal a locked photo'),
  ('mail_send',          5, 'Send a private mail'),
  ('mail_open',          5, 'Open a private mail'),
  ('mail_photo',        10, 'Photo attached to a mail, each'),
  ('mail_audio',        10, 'Audio attached to a mail, each'),
  ('mail_video',        20, 'Video attached to a mail, each'),
  ('mail_file',         10, 'File attached to a mail, each'),
  ('exclusive_send',    50, 'Send an exclusive mail, flat'),
  ('exclusive_unlock',  50, 'Open an exclusive mail, flat'),
  ('boost',             50, 'Profile boost, 30 minutes')
on conflict (action) do update set credits = excluded.credits, description = excluded.description, updated_at = now();

-- ---------------------------------------------------------------------------
-- charge_action: price looked up here; the browser sends the action name.
-- ---------------------------------------------------------------------------
create or replace function public.charge_action(
  p_action    text,
  p_units     integer default 1,
  p_thread_id text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_price integer;
begin
  if auth.uid() is null then
    return jsonb_build_object('success', false, 'error', 'not_signed_in');
  end if;
  if p_units is null or p_units < 1 or p_units > 100 then
    return jsonb_build_object('success', false, 'error', 'invalid_units');
  end if;
  select credits into v_price from public.app_action_prices where action = lower(p_action);
  if v_price is null then
    return jsonb_build_object('success', false, 'error', 'unknown_action');
  end if;
  return public.spend_credits(v_price * p_units, lower(p_action), p_thread_id);
end;
$$;
revoke all on function public.charge_action(text, integer, text) from public, anon;
grant execute on function public.charge_action(text, integer, text) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- charge_mail: the sum is computed here from counts, not sent as a total.
-- ---------------------------------------------------------------------------
create or replace function public.charge_mail(
  p_exclusive boolean,
  p_photos    integer default 0,
  p_audios    integer default 0,
  p_videos    integer default 0,
  p_files     integer default 0,
  p_thread_id text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_total integer;
  p       record;
begin
  if auth.uid() is null then
    return jsonb_build_object('success', false, 'error', 'not_signed_in');
  end if;
  if least(p_photos, p_audios, p_videos, p_files) < 0 or greatest(p_photos, p_audios, p_videos, p_files) > 20 then
    return jsonb_build_object('success', false, 'error', 'invalid_counts');
  end if;

  select
    max(credits) filter (where action = 'exclusive_send') as exclusive_send,
    max(credits) filter (where action = 'mail_send')      as mail_send,
    max(credits) filter (where action = 'mail_photo')     as mail_photo,
    max(credits) filter (where action = 'mail_audio')     as mail_audio,
    max(credits) filter (where action = 'mail_video')     as mail_video,
    max(credits) filter (where action = 'mail_file')      as mail_file
  into p from public.app_action_prices;

  if p_exclusive then
    v_total := p.exclusive_send;
  else
    v_total := p.mail_send
             + p_photos * p.mail_photo
             + p_audios * p.mail_audio
             + p_videos * p.mail_video
             + p_files  * p.mail_file;
  end if;

  -- 'private_mail' is deliberately not a row in the price table: the total is
  -- computed here, so the exact-price check in spend_credits does not apply.
  return public.spend_credits(v_total, case when p_exclusive then 'exclusive_send' else 'private_mail' end, p_thread_id)
         || jsonb_build_object('price', v_total);
end;
$$;
revoke all on function public.charge_mail(boolean, integer, integer, integer, integer, text) from public, anon;
grant execute on function public.charge_mail(boolean, integer, integer, integer, integer, text) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- spend_credits: same function, one new check at the top. If the reason names
-- a priced action, the amount must be a whole number of that price.
-- ---------------------------------------------------------------------------
create or replace function public.spend_credits(p_amount integer, p_reason text, p_thread_id text default null)
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
  v_listed  integer;
begin
  if p_amount is null or p_amount < 0 then
    return jsonb_build_object('success', false, 'error', 'invalid_amount');
  end if;

  -- The browser does not set prices. A reason that is in the price table
  -- must arrive with that price (or a multiple, for per-minute actions).
  select credits into v_listed from public.app_action_prices where action = lower(coalesce(p_reason, ''));
  if v_listed is not null and v_listed > 0 and (p_amount < v_listed or p_amount % v_listed <> 0) then
    return jsonb_build_object('success', false, 'error', 'price_mismatch',
                              'expected', v_listed, 'received', p_amount);
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

  if p_amount = 0
     or (v_account.is_staff and not v_is_calling)
     or (v_account.is_staff and v_is_calling
         and public.has_active_staff_grant(auth.uid(), 'calling')) then
    insert into public.app_credit_ledger (user_id, amount, balance_after, reason, thread_id)
    values (auth.uid(), 0, v_total, coalesce(p_reason, 'spend'), p_thread_id);
    return jsonb_build_object('success', true, 'charged', 0, 'total_credits', v_total);
  end if;

  if v_tier in ('platinum','elite') and v_is_calling then
    insert into public.app_credit_ledger (user_id, amount, balance_after, reason, thread_id)
    values (auth.uid(), 0, v_total, lower(p_reason), p_thread_id);
    return jsonb_build_object('success', true, 'charged', 0, 'total_credits', v_total,
                              'free_reason', 'subscription');
  end if;

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
