-- Notification preferences + the member-facing subscription cancellation
-- California's Automatic Renewal Law requires. Applied to production on
-- 2026-08-27; kept here so a fresh database matches.

create table if not exists public.user_notification_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email_notifications boolean not null default true,
  email_messages      boolean not null default true,
  email_likes         boolean not null default true,
  email_matches       boolean not null default true,
  email_profile_views boolean not null default false,
  sound_active_chats  boolean not null default true,
  sound_requests      boolean not null default true,
  sound_calls         boolean not null default true,
  unsubscribed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.user_notification_settings enable row level security;

drop policy if exists "read own notification settings" on public.user_notification_settings;
create policy "read own notification settings"
  on public.user_notification_settings for select using (auth.uid() = user_id);

drop policy if exists "write own notification settings" on public.user_notification_settings;
create policy "write own notification settings"
  on public.user_notification_settings for insert with check (auth.uid() = user_id);

drop policy if exists "update own notification settings" on public.user_notification_settings;
create policy "update own notification settings"
  on public.user_notification_settings for update
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

revoke all on public.user_notification_settings from anon;
revoke all on public.user_notification_settings from authenticated;
grant select, insert, update on public.user_notification_settings to authenticated;

create or replace function public.cancel_my_subscription(p_reason text default null)
returns jsonb language plpgsql security definer set search_path to 'public' as $$
declare
  v_user uuid := auth.uid();
  v_row public.app_subscriptions%rowtype;
begin
  if v_user is null then
    return jsonb_build_object('success', false, 'error', 'not_signed_in');
  end if;

  select * into v_row from public.app_subscriptions where user_id = v_user;
  if not found or v_row.status is distinct from 'active' then
    return jsonb_build_object('success', false, 'error', 'no_active_subscription');
  end if;

  update public.app_subscriptions
     set status = 'canceled', updated_at = now()
   where user_id = v_user;

  update public.user_subscriptions
     set status = 'canceled', auto_renew = false, canceled_at = now(),
         cancellation_reason = coalesce(left(p_reason, 500), 'member_cancelled'),
         updated_at = now()
   where user_id = v_user and status = 'active';

  return jsonb_build_object('success', true, 'tier', v_row.tier,
                            'access_until', v_row.current_period_end);
end;
$$;

revoke all on function public.cancel_my_subscription(text) from public;
grant execute on function public.cancel_my_subscription(text) to authenticated;

create or replace function public.touch_notification_settings()
returns trigger language plpgsql set search_path to 'public' as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_touch_notification_settings on public.user_notification_settings;
create trigger trg_touch_notification_settings
  before update on public.user_notification_settings
  for each row execute function public.touch_notification_settings();
