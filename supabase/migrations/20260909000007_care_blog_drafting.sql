-- Auto-draft: a first draft written by machine, published by a person.
--
-- The editor gains a Generate button. It sends a topic to the blog-draft
-- edge function, which asks Gemini for a title, summary, body, SEO fields
-- and picture search terms, and hands them back into the form as a DRAFT.
-- Nothing here publishes anything: the admin reads it, corrects it, and
-- presses Publish exactly as before.
--
-- Two things are recorded rather than assumed. Every generation attempt is
-- logged (blog_draft_runs) so the cost is visible and a runaway loop is
-- capped; and every article remembers whether its first draft came from a
-- machine, which model wrote it, and when - so if a payment partner or a
-- regulator ever asks how the blog is produced, the answer is a query
-- rather than a memory. That record is internal; readers see the piece the
-- admin approved, under the byline the admin chose.
--
-- Pictures from Pexels carry their photographer's name and link, because
-- the Pexels licence asks for credit where it can be given.

alter table public.blog_articles
  add column if not exists ai_drafted      boolean not null default false,
  add column if not exists ai_model        text,
  add column if not exists ai_drafted_at   timestamptz,
  add column if not exists cover_credit    text,
  add column if not exists cover_credit_url text;

comment on column public.blog_articles.ai_drafted is
  'True when the first draft of this piece was machine-written. Internal record only; every published piece was read and approved by an admin.';

-- ---- generation log ---------------------------------------------------------
create table if not exists public.blog_draft_runs (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users(id) on delete set null,
  topic       text,
  category    text,
  model       text,
  ok          boolean not null default false,
  error       text,
  words       integer,
  created_at  timestamptz not null default now()
);
create index if not exists blog_draft_runs_user_day_idx
  on public.blog_draft_runs (user_id, created_at desc);

alter table public.blog_draft_runs enable row level security;

drop policy if exists "Editors can read the draft log" on public.blog_draft_runs;
create policy "Editors can read the draft log"
  on public.blog_draft_runs for select
  to authenticated
  using (public.care_blog_can_edit());

-- Only the edge function writes here, and it uses the service role.
revoke insert, update, delete on public.blog_draft_runs from authenticated, anon;
grant select on public.blog_draft_runs to authenticated;

-- ---- save_blog_article: carry the new fields --------------------------------
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
  v_row        public.blog_articles%rowtype;
  v_title      text := trim(coalesce(p_title, ''));
  v_excerpt    text := nullif(trim(coalesce(p_excerpt, '')), '');
  v_content    text := trim(coalesce(p_content, ''));
  v_audience   text := nullif(trim(coalesce(p_audience, '')), '');
  v_extra      jsonb := coalesce(p_extra, '{}'::jsonb);
  v_html       text := nullif(trim(coalesce(v_extra->>'content_html', '')), '');
  v_category   text := nullif(trim(coalesce(v_extra->>'category', '')), '');
  v_author     text := nullif(trim(coalesce(v_extra->>'author_name', '')), '');
  v_cover      text := nullif(trim(coalesce(v_extra->>'cover_image', '')), '');
  v_credit     text := nullif(trim(coalesce(v_extra->>'cover_credit', '')), '');
  v_credit_url text := nullif(trim(coalesce(v_extra->>'cover_credit_url', '')), '');
  v_seo_title  text := nullif(trim(coalesce(v_extra->>'seo_title', '')), '');
  v_seo_keys   text := nullif(trim(coalesce(v_extra->>'seo_keywords', '')), '');
  v_featured   boolean := coalesce((v_extra->>'featured')::boolean, false);
  v_trending   boolean := coalesce((v_extra->>'trending')::boolean, false);
  v_ai         boolean := coalesce((v_extra->>'ai_drafted')::boolean, false);
  v_ai_model   text := nullif(trim(coalesce(v_extra->>'ai_model', '')), '');
  v_announce   boolean := false;
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
  if v_credit_url is not null and (v_credit_url !~ '^https://' or length(v_credit_url) > 400) then
    raise exception 'The picture credit link must be an https:// address' using errcode = '22023';
  end if;
  if v_credit is not null and length(v_credit) > 160 then
    raise exception 'The picture credit must be 160 characters or fewer' using errcode = '22023';
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
       cover_credit, cover_credit_url, seo_title, seo_keywords, featured, trending,
       ai_drafted, ai_model, ai_drafted_at, author_id, published, published_at)
    values
      (v_title, public.care_blog_slug(v_title), v_excerpt, v_content, v_html, v_audience, v_category, v_author, v_cover,
       v_credit, v_credit_url, v_seo_title, v_seo_keys, v_featured, v_trending,
       v_ai, case when v_ai then v_ai_model end, case when v_ai then now() end,
       auth.uid(), coalesce(p_publish, false), case when coalesce(p_publish, false) then now() end)
    returning * into v_row;
    v_announce := v_row.published;
  else
    select * into v_row from public.blog_articles where id = p_id for update;
    if not found then
      raise exception 'Article not found' using errcode = 'P0002';
    end if;
    v_announce := coalesce(p_publish, false) and not v_row.published and v_row.notified_at is null;
    update public.blog_articles
    set title            = v_title,
        excerpt          = v_excerpt,
        content          = v_content,
        content_html     = v_html,
        audience         = v_audience,
        category         = v_category,
        author_name      = v_author,
        cover_image      = v_cover,
        cover_credit     = v_credit,
        cover_credit_url = v_credit_url,
        seo_title        = v_seo_title,
        seo_keywords     = v_seo_keys,
        featured         = v_featured,
        trending         = v_trending,
        -- Once a piece is marked machine-drafted it stays marked; the record
        -- is about where the words started, not where they ended up.
        ai_drafted       = ai_drafted or v_ai,
        ai_model         = coalesce(ai_model, case when v_ai then v_ai_model end),
        ai_drafted_at    = coalesce(ai_drafted_at, case when v_ai then now() end),
        published        = coalesce(p_publish, published),
        published_at     = case
                             when coalesce(p_publish, published) and published_at is null then now()
                             when p_publish is true and not published then now()
                             else published_at
                           end,
        updated_at       = now()
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
