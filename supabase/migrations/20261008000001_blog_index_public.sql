-- /blog: one crawlable page listing every published Care Blog article.
--
-- Search Console showed 15 of the site's pages as "Discovered - currently not
-- indexed". The articles were reachable only from the sitemap and from each
-- other's "More to read" boxes; the homepage linked to the Care Blog through
-- /#care-blog, a fragment no crawler follows. This function feeds the page
-- that gives every article a plain link one click from the homepage.
--
-- Returns published articles only, newest first, and the places that already
-- have public profiles (codes only - no member counts, the same rule as
-- 20260912000001_no_public_member_counts.sql).

create or replace function public.blog_index_public()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with visible as (
    select p.country_code, p.region_code
    from public.user_profiles p
    where p.country_code is not null
      and (p.profile_visibility is null or p.profile_visibility = 'public')
      and exists (select 1 from public.user_photos ph where ph.user_id = p.user_id)
      and not exists (
        select 1 from public.account_deletion_requests d
        where d.user_id = p.user_id and d.status in ('pending', 'held')
      )
  )
  select jsonb_build_object(
    'articles', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'slug', a.slug,
        'title', a.title,
        'excerpt', a.excerpt,
        'cover_image', a.cover_image,
        'category', a.category,
        'published_at', a.published_at,
        'read_minutes', greatest(1, round(array_length(regexp_split_to_array(coalesce(a.content, ''), '\s+'), 1) / 220.0))
      ) order by a.published_at desc nulls last), '[]'::jsonb)
      from public.blog_articles a
      where a.published
    ),
    'places', (
      select coalesce(jsonb_agg(jsonb_build_object('country_code', country_code, 'region_code', region_code)
                                order by country_code, region_code nulls first), '[]'::jsonb)
      from (
        select distinct country_code, null::text as region_code from visible
        union
        select distinct country_code, region_code from visible where region_code is not null
      ) x
    )
  );
$$;

revoke all on function public.blog_index_public() from public;
grant execute on function public.blog_index_public() to anon, authenticated;
