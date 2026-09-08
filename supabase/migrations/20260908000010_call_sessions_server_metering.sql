-- Server-side call metering.
--
-- Until now a setInterval in the member's browser charged one minute of
-- credit every sixty seconds. Stop the timer and the Twilio room carried on
-- for free. From here the browser only shows a clock; the server keeps the
-- meter:
--
--   1. When a call is placed, twilio-video-token (video) or twilio-voice-twiml
--      (voice) opens a call_sessions row with start_call_session(). That
--      returns the cap the caller can afford, which is handed to Twilio as
--      MaxParticipantDuration (video) or <Dial timeLimit> (voice), so the
--      call physically cannot outrun the balance it started with.
--   2. Twilio status callbacks (twilio-call-status) mark the session answered
--      and ended. Answering charges the first minute at once.
--   3. pg_cron runs meter_active_call_sessions() every minute, charging each
--      active session for the minutes that have elapsed since it was last
--      billed. A session whose caller can no longer pay is flagged for
--      hang-up; call-reconcile ends it at Twilio.
--   4. The end callback bills the true duration (DialCallDuration for voice,
--      answered_at -> Timestamp for video), so the cron and the callback
--      agree to the minute and neither double-charges.
--
-- spend_credits keeps its behaviour but is now a wrapper over
-- spend_credits_for(user, ...), so the cron - which has no auth.uid() - can
-- debit through exactly the same lock-check-debit-ledger path as a browser.

-- ---------------------------------------------------------------------------
-- spend_credits_for: the one debit path, callable on behalf of a member.
-- ---------------------------------------------------------------------------
create or replace function public.spend_credits_for(
  p_user_id   uuid,
  p_amount    integer,
  p_reason    text,
  p_thread_id text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_account    public.app_credit_accounts%rowtype;
  v_tier       text;
  v_total      integer;
  v_from_comp  integer;
  v_from_purch integer;
  v_is_calling boolean;
  v_is_live_chat boolean;
  v_listed     integer;
begin
  if p_user_id is null then
    return jsonb_build_object('success', false, 'error', 'no_user');
  end if;

  -- Only the member themself, the service role, or an in-database caller
  -- (the cron runs as postgres) may debit an account.
  if auth.uid() is distinct from p_user_id
     and coalesce(auth.role(), '') <> 'service_role'
     and session_user <> 'postgres' then
    return jsonb_build_object('success', false, 'error', 'forbidden');
  end if;

  if p_amount is null or p_amount < 0 then
    return jsonb_build_object('success', false, 'error', 'invalid_amount');
  end if;

  select credits into v_listed from public.app_action_prices where action = lower(coalesce(p_reason, ''));
  if v_listed is not null and v_listed > 0 and (p_amount < v_listed or p_amount % v_listed <> 0) then
    return jsonb_build_object('success', false, 'error', 'price_mismatch',
                              'expected', v_listed, 'received', p_amount);
  end if;

  select * into v_account
  from public.app_credit_accounts
  where user_id = p_user_id
  for update;

  if not found then
    return jsonb_build_object('success', false, 'error', 'no_account');
  end if;

  v_total := v_account.complimentary_credits + v_account.purchased_credits;

  v_is_calling := lower(coalesce(p_reason,'')) in
    ('video_call','audio_call','video','audio',
     'video_message','audio_message','video message','audio message');

  v_is_live_chat := lower(coalesce(p_reason,'')) = 'live_chat_minute';

  v_tier := public.app_active_tier(p_user_id);

  if p_amount = 0
     or (v_account.is_staff and not v_is_calling)
     or (v_account.is_staff and v_is_calling
         and public.has_active_staff_grant(p_user_id, 'calling')) then
    insert into public.app_credit_ledger (user_id, amount, balance_after, reason, thread_id)
    values (p_user_id, 0, v_total, coalesce(p_reason, 'spend'), p_thread_id);
    return jsonb_build_object('success', true, 'charged', 0, 'total_credits', v_total);
  end if;

  if v_tier in ('platinum','elite') and v_is_calling then
    insert into public.app_credit_ledger (user_id, amount, balance_after, reason, thread_id)
    values (p_user_id, 0, v_total, lower(p_reason), p_thread_id);
    return jsonb_build_object('success', true, 'charged', 0, 'total_credits', v_total,
                              'free_reason', 'subscription');
  end if;

  if v_tier in ('silver','gold','platinum','elite') and v_is_live_chat then
    insert into public.app_credit_ledger (user_id, amount, balance_after, reason, thread_id)
    values (p_user_id, 0, v_total, lower(p_reason), p_thread_id);
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
  where user_id = p_user_id;

  insert into public.app_credit_ledger (user_id, amount, balance_after, reason, thread_id)
  values (p_user_id, -p_amount, v_total - p_amount, coalesce(p_reason, 'spend'), p_thread_id);

  return jsonb_build_object('success', true, 'charged', p_amount,
    'total_credits', v_total - p_amount);
end;
$$;

revoke all on function public.spend_credits_for(uuid, integer, text, text) from public, anon, authenticated;
grant execute on function public.spend_credits_for(uuid, integer, text, text) to service_role;

-- The browser-facing function is now a thin wrapper. Same signature, same
-- results, one implementation.
create or replace function public.spend_credits(p_amount integer, p_reason text, p_thread_id text default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    return jsonb_build_object('success', false, 'error', 'no_account');
  end if;
  return public.spend_credits_for(auth.uid(), p_amount, p_reason, p_thread_id);
end;
$$;

-- ---------------------------------------------------------------------------
-- call_sessions
-- ---------------------------------------------------------------------------
create table if not exists public.call_sessions (
  id                uuid primary key default gen_random_uuid(),
  kind              text not null check (kind in ('video', 'audio')),
  caller_id         uuid not null references auth.users(id) on delete cascade,
  callee_id         uuid references auth.users(id) on delete set null,
  room_name         text,
  provider_sid      text,                       -- Twilio RoomSid or the caller leg's CallSid
  per_minute        integer not null,
  free_reason       text,                       -- 'staff_grant' | 'subscription' | null
  max_seconds       integer not null,           -- the cap handed to Twilio
  status            text not null default 'ringing' check (status in ('ringing', 'active', 'ended')),
  created_at        timestamptz not null default now(),
  answered_at       timestamptz,
  ended_at          timestamptz,
  end_reason        text,
  billed_seconds    integer not null default 0,
  credits_charged   integer not null default 0,
  shortfall_credits integer not null default 0,
  hangup_requested  boolean not null default false,
  hung_up_at        timestamptz,
  last_event        text,
  updated_at        timestamptz not null default now()
);

create index if not exists call_sessions_caller_idx on public.call_sessions (caller_id, created_at desc);
create index if not exists call_sessions_live_idx on public.call_sessions (status) where status in ('ringing', 'active');
create index if not exists call_sessions_provider_idx on public.call_sessions (provider_sid);

alter table public.call_sessions enable row level security;

drop policy if exists "call sessions: participants read" on public.call_sessions;
create policy "call sessions: participants read"
  on public.call_sessions for select
  to authenticated
  using (caller_id = auth.uid() or callee_id = auth.uid());

revoke all on public.call_sessions from anon, authenticated;
grant select on public.call_sessions to authenticated;
grant all on public.call_sessions to service_role;

-- ---------------------------------------------------------------------------
-- start_call_session: open the meter and say how long the caller can afford.
-- ---------------------------------------------------------------------------
create or replace function public.start_call_session(
  p_caller_id    uuid,
  p_callee_id    uuid,
  p_kind         text,
  p_room_name    text default null,
  p_provider_sid text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_gate       jsonb;
  v_per_minute integer;
  v_total      integer;
  v_free       text;
  v_max        integer;
  v_floor      integer;
  v_id         uuid;
begin
  if coalesce(auth.role(), '') <> 'service_role' and session_user <> 'postgres' then
    return jsonb_build_object('allowed', false, 'reason', 'forbidden');
  end if;

  if p_kind not in ('video', 'audio') then
    return jsonb_build_object('allowed', false, 'reason', 'invalid_kind');
  end if;

  v_gate := public.can_start_call_for(p_caller_id, p_kind);
  if coalesce((v_gate->>'allowed')::boolean, false) is not true then
    return v_gate;
  end if;

  select credits into v_per_minute from public.app_action_prices where action = p_kind || '_call';
  v_per_minute := coalesce(v_per_minute, case p_kind when 'video' then 50 else 40 end);
  v_total := coalesce((v_gate->>'total_credits')::integer, 0);

  v_free := case v_gate->>'reason'
              when 'staff_grant' then 'staff_grant'
              when 'subscription' then 'subscription'
              else null
            end;

  -- Four hours is Twilio's own ceiling. A paying caller gets the whole
  -- minutes their balance covers, so the call cannot outrun the money.
  -- Twilio refuses a video MaxParticipantDuration under 600 seconds (error
  -- 53123), so a video cap is at least ten minutes; inside that window the
  -- per-minute meter flags a caller who runs out and call-reconcile hangs
  -- up on the next tick. Voice's <Dial timeLimit> has no such floor.
  v_floor := case p_kind when 'video' then 600 else 60 end;
  v_max := case
             when v_free is not null then 14400
             else least(14400, greatest(v_floor, (v_total / v_per_minute) * 60))
           end;

  -- A caller who rang and never connected leaves a 'ringing' row behind;
  -- placing a new call supersedes it.
  update public.call_sessions
  set status = 'ended', ended_at = now(), end_reason = 'superseded', updated_at = now()
  where caller_id = p_caller_id and status = 'ringing';

  insert into public.call_sessions
    (kind, caller_id, callee_id, room_name, provider_sid, per_minute, free_reason, max_seconds)
  values
    (p_kind, p_caller_id, p_callee_id, p_room_name, p_provider_sid, v_per_minute, v_free, v_max)
  returning id into v_id;

  return jsonb_build_object(
    'allowed', true,
    'session_id', v_id,
    'per_minute', v_per_minute,
    'max_seconds', v_max,
    'free_reason', v_free,
    'total_credits', v_total
  );
end;
$$;

revoke all on function public.start_call_session(uuid, uuid, text, text, text) from public, anon, authenticated;
grant execute on function public.start_call_session(uuid, uuid, text, text, text) to service_role;

create or replace function public.attach_call_provider_sid(p_session_id uuid, p_provider_sid text)
returns void
language sql
security definer
set search_path = public
as $$
  update public.call_sessions
  set provider_sid = coalesce(p_provider_sid, provider_sid), updated_at = now()
  where id = p_session_id
    and (coalesce(auth.role(), '') = 'service_role' or session_user = 'postgres');
$$;

revoke all on function public.attach_call_provider_sid(uuid, text) from public, anon, authenticated;
grant execute on function public.attach_call_provider_sid(uuid, text) to service_role;

-- ---------------------------------------------------------------------------
-- bill_call_session: charge whatever has elapsed and not yet been billed.
-- One minute per debit, so a balance that covers three of five minutes pays
-- for three and records the shortfall on the other two.
-- ---------------------------------------------------------------------------
create or replace function public.bill_call_session(
  p_session_id    uuid,
  p_through       timestamptz default now(),
  p_final_seconds integer default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  s          public.call_sessions%rowtype;
  v_elapsed  integer;
  v_due_min  integer;
  v_billed   integer;
  v_to_bill  integer;
  v_spend    jsonb;
  v_charged  integer := 0;
  v_hangup   boolean := false;
begin
  if coalesce(auth.role(), '') <> 'service_role' and session_user <> 'postgres' then
    return jsonb_build_object('success', false, 'error', 'forbidden');
  end if;

  select * into s from public.call_sessions where id = p_session_id for update;
  if not found then
    return jsonb_build_object('success', false, 'error', 'not_found');
  end if;
  if s.answered_at is null then
    return jsonb_build_object('success', true, 'billed_seconds', 0, 'note', 'not_answered');
  end if;

  v_elapsed := coalesce(
    p_final_seconds,
    greatest(0, floor(extract(epoch from (p_through - s.answered_at)))::integer)
  );
  v_elapsed := least(v_elapsed, s.max_seconds);

  -- A connected call is a minute, and every started minute is a minute.
  v_due_min := greatest(1, ceil(v_elapsed / 60.0))::integer;
  v_billed  := s.billed_seconds / 60;
  v_to_bill := v_due_min - v_billed;

  while v_to_bill > 0 loop
    if s.free_reason is not null or s.per_minute = 0 then
      s.billed_seconds := s.billed_seconds + v_to_bill * 60;
      v_to_bill := 0;
      exit;
    end if;

    v_spend := public.spend_credits_for(s.caller_id, s.per_minute, s.kind || '_call', s.id::text);
    if coalesce((v_spend->>'success')::boolean, false) then
      v_charged := v_charged + coalesce((v_spend->>'charged')::integer, 0);
      s.credits_charged := s.credits_charged + coalesce((v_spend->>'charged')::integer, 0);
      s.billed_seconds := s.billed_seconds + 60;
      v_to_bill := v_to_bill - 1;
    else
      s.shortfall_credits := s.shortfall_credits + v_to_bill * s.per_minute;
      v_hangup := true;
      v_to_bill := 0;
      exit;
    end if;
  end loop;

  update public.call_sessions
  set billed_seconds    = s.billed_seconds,
      credits_charged   = s.credits_charged,
      shortfall_credits = s.shortfall_credits,
      hangup_requested  = hangup_requested or v_hangup,
      updated_at        = now()
  where id = s.id;

  return jsonb_build_object('success', true, 'charged_now', v_charged,
                            'billed_seconds', s.billed_seconds,
                            'shortfall_credits', s.shortfall_credits,
                            'hangup_requested', v_hangup);
end;
$$;

revoke all on function public.bill_call_session(uuid, timestamptz, integer) from public, anon, authenticated;
grant execute on function public.bill_call_session(uuid, timestamptz, integer) to service_role;

-- ---------------------------------------------------------------------------
-- mark_call_answered / end_call_session: driven by Twilio's callbacks.
-- ---------------------------------------------------------------------------
create or replace function public.mark_call_answered(p_session_id uuid, p_at timestamptz default now(), p_event text default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  s public.call_sessions%rowtype;
begin
  if coalesce(auth.role(), '') <> 'service_role' and session_user <> 'postgres' then
    return jsonb_build_object('success', false, 'error', 'forbidden');
  end if;

  select * into s from public.call_sessions where id = p_session_id for update;
  if not found then
    return jsonb_build_object('success', false, 'error', 'not_found');
  end if;
  if s.status = 'ended' then
    return jsonb_build_object('success', true, 'note', 'already_ended');
  end if;
  if s.answered_at is not null then
    return jsonb_build_object('success', true, 'note', 'already_answered');
  end if;

  update public.call_sessions
  set status = 'active', answered_at = coalesce(p_at, now()), last_event = p_event, updated_at = now()
  where id = s.id;

  -- The first minute is paid when the other person picks up.
  return public.bill_call_session(s.id, coalesce(p_at, now()));
end;
$$;

revoke all on function public.mark_call_answered(uuid, timestamptz, text) from public, anon, authenticated;
grant execute on function public.mark_call_answered(uuid, timestamptz, text) to service_role;

create or replace function public.end_call_session(
  p_session_id       uuid,
  p_at               timestamptz default now(),
  p_reason           text default 'completed',
  p_duration_seconds integer default null,
  p_event            text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  s      public.call_sessions%rowtype;
  v_bill jsonb := '{}'::jsonb;
begin
  if coalesce(auth.role(), '') <> 'service_role' and session_user <> 'postgres' then
    return jsonb_build_object('success', false, 'error', 'forbidden');
  end if;

  select * into s from public.call_sessions where id = p_session_id for update;
  if not found then
    return jsonb_build_object('success', false, 'error', 'not_found');
  end if;
  if s.status = 'ended' then
    return jsonb_build_object('success', true, 'note', 'already_ended',
                              'credits_charged', s.credits_charged);
  end if;

  if s.status = 'active' then
    v_bill := public.bill_call_session(s.id, coalesce(p_at, now()), p_duration_seconds);
  end if;

  update public.call_sessions
  set status = 'ended',
      ended_at = coalesce(p_at, now()),
      end_reason = case when s.status = 'ringing' then 'unanswered:' || coalesce(p_reason, 'unknown') else p_reason end,
      last_event = coalesce(p_event, last_event),
      updated_at = now()
  where id = s.id;

  select * into s from public.call_sessions where id = p_session_id;
  return jsonb_build_object('success', true, 'credits_charged', s.credits_charged,
                            'billed_seconds', s.billed_seconds,
                            'shortfall_credits', s.shortfall_credits, 'bill', v_bill);
end;
$$;

revoke all on function public.end_call_session(uuid, timestamptz, text, integer, text) from public, anon, authenticated;
grant execute on function public.end_call_session(uuid, timestamptz, text, integer, text) to service_role;

-- Video rooms report every participant. The meter starts when somebody other
-- than the caller is in the room - that is the callee picking up.
create or replace function public.call_session_peer_connected(p_session_id uuid, p_identity text, p_at timestamptz default now())
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  s public.call_sessions%rowtype;
begin
  if coalesce(auth.role(), '') <> 'service_role' and session_user <> 'postgres' then
    return jsonb_build_object('success', false, 'error', 'forbidden');
  end if;

  select * into s from public.call_sessions where id = p_session_id;
  if not found then
    return jsonb_build_object('success', false, 'error', 'not_found');
  end if;

  if p_identity = 'user_' || s.caller_id::text then
    update public.call_sessions set last_event = 'caller_connected', updated_at = now() where id = s.id;
    return jsonb_build_object('success', true, 'note', 'caller');
  end if;

  return public.mark_call_answered(s.id, p_at, 'peer_connected:' || coalesce(p_identity, ''));
end;
$$;

revoke all on function public.call_session_peer_connected(uuid, text, timestamptz) from public, anon, authenticated;
grant execute on function public.call_session_peer_connected(uuid, text, timestamptz) to service_role;

-- ---------------------------------------------------------------------------
-- The minute-by-minute meter, run by pg_cron.
-- ---------------------------------------------------------------------------
create or replace function public.meter_active_call_sessions()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  r          record;
  v_metered  integer := 0;
  v_timed    integer := 0;
  v_stale    integer := 0;
begin
  if coalesce(auth.role(), '') <> 'service_role' and session_user <> 'postgres' then
    return jsonb_build_object('success', false, 'error', 'forbidden');
  end if;

  -- Calls that outran their cap and whose end callback never arrived: close
  -- them at the cap. Twilio has already dropped them.
  for r in
    select id, max_seconds from public.call_sessions
    where status = 'active'
      and answered_at + (max_seconds || ' seconds')::interval + interval '3 minutes' < now()
  loop
    perform public.end_call_session(r.id, now(), 'reconciled_timeout', r.max_seconds, 'cron');
    v_timed := v_timed + 1;
  end loop;

  -- Rings that never connected.
  update public.call_sessions
  set status = 'ended', ended_at = now(), end_reason = 'unanswered:stale', updated_at = now()
  where status = 'ringing' and created_at < now() - interval '10 minutes';
  get diagnostics v_stale = row_count;

  for r in select id from public.call_sessions where status = 'active' loop
    perform public.bill_call_session(r.id, now());
    v_metered := v_metered + 1;
  end loop;

  return jsonb_build_object('metered', v_metered, 'timed_out', v_timed, 'stale_rings', v_stale);
end;
$$;

revoke all on function public.meter_active_call_sessions() from public, anon, authenticated;
grant execute on function public.meter_active_call_sessions() to service_role;

-- What call-reconcile needs: the calls to hang up at Twilio.
create or replace function public.call_hangups_due()
returns table (id uuid, kind text, provider_sid text, room_name text)
language sql
security definer
set search_path = public
as $$
  select id, kind, provider_sid, room_name
  from public.call_sessions
  where status = 'active' and hangup_requested and hung_up_at is null
    and (coalesce(auth.role(), '') = 'service_role' or session_user = 'postgres');
$$;

revoke all on function public.call_hangups_due() from public, anon, authenticated;
grant execute on function public.call_hangups_due() to service_role;

create or replace function public.mark_call_hung_up(p_session_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.call_sessions
  set hung_up_at = now(), updated_at = now()
  where id = p_session_id
    and (coalesce(auth.role(), '') = 'service_role' or session_user = 'postgres');
$$;

revoke all on function public.mark_call_hung_up(uuid) from public, anon, authenticated;
grant execute on function public.mark_call_hung_up(uuid) to service_role;

-- ---------------------------------------------------------------------------
-- A shared key so the cron can call the call-reconcile edge function, and the
-- function can tell the cron from a stranger. Lives in Vault; never in code.
-- ---------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from vault.secrets where name = 'call_reconcile_key') then
    perform vault.create_secret(encode(extensions.gen_random_bytes(24), 'hex'), 'call_reconcile_key',
                                'Shared key between pg_cron and the call-reconcile edge function');
  end if;
end;
$$;

create or replace function public.call_reconcile_key_matches(p_key text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_secret text;
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    return false;
  end if;
  select decrypted_secret into v_secret from vault.decrypted_secrets where name = 'call_reconcile_key';
  return v_secret is not null and p_key is not null and length(p_key) = length(v_secret)
         and p_key = v_secret;
end;
$$;

revoke all on function public.call_reconcile_key_matches(text) from public, anon, authenticated;
grant execute on function public.call_reconcile_key_matches(text) to service_role;

-- Runs every minute: meter, then - only if something must be hung up - poke
-- the edge function that talks to Twilio.
create or replace function public.call_metering_tick()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_key text;
begin
  perform public.meter_active_call_sessions();

  if exists (select 1 from public.call_sessions
             where status = 'active' and hangup_requested and hung_up_at is null) then
    select decrypted_secret into v_key from vault.decrypted_secrets where name = 'call_reconcile_key';
    perform net.http_post(
      url     := 'https://mkgebkkbgiwjqemfakyg.supabase.co/functions/v1/call-reconcile',
      headers := jsonb_build_object('Content-Type', 'application/json', 'x-reconcile-key', coalesce(v_key, '')),
      body    := '{}'::jsonb
    );
  end if;
end;
$$;

revoke all on function public.call_metering_tick() from public, anon, authenticated;

select cron.schedule('call-metering-tick', '* * * * *', $$select public.call_metering_tick();$$);

-- can_start_call_for is consulted by start_call_session, which the cron and
-- in-database tests also reach; accept the postgres session as well as the
-- service role. Browser roles are still refused.
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
  if coalesce(auth.role(), '') <> 'service_role' and session_user <> 'postgres' then
    return jsonb_build_object('allowed', false, 'reason', 'forbidden');
  end if;

  select credits into v_cost from public.app_action_prices where action = lower(coalesce(p_kind, '')) || '_call';
  v_cost := coalesce(v_cost, case lower(coalesce(p_kind, '')) when 'video' then 50 when 'audio' then 40 else null end);
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
