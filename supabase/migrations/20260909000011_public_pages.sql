-- Pages Google can read.
--
-- The app routes by URL fragment, so the only crawlable addresses were the
-- homepage, the terms and the privacy policy. /a/<slug> printed an
-- article's card for link previews and then handed the reader to the app
-- with a script - the article text itself was never on a page a crawler
-- could index. These three functions feed real server-rendered pages:
--
--   article_public(slug)         the whole published article, anonymous read
--   place_public(country,region) how many complete profiles are in a
--                                province or country, and the towns they
--                                named - live counts, never estimates
--   sitemap_entries()            every article and every place with at
--                                least one complete profile, for a sitemap
--                                that updates itself

create or replace function public.article_public(p_slug text)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'slug', a.slug,
    'title', a.title,
    'seo_title', a.seo_title,
    'seo_keywords', a.seo_keywords,
    'excerpt', a.excerpt,
    'content_html', a.content_html,
    'content', a.content,
    'cover_image', a.cover_image,
    'cover_credit', a.cover_credit,
    'cover_credit_url', a.cover_credit_url,
    'author_name', a.author_name,
    'category', a.category,
    'published_at', a.published_at,
    'updated_at', a.updated_at,
    'read_minutes', greatest(1, round(array_length(regexp_split_to_array(coalesce(a.content, ''), '\s+'), 1) / 220.0)),
    'more', (
      select coalesce(jsonb_agg(jsonb_build_object('slug', b.slug, 'title', b.title, 'cover_image', b.cover_image, 'published_at', b.published_at) order by b.published_at desc), '[]'::jsonb)
      from (
        select b.slug, b.title, b.cover_image, b.published_at
        from public.blog_articles b
        where b.published and b.slug <> a.slug
        order by (b.category = a.category) desc, b.published_at desc nulls last
        limit 4
      ) b
    )
  )
  from public.blog_articles a
  where a.slug = p_slug and a.published;
$$;

grant execute on function public.article_public(text) to anon, authenticated, service_role;

-- A "complete" profile here is the same definition the app gates on.
create or replace function public.place_public(p_country text, p_region text default null)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with members as (
    select p.user_id, p.gender, p.region_code, nullif(trim(p.location), '') as town
    from public.user_profiles p
    where p.country_code = upper(p_country)
      and (p_region is null or p.region_code = upper(p_region))
      and (p.profile_visibility is null or p.profile_visibility = 'public')
      and p.gender is not null and p.seeking is not null
      and nullif(trim(p.location), '') is not null
      and exists (select 1 from public.user_photos ph where ph.user_id = p.user_id)
      and not exists (select 1 from public.account_deletion_requests d where d.user_id = p.user_id and d.status in ('pending', 'held'))
  )
  select jsonb_build_object(
    'country_code', upper(p_country),
    'region_code', upper(p_region),
    'members', (select count(*) from members),
    'women', (select count(*) from members where gender = 'woman'),
    'men', (select count(*) from members where gender = 'man'),
    'joined_30d', (
      select count(*) from public.user_profiles p
      where p.country_code = upper(p_country) and (p_region is null or p.region_code = upper(p_region))
        and p.created_at >= now() - interval '30 days'
    ),
    'towns', (
      select coalesce(jsonb_agg(jsonb_build_object('town', t.town, 'members', t.n) order by t.n desc, t.town), '[]'::jsonb)
      from (
        select initcap(lower(town)) as town, count(*) as n
        from members where town is not null
        group by 1 order by n desc, 1 limit 8
      ) t
    ),
    'regions', (
      select coalesce(jsonb_agg(jsonb_build_object('region_code', r.region_code, 'members', r.n) order by r.n desc), '[]'::jsonb)
      from (
        select region_code, count(*) as n from members where region_code is not null group by 1
      ) r
    )
  );
$$;

grant execute on function public.place_public(text, text) to anon, authenticated, service_role;

create or replace function public.sitemap_entries()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with complete as (
    select p.country_code, p.region_code
    from public.user_profiles p
    where p.country_code is not null
      and (p.profile_visibility is null or p.profile_visibility = 'public')
      and p.gender is not null and p.seeking is not null
      and nullif(trim(p.location), '') is not null
      and exists (select 1 from public.user_photos ph where ph.user_id = p.user_id)
  )
  select jsonb_build_object(
    'articles', (
      select coalesce(jsonb_agg(jsonb_build_object('slug', slug, 'lastmod', coalesce(updated_at, published_at)) order by published_at desc), '[]'::jsonb)
      from public.blog_articles where published
    ),
    'places', (
      select coalesce(jsonb_agg(jsonb_build_object('country_code', country_code, 'region_code', region_code, 'members', n)), '[]'::jsonb)
      from (
        select country_code, null::text as region_code, count(*) as n from complete group by 1
        union all
        select country_code, region_code, count(*) from complete where region_code is not null group by 1, 2
      ) x
    )
  );
$$;

grant execute on function public.sitemap_entries() to anon, authenticated, service_role;
