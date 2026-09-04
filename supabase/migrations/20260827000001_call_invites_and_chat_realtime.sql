-- The call_invites table src/lib/callSignals.ts has always used but which
-- had never been created, plus the realtime publication entries chat has
-- always needed. Applied to production on 2026-08-27.

create table if not exists public.call_invites (
  id uuid primary key default gen_random_uuid(),
  caller_id uuid not null references auth.users(id) on delete cascade,
  callee_id uuid not null references auth.users(id) on delete cascade,
  room_name text not null,
  kind text not null default 'video' check (kind in ('video','audio')),
  status text not null default 'ringing'
    check (status in ('ringing','accepted','declined','cancelled','missed')),
  created_at timestamptz not null default now(),
  responded_at timestamptz
);

create index if not exists call_invites_callee_ringing_idx
  on public.call_invites (callee_id, status, created_at desc);
create index if not exists call_invites_caller_idx
  on public.call_invites (caller_id, created_at desc);

alter table public.call_invites enable row level security;

drop policy if exists "see own call invites" on public.call_invites;
create policy "see own call invites" on public.call_invites for select
  using (auth.uid() = caller_id or auth.uid() = callee_id);

drop policy if exists "ring as yourself" on public.call_invites;
create policy "ring as yourself" on public.call_invites for insert
  with check (
    auth.uid() = caller_id and caller_id <> callee_id
    and not exists (
      select 1 from public.user_blocks b
      where (b.blocker_id = callee_id and b.blocked_id = caller_id)
         or (b.blocker_id = caller_id and b.blocked_id = callee_id)
    )
  );

drop policy if exists "settle own call invites" on public.call_invites;
create policy "settle own call invites" on public.call_invites for update
  using (auth.uid() = caller_id or auth.uid() = callee_id)
  with check (auth.uid() = caller_id or auth.uid() = callee_id);

revoke all on public.call_invites from anon;
revoke all on public.call_invites from authenticated;
grant select, insert, update on public.call_invites to authenticated;

do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='call_invites') then
    alter publication supabase_realtime add table public.call_invites;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='mail_messages') then
    alter publication supabase_realtime add table public.mail_messages;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='typing_indicators') then
    alter publication supabase_realtime add table public.typing_indicators;
  end if;
end $$;

alter table public.call_invites replica identity full;
