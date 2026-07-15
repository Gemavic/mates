create table if not exists public.app_feed_posts (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references auth.users(id) on delete cascade,
  caption    text not null default '' check (length(caption) <= 2000),
  image_urls text[] not null default '{}' check (array_length(image_urls, 1) is null or array_length(image_urls, 1) <= 4),
  created_at timestamptz not null default now()
);

create table if not exists public.app_feed_likes (
  post_id    bigint not null references public.app_feed_posts(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create table if not exists public.app_feed_comments (
  id         bigint generated always as identity primary key,
  post_id    bigint not null references public.app_feed_posts(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  body       text not null check (length(body) between 1 and 500),
  created_at timestamptz not null default now()
);

create table if not exists public.app_feed_reports (
  id         bigint generated always as identity primary key,
  post_id    bigint not null references public.app_feed_posts(id) on delete cascade,
  reporter   uuid not null references auth.users(id) on delete cascade,
  reason     text,
  created_at timestamptz not null default now(),
  unique (post_id, reporter)
);

create index if not exists idx_feed_posts_created on public.app_feed_posts (created_at desc);
create index if not exists idx_feed_comments_post on public.app_feed_comments (post_id, created_at);

alter table public.app_feed_posts    enable row level security;
alter table public.app_feed_likes    enable row level security;
alter table public.app_feed_comments enable row level security;
alter table public.app_feed_reports  enable row level security;

drop policy if exists "feed read" on public.app_feed_posts;
create policy "feed read" on public.app_feed_posts for select to authenticated using (true);

drop policy if exists "feed insert own" on public.app_feed_posts;
create policy "feed insert own" on public.app_feed_posts for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "feed delete own or staff" on public.app_feed_posts;
create policy "feed delete own or staff" on public.app_feed_posts for delete to authenticated
  using (
    auth.uid() = user_id
    or exists (select 1 from public.app_credit_accounts a where a.user_id = auth.uid() and a.is_staff)
  );

drop policy if exists "likes read" on public.app_feed_likes;
create policy "likes read" on public.app_feed_likes for select to authenticated using (true);
drop policy if exists "likes insert own" on public.app_feed_likes;
create policy "likes insert own" on public.app_feed_likes for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "likes delete own" on public.app_feed_likes;
create policy "likes delete own" on public.app_feed_likes for delete to authenticated using (auth.uid() = user_id);

drop policy if exists "comments read" on public.app_feed_comments;
create policy "comments read" on public.app_feed_comments for select to authenticated using (true);
drop policy if exists "comments insert own" on public.app_feed_comments;
create policy "comments insert own" on public.app_feed_comments for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "comments delete own or staff" on public.app_feed_comments;
create policy "comments delete own or staff" on public.app_feed_comments for delete to authenticated
  using (
    auth.uid() = user_id
    or exists (select 1 from public.app_credit_accounts a where a.user_id = auth.uid() and a.is_staff)
  );

drop policy if exists "reports insert own" on public.app_feed_reports;
create policy "reports insert own" on public.app_feed_reports for insert to authenticated with check (auth.uid() = reporter);
drop policy if exists "reports staff read" on public.app_feed_reports;
create policy "reports staff read" on public.app_feed_reports for select to authenticated
  using (exists (select 1 from public.app_credit_accounts a where a.user_id = auth.uid() and a.is_staff));

insert into storage.buckets (id, name, public)
values ('feed-media', 'feed-media', true)
on conflict (id) do nothing;

drop policy if exists "feed media upload own folder" on storage.objects;
create policy "feed media upload own folder" on storage.objects for insert to authenticated
  with check (bucket_id = 'feed-media' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "feed media read" on storage.objects;
create policy "feed media read" on storage.objects for select to public
  using (bucket_id = 'feed-media');

drop policy if exists "feed media delete own" on storage.objects;
create policy "feed media delete own" on storage.objects for delete to authenticated
  using (bucket_id = 'feed-media' and (storage.foldername(name))[1] = auth.uid()::text);
