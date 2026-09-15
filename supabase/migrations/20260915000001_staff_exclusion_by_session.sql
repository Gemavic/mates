-- Exclude a staff member's whole session, not just the events they happened
-- to be signed in for.
--
-- WHAT WAS WRONG. staff_traffic_summary dropped an event when its user_id
-- belonged to a staff account. user_id comes from auth.uid() inside
-- log_traffic_event, so it is only set when the request carried a signed-in
-- token. Two kinds of our own traffic therefore counted as strangers:
--
--   1. A staff member browsing before they sign in. Those rows have a null
--      user_id, so the filter waved them through. On 15 September the owner's
--      own signed-out views of /welcome and the sign-in screen were three of
--      the twelve "visitor" page views that day.
--
--   2. Every view of a server-rendered page. /a/<slug> and /in/<place> send
--      their beacon with the publishable key, so auth.uid() was null for all
--      of them regardless of who was reading. One staff member on the Care
--      Blog, opening seven articles in seven tabs, arrived in the panel as
--      seven separate visitors.
--
-- The second cause is fixed in api/_page.js, which now sends the reader's own
-- access token when they have one. This migration fixes the first, and
-- catches anything the beacon still cannot attribute: if ANY event in a
-- session belongs to staff, the entire session is dropped -- the part before
-- they signed in included.
--
-- Nothing about the honest traffic changes. A stranger's session has no staff
-- event in it and is untouched.

create or replace function public.staff_traffic_summary(p_days integer default 30, p_include_staff boolean default false)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_tz constant text := 'America/Toronto';
  v_days integer := greatest(1, least(coalesce(p_days, 30), 90));
  v_include boolean := coalesce(p_include_staff, false);
  v_today date;
  v_start timestamptz;
  v_prev_start timestamptz;
  v_chart_start timestamptz;
  v_floor timestamptz;
  v_session_floor timestamptz;
  v_staff_views integer;
  v_staff_sessions integer;
  v_result jsonb;
begin
  if not coalesce(
       (select a.is_staff or a.is_admin from public.app_credit_accounts a where a.user_id = auth.uid()),
       false)
  then
    return jsonb_build_object('error', 'forbidden');
  end if;

  v_today       := (now() at time zone v_tz)::date;
  v_start       := ((v_today - (v_days - 1))::timestamp) at time zone v_tz;
  v_prev_start  := ((v_today - (2 * v_days - 1))::timestamp) at time zone v_tz;
  v_chart_start := ((v_today - 13)::timestamp) at time zone v_tz;
  v_floor       := least(v_prev_start, v_chart_start);
  -- A session that began shortly before the reporting floor and carried on
  -- into it is still one of ours, so staff sessions are gathered a day wider.
  v_session_floor := v_floor - interval '1 day';

  -- How much of our own traffic the switch is holding back, counted the same
  -- way the filter below counts it, so the note on the panel and the numbers
  -- on the tiles can never disagree.
  select count(*) filter (where e.event_type = 'page_view'),
         count(distinct e.session_id)
    into v_staff_views, v_staff_sessions
  from public.app_traffic_events e
  where e.created_at >= v_start
    and exists (
      select 1 from public.app_traffic_events s
      where s.session_id = e.session_id
        and s.created_at >= v_session_floor
        and s.user_id in (select a.user_id from public.app_credit_accounts a where a.is_staff or a.is_admin)
    );

  with staff_sessions as (
    select distinct s.session_id
    from public.app_traffic_events s
    where s.created_at >= v_session_floor
      and s.user_id in (select a.user_id from public.app_credit_accounts a where a.is_staff or a.is_admin)
  ),
  scoped as (
    select e.*, (e.created_at at time zone v_tz)::date as day
    from public.app_traffic_events e
    where e.created_at >= v_floor
      and (
        v_include
        -- not exists, not "not in": one null session_id in the subquery would
        -- make NOT IN return null and silently empty the whole report.
        or not exists (select 1 from staff_sessions x where x.session_id = e.session_id)
      )
  ),
  cur  as (select * from scoped where created_at >= v_start),
  prev as (select * from scoped where created_at >= v_prev_start and created_at < v_start)
  select jsonb_build_object(
    'window', jsonb_build_object(
      'days', v_days,
      'starts', (v_today - (v_days - 1))::text,
      'ends', v_today::text,
      'timezone', v_tz,
      'includes_staff', v_include,
      'staff_views_excluded', case when v_include then 0 else coalesce(v_staff_views, 0) end,
      'staff_sessions_excluded', case when v_include then 0 else coalesce(v_staff_sessions, 0) end
    ),
    'totals', (
      select jsonb_build_object(
        'page_views', count(*) filter (where event_type = 'page_view'),
        'unique_sessions', count(distinct session_id),
        'signups', count(*) filter (where event_type = 'signup'),
        'ad_clicks', count(*) filter (where event_type = 'ad_click'),
        'signed_in_views', count(*) filter (where event_type = 'page_view' and user_id is not null)
      ) from cur
    ),
    'previous', (
      select jsonb_build_object(
        'page_views', count(*) filter (where event_type = 'page_view'),
        'unique_sessions', count(distinct session_id),
        'signups', count(*) filter (where event_type = 'signup'),
        'ad_clicks', count(*) filter (where event_type = 'ad_click')
      ) from prev
    ),
    'by_source', (
      select coalesce(jsonb_agg(row_to_json(s)), '[]'::jsonb) from (
        select source,
               count(*) filter (where event_type = 'page_view') as views,
               count(distinct session_id) as sessions,
               count(*) filter (where event_type = 'signup') as signups
        from cur group by source order by views desc limit 15
      ) s
    ),
    'by_day', (
      select coalesce(jsonb_agg(row_to_json(d) order by d.day), '[]'::jsonb) from (
        select g.day::date::text as day,
               count(*) filter (where c.event_type = 'page_view') as views,
               count(*) filter (where c.event_type = 'signup') as signups,
               count(*) filter (where c.event_type = 'ad_click') as ad_clicks
        from generate_series(v_today - 13, v_today, interval '1 day') g(day)
        left join scoped c on c.day = g.day::date
        group by g.day
      ) d
    ),
    'top_pages', (
      select coalesce(jsonb_agg(row_to_json(p)), '[]'::jsonb) from (
        select coalesce(path, '(unknown)') as path,
               count(*) as views,
               count(distinct session_id) as sessions
        from cur where event_type = 'page_view'
        group by 1 order by views desc limit 12
      ) p
    ),
    'ad_positions', (
      select coalesce(jsonb_agg(row_to_json(a)), '[]'::jsonb) from (
        select coalesce(meta->>'position', '(unset)') as position, count(*) as clicks
        from cur where event_type = 'ad_click'
        group by 1 order by clicks desc limit 12
      ) a
    ),
    'campaigns', (
      select coalesce(jsonb_agg(row_to_json(c2)), '[]'::jsonb) from (
        select coalesce(campaign, '(none)') as campaign,
               coalesce(medium, '') as medium,
               count(*) filter (where event_type = 'page_view') as views,
               count(*) filter (where event_type = 'signup') as signups
        from cur where campaign is not null
        group by 1, 2 order by views desc limit 12
      ) c2
    )
  ) into v_result;

  return v_result;
end;
$function$;

-- The staff-session lookup reads by session_id; without this it is a
-- sequential scan of the whole event table on every panel load.
create index if not exists app_traffic_events_session_idx
  on public.app_traffic_events (session_id);
