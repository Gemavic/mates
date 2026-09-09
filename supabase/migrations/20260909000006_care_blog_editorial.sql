-- Care Blog, editorial edition.
--
-- Articles gain what a magazine page needs: a thumbnail (cover_image, a
-- column that existed since the schema was written and was never set), a
-- category, a named author, a rich body (content_html: headings, lists,
-- links, tables, pictures, a YouTube embed), a title and keywords for the
-- share preview, and Featured / Trending flags for the blog page.
--
-- The plain-text `content` column stays and is always written alongside
-- the HTML: it is what search, reading time, the push notification and
-- older readers use. The HTML is written only by admins, through
-- save_blog_article(), and is sanitised again in the browser before it is
-- rendered, so a stray tag cannot run anything.
--
-- Pictures live in a new public bucket, blog-media. Only admins can put
-- anything there, and every upload goes through the same Vision screening
-- as a profile photo before its address is written into an article.

alter table public.blog_articles
  add column if not exists content_html text,
  add column if not exists category     text,
  add column if not exists author_name  text,
  add column if not exists seo_title    text,
  add column if not exists seo_keywords text,
  add column if not exists featured     boolean not null default false,
  add column if not exists trending     boolean not null default false;

alter table public.blog_articles drop constraint if exists blog_articles_category_check;
alter table public.blog_articles
  add constraint blog_articles_category_check
    check (category is null or category in ('dating', 'canada', 'safety', 'community', 'news'));

create index if not exists blog_articles_published_idx
  on public.blog_articles (published, published_at desc)
  where published;

-- ---- pictures ---------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('blog-media', 'blog-media', true, 10485760, array['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "blog media read" on storage.objects;
create policy "blog media read"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'blog-media');

drop policy if exists "blog media editors write" on storage.objects;
create policy "blog media editors write"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'blog-media' and public.care_blog_can_edit());

drop policy if exists "blog media editors update" on storage.objects;
create policy "blog media editors update"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'blog-media' and public.care_blog_can_edit())
  with check (bucket_id = 'blog-media' and public.care_blog_can_edit());

drop policy if exists "blog media editors delete" on storage.objects;
create policy "blog media editors delete"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'blog-media' and public.care_blog_can_edit());

-- ---- save_blog_article, with the editorial fields ---------------------------
-- p_extra carries the new fields as one object so the older six-argument
-- call keeps working:
--   content_html, category, author_name, cover_image, seo_title,
--   seo_keywords, featured, trending
create or replace function public.save_blog_article(
  p_id       uuid,
  p_title    text,
  p_excerpt  text,
  p_content  text,
  p_audience text,
  p_publish  boolean,
  p_extra    jsonb
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
  v_extra     jsonb := coalesce(p_extra, '{}'::jsonb);
  v_html      text := nullif(trim(coalesce(v_extra->>'content_html', '')), '');
  v_category  text := nullif(trim(coalesce(v_extra->>'category', '')), '');
  v_author    text := nullif(trim(coalesce(v_extra->>'author_name', '')), '');
  v_cover     text := nullif(trim(coalesce(v_extra->>'cover_image', '')), '');
  v_seo_title text := nullif(trim(coalesce(v_extra->>'seo_title', '')), '');
  v_seo_keys  text := nullif(trim(coalesce(v_extra->>'seo_keywords', '')), '');
  v_featured  boolean := coalesce((v_extra->>'featured')::boolean, false);
  v_trending  boolean := coalesce((v_extra->>'trending')::boolean, false);
  v_announce  boolean := false;
begin
  if not public.care_blog_can_edit() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if length(v_title) < 4 or length(v_title) > 140 then
    raise exception 'Title must be between 4 and 140 characters' using errcode = '22023';
  end if;
  if length(v_content) < 200 then
    raise exception 'The article is too short to publish (under 200 characters of text)' using errcode = '22023';
  end if;
  if length(v_content) > 40000 then
    raise exception 'The article is too long (over 40,000 characters)' using errcode = '22023';
  end if;
  if v_html is not null and length(v_html) > 250000 then
    raise exception 'The article is too long (too many pictures or tables)' using errcode = '22023';
  end if;
  if v_excerpt is not null and length(v_excerpt) > 300 then
    raise exception 'The summary must be 300 characters or fewer' using errcode = '22023';
  end if;
  if v_audience is not null and v_audience not in ('diaspora', 'general') then
    raise exception 'Audience must be diaspora, general, or blank' using errcode = '22023';
  end if;
  if v_category is not null and v_category not in ('dating', 'canada', 'safety', 'community', 'news') then
    raise exception 'Unknown category' using errcode = '22023';
  end if;
  if v_author is not null and length(v_author) > 80 then
    raise exception 'The author name must be 80 characters or fewer' using errcode = '22023';
  end if;
  if v_cover is not null and (v_cover !~ '^https://' or length(v_cover) > 600) then
    raise exception 'The thumbnail must be an https:// address' using errcode = '22023';
  end if;
  if v_seo_title is not null and length(v_seo_title) > 120 then
    raise exception 'The SEO title must be 120 characters or fewer' using errcode = '22023';
  end if;
  if v_seo_keys is not null and length(v_seo_keys) > 300 then
    raise exception 'Keywords must be 300 characters or fewer' using errcode = '22023';
  end if;

  if p_id is null then
    insert into public.blog_articles
      (title, slug, excerpt, content, content_html, audience, category, author_name, cover_image,
       seo_title, seo_keywords, featured, trending, author_id, published, published_at)
    values
      (v_title, public.care_blog_slug(v_title), v_excerpt, v_content, v_html, v_audience, v_category, v_author, v_cover,
       v_seo_title, v_seo_keys, v_featured, v_trending, auth.uid(),
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
        content_html = v_html,
        audience     = v_audience,
        category     = v_category,
        author_name  = v_author,
        cover_image  = v_cover,
        seo_title    = v_seo_title,
        seo_keywords = v_seo_keys,
        featured     = v_featured,
        trending     = v_trending,
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
revoke all on function public.save_blog_article(uuid, text, text, text, text, boolean, jsonb) from public, anon;
grant execute on function public.save_blog_article(uuid, text, text, text, text, boolean, jsonb) to authenticated;

-- The six-argument form now delegates, so nothing that still calls it breaks.
create or replace function public.save_blog_article(
  p_id       uuid,
  p_title    text,
  p_excerpt  text,
  p_content  text,
  p_audience text,
  p_publish  boolean
)
returns jsonb
language sql
security definer
set search_path = public
as $$
  select public.save_blog_article(p_id, p_title, p_excerpt, p_content, p_audience, p_publish, '{}'::jsonb);
$$;
revoke all on function public.save_blog_article(uuid, text, text, text, text, boolean) from public, anon;
grant execute on function public.save_blog_article(uuid, text, text, text, text, boolean) to authenticated;

-- Share previews. /a/<slug> is served by a small Vercel route that prints
-- the article's title, summary and thumbnail as Open Graph tags, so a link
-- pasted into WhatsApp or Facebook shows a card. It reads through this
-- function with the anon key: published pieces only, nothing else exposed.
create or replace function public.article_share_card(p_slug text)
returns jsonb
language sql
security definer
set search_path = public
stable
as $$
  select jsonb_build_object(
    'title', coalesce(seo_title, title),
    'description', coalesce(excerpt, left(regexp_replace(content, '\s+', ' ', 'g'), 200)),
    'image', cover_image,
    'keywords', seo_keywords,
    'slug', slug,
    'published_at', published_at
  )
  from public.blog_articles
  where slug = p_slug and published
  limit 1;
$$;
revoke all on function public.article_share_card(text) from public;
grant execute on function public.article_share_card(text) to anon, authenticated;
