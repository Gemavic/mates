create table if not exists public.app_starred_threads (
  user_id    uuid not null references auth.users(id) on delete cascade,
  thread_id  uuid not null references public.mail_threads(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, thread_id)
);

alter table public.app_starred_threads enable row level security;

drop policy if exists "starred threads read own" on public.app_starred_threads;
create policy "starred threads read own" on public.app_starred_threads for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "starred threads insert own" on public.app_starred_threads;
create policy "starred threads insert own" on public.app_starred_threads for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "starred threads delete own" on public.app_starred_threads;
create policy "starred threads delete own" on public.app_starred_threads for delete to authenticated
  using (auth.uid() = user_id);
