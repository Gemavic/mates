-- No membership figures on public pages, and an internal count that means
-- something.
--
-- WHY. /in/<country> printed "2 members with complete profiles". It was
-- literally true and still wrong twice over. Wrong as a claim, because the
-- site is recruiting: the number is small on the day a stranger reads it,
-- different tomorrow, and nobody joins a place that tells them it is empty.
-- Wrong as a measure, because "complete" demanded country_code and a town,
-- which only the new onboarding asks for, so the eight members who have a
-- screened photo and show up in Discovery counted as two.
--
-- WHAT CHANGES. The page copy is gone (api/place.js, NearYou.tsx). These
-- functions keep returning counts, because two things still need them and
-- neither is a claim to a reader:
--   - whether a place page has enough behind it to be worth indexing;
--   - the Staff overview, which is Gbenga's own dashboard.
-- The test for "counts as a member here" is loosened to what Discovery
-- actually shows: a screened photo, a public profile, no pending deletion.
-- Gender, who they seek and a town are still collected - they are just no
-- longer the difference between existing and not.
--
-- The Staff overview keeps the strict "profile complete" figure, and gains
-- 'with_photo' and 'no_country' beside it, so a low completion percentage
-- reads as "they never named a country", which is the truth, instead of as
-- "almost nobody has filled anything in", which is not.

-- A place page's counts: who is visible in this country or region.
create or replace function public.place_public(p_country text, p_region text default null)
returns jsonb
language sql
stable
security definer
set search_path to 'public'
as $$
  with members as (
    select p.user_id, p.gender, p.region_code, nullif(trim(p.location), '') as town
    from public.user_profiles p
    where p.country_code = upper(p_country)
      and (p_region is null or p.region_code = upper(p_region))
      and (p.profile_visibility is null or p.profile_visibility = 'public')
      and exists (select 1 from public.user_photos ph where ph.user_id = p.user_id)
      and not exists (
        select 1 from public.account_deletion_requests d
        where d.user_id = p.user_id and d.status in ('pending', 'held')
      )
  )
  select jsonb_build_object(
    'country_code', upper(p_country),
    'region_code', upper(p_region),
    'members', (select count(*) from members),
    'women', (select count(*) from members where gender = 'woman'),
    'men', (select count(*) from members where gender = 'man'),
    'joined_30d', (
      select count(*) from public.user_profiles p
      where p.country_code = upper(p_country)
        and (p_region is null or p.region_code = upper(p_region))
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

-- Which place pages exist at all, on the same footing as above.
create or replace function public.sitemap_entries()
returns jsonb
language sql
stable
security definer
set search_path to 'public'
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
      select coalesce(jsonb_agg(jsonb_build_object('slug', slug, 'lastmod', coalesce(updated_at, published_at)) order by published_at desc), '[]'::jsonb)
      from public.blog_articles where published
    ),
    'places', (
      select coalesce(jsonb_agg(jsonb_build_object('country_code', country_code, 'region_code', region_code, 'members', n)), '[]'::jsonb)
      from (
        select country_code, null::text as region_code, count(*) as n from visible group by 1
        union all
        select country_code, region_code, count(*) from visible where region_code is not null group by 1, 2
      ) x
    )
  );
$$;

-- The Staff overview: the strict figure, plus what is actually missing.
create or replace function public.staff_overview_counts()
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_members integer;
  v_complete integer;
  v_with_photo integer;
  v_no_country integer;
  v_signups_30d integer;
  v_referred_30d integer;
begin
  if not public.can_moderate(auth.uid()) then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  select count(*) into v_members from public.user_profiles;

  select count(*) into v_complete
  from public.user_profiles p
  where p.gender is not null and p.seeking is not null and p.country_code is not null
    and coalesce(nullif(trim(p.location), ''), '') <> ''
    and exists (select 1 from public.user_photos ph where ph.user_id = p.user_id);

  select count(*) into v_with_photo
  from public.user_profiles p
  where exists (select 1 from public.user_photos ph where ph.user_id = p.user_id);

  select count(*) into v_no_country
  from public.user_profiles p
  where p.country_code is null
    and exists (select 1 from public.user_photos ph where ph.user_id = p.user_id);

  select count(*) into v_signups_30d from public.user_profiles where created_at >= now() - interval '30 days';
  select count(*) into v_referred_30d from public.referrals where created_at >= now() - interval '30 days';

  return jsonb_build_object(
    'members', v_members,
    'verified', (select count(*) from public.user_profiles where verification_status = 'verified' or is_verified = true),
    'joined_7d', (select count(*) from public.user_profiles where created_at >= now() - interval '7 days'),
    'active_7d', (select count(*) from public.user_profiles where last_active >= now() - interval '7 days'),
    'pending_deletions', (select count(*) from public.account_deletion_requests where status in ('pending', 'held')),
    'paid_usd', (select coalesce(sum(amount_usd), 0) from public.app_payment_intents where status = 'finished'),
    'paid_count', (select count(*) from public.app_payment_intents where status = 'finished'),
    'paid_30d_usd', (select coalesce(sum(amount_usd), 0) from public.app_payment_intents where status = 'finished' and created_at >= now() - interval '30 days'),
    'completed_profiles', v_complete,
    'completed_pct', case when v_members > 0 then round(100.0 * v_complete / v_members) else 0 end,
    'with_photo', v_with_photo,
    'no_country', v_no_country,
    'women', (select count(*) from public.user_profiles where gender = 'woman'),
    'men', (select count(*) from public.user_profiles where gender = 'man'),
    'signups_30d', v_signups_30d,
    'referred_7d', (select count(*) from public.referrals where created_at >= now() - interval '7 days'),
    'referred_30d', v_referred_30d,
    'referred_pct_30d', case when v_signups_30d > 0 then round(100.0 * v_referred_30d / v_signups_30d) else 0 end,
    'referrals_rewarded', (select count(*) from public.referrals where status = 'rewarded')
  );
end;
$$;

grant execute on function public.place_public(text, text) to anon, authenticated;
grant execute on function public.sitemap_entries() to anon, authenticated;
grant execute on function public.staff_overview_counts() to authenticated;
