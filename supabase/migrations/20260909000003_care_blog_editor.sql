-- Care Blog editor.
--
-- The scheduled publisher (20260909000001) works through a seeded library.
-- This gives the site's admins a second way in: write a piece in the Staff
-- panel and publish it themselves, now or later. Only accounts flagged
-- is_admin on app_credit_accounts can see drafts or write anything; every
-- other reader still sees only what is published, exactly as before.
--
-- Writes go through one function rather than table grants, so the browser
-- cannot set fields it should not (sort_order, notified_at, author_id) and
-- the slug is always derived here, never typed.

create or replace function public.care_blog_can_edit()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.app_credit_accounts a
    where a.user_id = auth.uid() and a.is_admin
  );
$$;
revoke all on function public.care_blog_can_edit() from public, anon;
grant execute on function public.care_blog_can_edit() to authenticated;

-- Editors can read drafts. Readers keep the existing published-only policy.
drop policy if exists "Editors can view all articles" on public.blog_articles;
create policy "Editors can view all articles"
  on public.blog_articles for select
  to authenticated
  using (public.care_blog_can_edit());

-- Tell members who opted in. Same call the scheduled publisher makes; the
-- Vercel route checks the shared key and reads the article itself. Never
-- granted to a browser role - only the functions below call it.
create or replace function public.care_blog_notify(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_key text;
begin
  select decrypted_secret into v_key from vault.decrypted_secrets where name = 'article_notify_key';
  if v_key is null then return; end if;
  perform net.http_post(
    url := 'https://dates.care/api/notify-article',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-notify-key', v_key),
    body := jsonb_build_object('article_id', p_id),
    timeout_milliseconds := 20000
  );
end;
$$;
revoke all on function public.care_blog_notify(uuid) from public, anon, authenticated;

-- A slug from a title: lower-case, letters and digits, hyphens between,
-- unique among existing articles.
create or replace function public.care_blog_slug(p_title text)
returns text
language plpgsql
set search_path = public
stable
as $$
declare
  v_base text;
  v_slug text;
  n int := 1;
begin
  v_base := trim(both '-' from regexp_replace(lower(coalesce(p_title, '')), '[^a-z0-9]+', '-', 'g'));
  v_base := left(v_base, 80);
  if v_base = '' then v_base := 'article'; end if;
  v_slug := v_base;
  while exists (select 1 from public.blog_articles where slug = v_slug) loop
    n := n + 1;
    v_slug := v_base || '-' || n;
  end loop;
  return v_slug;
end;
$$;
revoke all on function public.care_blog_slug(text) from public, anon, authenticated;

-- save_blog_article: create or update one piece.
--   p_id       null to create, otherwise the article to update
--   p_publish  true = publish (now, if not already), false = take down,
--              null = leave the published state as it is
-- Publishing for the first time sends the push; re-publishing a piece that
-- was already announced does not.
create or replace function public.save_blog_article(
  p_id       uuid,
  p_title    text,
  p_excerpt  text,
  p_content  text,
  p_audience text,
  p_publish  boolean
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row       public.blog_articles%rowtype;
  v_title     text := trim(coalesce(p_title, ''));
  v_excerpt   text := nullif(trim(coalesce(p_excerpt, '')), '');
  v_content   text := trim(coalesce(p_content, ''));
  v_audience  text := nullif(trim(coalesce(p_audience, '')), '');
  v_announce  boolean := false;
begin
  if not public.care_blog_can_edit() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if length(v_title) < 4 or length(v_title) > 140 then
    raise exception 'Title must be between 4 and 140 characters' using errcode = '22023';
  end if;
  if length(v_content) < 200 then
    raise exception 'The article is too short to publish (under 200 characters)' using errcode = '22023';
  end if;
  if length(v_content) > 40000 then
    raise exception 'The article is too long (over 40,000 characters)' using errcode = '22023';
  end if;
  if v_excerpt is not null and length(v_excerpt) > 300 then
    raise exception 'The summary must be 300 characters or fewer' using errcode = '22023';
  end if;
  if v_audience is not null and v_audience not in ('diaspora', 'general') then
    raise exception 'Audience must be diaspora, general, or blank' using errcode = '22023';
  end if;

  if p_id is null then
    insert into public.blog_articles (title, slug, excerpt, content, audience, author_id, published, published_at)
    values (v_title, public.care_blog_slug(v_title), v_excerpt, v_content, v_audience, auth.uid(),
            coalesce(p_publish, false), case when coalesce(p_publish, false) then now() end)
    returning * into v_row;
    v_announce := v_row.published;
  else
    select * into v_row from public.blog_articles where id = p_id for update;
    if not found then
      raise exception 'Article not found' using errcode = 'P0002';
    end if;
    v_announce := coalesce(p_publish, false) and not v_row.published and v_row.notified_at is null;
    update public.blog_articles
    set title        = v_title,
        excerpt      = v_excerpt,
        content      = v_content,
        audience     = v_audience,
        published    = coalesce(p_publish, published),
        published_at = case
                         when coalesce(p_publish, published) and published_at is null then now()
                         when p_publish is true and not published then now()
                         else published_at
                       end,
        updated_at   = now()
    where id = p_id
    returning * into v_row;
  end if;

  if v_announce then
    perform public.care_blog_notify(v_row.id);
  end if;

  return jsonb_build_object(
    'id', v_row.id, 'slug', v_row.slug, 'title', v_row.title,
    'published', v_row.published, 'published_at', v_row.published_at
  );
end;
$$;
revoke all on function public.save_blog_article(uuid, text, text, text, text, boolean) from public, anon;
grant execute on function public.save_blog_article(uuid, text, text, text, text, boolean) to authenticated;
