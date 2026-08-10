-- Stores each device's Web Push subscription so the server can send real
-- push notifications. A user can have multiple subscriptions (multiple
-- devices/browsers); each is upserted by endpoint so re-subscribing the
-- same device doesn't create duplicates.

create table if not exists public.push_subscriptions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  endpoint    text not null unique,
  p256dh_key  text not null,
  auth_key    text not null,
  created_at  timestamptz not null default now(),
  last_used_at timestamptz not null default now()
);

create index if not exists idx_push_subscriptions_user on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;

drop policy if exists "push subscriptions: manage own" on public.push_subscriptions;
create policy "push subscriptions: manage own" on public.push_subscriptions
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
