-- Settings' "Block & Report" screen was showing two hardcoded, fake
-- entries ("Blocked User 1", "Blocked User 2") — there was no real
-- blocking table anywhere in the schema. abuse_reports already existed
-- for reporting; this adds the missing piece for actually blocking
-- someone (preventing them from messaging/contacting you), which is a
-- distinct concern from reporting them to moderation.

create table if not exists public.user_blocks (
  id          uuid primary key default gen_random_uuid(),
  blocker_id  uuid not null references auth.users(id) on delete cascade,
  blocked_id  uuid not null references auth.users(id) on delete cascade,
  reason      text,
  created_at  timestamptz not null default now(),
  unique (blocker_id, blocked_id)
);

create index if not exists idx_user_blocks_blocker on public.user_blocks (blocker_id);
create index if not exists idx_user_blocks_blocked on public.user_blocks (blocked_id);

alter table public.user_blocks enable row level security;

drop policy if exists "user blocks: manage own" on public.user_blocks;
create policy "user blocks: manage own" on public.user_blocks
  for all to authenticated
  using (blocker_id = auth.uid())
  with check (blocker_id = auth.uid());

-- RPC: is_blocked — used to filter a blocked person out of Discovery and
-- to prevent them from messaging you, checked from either direction so a
-- block is always mutual in effect even though only one person "did" it.
create or replace function public.is_blocked(p_user_a uuid, p_user_b uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.user_blocks
    where (blocker_id = p_user_a and blocked_id = p_user_b)
       or (blocker_id = p_user_b and blocked_id = p_user_a)
  );
$$;

grant execute on function public.is_blocked(uuid, uuid) to authenticated;
