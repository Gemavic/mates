-- Care Blog pipeline.
--
-- The blog reads blog_articles (since batch 2). This gives it something to
-- read: a library of twenty-four short pieces, published one at a time,
-- twice a week, by a scheduled job. They alternate between two readers -
-- members from West Africa building a life in Canada, and Canadian singles
-- generally - and every piece was checked against what the site actually
-- does, so nothing in them promises what the code cannot back.
--
-- The library itself is the next migration (20260909000002); it is one
-- INSERT and is kept apart so that this file stays readable.
--
-- The publisher is a plpgsql function run by pg_cron on Monday and Thursday
-- at 13:00 UTC (09:00 Toronto). It publishes the lowest-numbered unpublished
-- article and asks the Vercel API to tell members who opted in. No article
-- is ever written by a machine on this pipeline; when the library runs out
-- the job simply does nothing, and the blog keeps showing what it has.

alter table public.blog_articles
  add column if not exists sort_order integer,
  add column if not exists audience text check (audience in ('diaspora', 'general')),
  add column if not exists notified_at timestamptz;
create unique index if not exists blog_articles_slug_key on public.blog_articles (slug);
create index if not exists blog_articles_queue_idx on public.blog_articles (sort_order) where not published;

-- Members choose whether to hear about new articles. Default on, like the
-- other push categories; the toggle is beside them in Settings.
alter table public.user_notification_settings
  add column if not exists push_articles boolean not null default true;

-- ---------------------------------------------------------------------------
-- publish_next_article(): the scheduled step.
-- ---------------------------------------------------------------------------
create or replace function public.publish_next_article()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id    uuid;
  v_title text;
  v_slug  text;
  v_key   text;
begin
  if coalesce(auth.role(), '') <> 'service_role' and session_user <> 'postgres' then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  -- Never publish twice in one day, whatever the schedule does.
  if exists (select 1 from public.blog_articles where published and published_at > now() - interval '20 hours') then
    return jsonb_build_object('published', false, 'reason', 'already_today');
  end if;

  update public.blog_articles
  set published = true, published_at = now(), updated_at = now()
  where id = (
    select id from public.blog_articles
    where not published and sort_order is not null
    order by sort_order
    limit 1
  )
  returning id, title, slug into v_id, v_title, v_slug;

  if v_id is null then
    return jsonb_build_object('published', false, 'reason', 'library_empty');
  end if;

  -- Tell members who asked to be told. The Vercel route holds the push keys;
  -- it checks this shared key and reads the article itself.
  select decrypted_secret into v_key from vault.decrypted_secrets where name = 'article_notify_key';
  if v_key is not null then
    perform net.http_post(
      url := 'https://dates.care/api/notify-article',
      headers := jsonb_build_object('Content-Type', 'application/json', 'x-notify-key', v_key),
      body := jsonb_build_object('article_id', v_id),
      timeout_milliseconds := 20000
    );
  end if;

  return jsonb_build_object('published', true, 'id', v_id, 'slug', v_slug, 'title', v_title);
end;
$$;
revoke all on function public.publish_next_article() from public, anon, authenticated;
grant execute on function public.publish_next_article() to service_role;

-- The Vercel route proves itself with this key. Service role only.
create or replace function public.article_notify_key_matches(p_key text)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(auth.role(), '') = 'service_role'
     and p_key is not null
     and p_key = (select decrypted_secret from vault.decrypted_secrets where name = 'article_notify_key' limit 1);
$$;
revoke all on function public.article_notify_key_matches(text) from public, anon, authenticated;
grant execute on function public.article_notify_key_matches(text) to service_role;

-- Who to tell: push subscriptions of members who have not turned articles
-- off and have not unsubscribed from everything. Service role only.
create or replace function public.article_push_targets()
returns table(user_id uuid, endpoint text, p256dh_key text, auth_key text)
language sql
security definer
set search_path = public
stable
as $$
  select s.user_id, s.endpoint, s.p256dh_key, s.auth_key
  from public.push_subscriptions s
  left join public.user_notification_settings n on n.user_id = s.user_id
  where coalesce(n.push_articles, true)
    and n.unsubscribed_at is null
    and coalesce(auth.role(), '') = 'service_role';
$$;
revoke all on function public.article_push_targets() from public, anon, authenticated;
grant execute on function public.article_push_targets() to service_role;

-- A random key, created once; read by the publisher and by the route.
do $$
begin
  if not exists (select 1 from vault.secrets where name = 'article_notify_key') then
    perform vault.create_secret(encode(gen_random_bytes(24), 'hex'), 'article_notify_key',
      'Shared key between publish_next_article() and /api/notify-article');
  end if;
end $$;

-- Monday and Thursday, 09:00 Toronto (13:00 UTC; 14:00 in winter).
select cron.schedule('blog-publish', '0 13 * * 1,4', 'select public.publish_next_article();');
