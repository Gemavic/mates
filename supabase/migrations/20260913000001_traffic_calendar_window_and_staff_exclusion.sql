-- Traffic panel: a window that means what it says, and numbers that are not
-- mostly us.
--
-- TWO PROBLEMS, ONE REPORT. Gbenga read 7d as ~970 on Sep 11, 910 on Sep 12
-- afternoon, 870 after midnight, and reasonably asked why a total goes down.
--
-- 1. THE WINDOW WAS ROLLING, NOT CALENDAR. v_since was now() - 7 days, a
--    168-hour window that slides forward every second. Every reading drops
--    whatever happened more than 168 hours ago, so when the days falling off
--    the back are busier than the days coming on, the total falls. It was not
--    a counting error - the old function reproduces 910/106/6 and 870/103/4
--    exactly at the two moments those screenshots were taken - but "7d" reads
--    as a tally that grows, and a rolling window never behaves that way.
--
--    It is now the last N *calendar* days in Toronto, today included. Within a
--    day the number only rises, which is what anyone expects. It can still
--    step down at midnight, when the oldest day leaves - so the function now
--    also returns the same totals for the preceding N days, and the panel
--    prints the change. A fall then reads as a fall in traffic, which is the
--    thing worth knowing, rather than as a broken counter.
--
-- 2. MOST OF THE TRAFFIC WAS STAFF. Of 862 page views in the last seven days,
--    618 were the two staff accounts browsing the site. The dashboard was
--    largely measuring its own reader. Staff views are now excluded by
--    default; 'staff_views_excluded' says how many were removed, and
--    p_include_staff => true puts them back. Views from a staff member before
--    they sign in are anonymous and cannot be attributed, so this is a floor,
--    not a perfect filter - the panel says so rather than implying precision.
--
-- Also: by_day now emits a row for every day in the range, so a quiet day is a
-- gap in the chart instead of vanishing and silently compressing the dates.

-- The single-argument version has to go, or staff_traffic_summary(30) is
-- ambiguous once the second parameter exists.
drop function if exists public.staff_traffic_summary(integer);

create or replace function public.staff_traffic_summary(
  p_days integer default 30,
  p_include_staff boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_tz constant text := 'America/Toronto';
  v_days integer := greatest(1, least(coalesce(p_days, 30), 90));
  v_include boolean := coalesce(p_include_staff, false);
  v_today date;
  v_start timestamptz;
  v_prev_start timestamptz;
  v_chart_start timestamptz;
  v_floor timestamptz;
  v_staff_views integer;
  v_result jsonb;
begin
  if not coalesce(
       (select a.is_staff or a.is_admin from public.app_credit_accounts a where a.user_id = auth.uid()),
       false)
  then
    return jsonb_build_object('error', 'forbidden');
  end if;

  v_today      := (now() at time zone v_tz)::date;
  v_start      := ((v_today - (v_days - 1))::timestamp) at time zone v_tz;
  v_prev_start := ((v_today - (2 * v_days - 1))::timestamp) at time zone v_tz;
  v_chart_start := ((v_today - 13)::timestamp) at time zone v_tz;
  v_floor      := least(v_prev_start, v_chart_start);

  -- How much the default view is leaving out, whether or not it is left out.
  select count(*) into v_staff_views
  from public.app_traffic_events e
  where e.created_at >= v_start
    and e.event_type = 'page_view'
    and e.user_id in (select a.user_id from public.app_credit_accounts a where a.is_staff or a.is_admin);

  with scoped as (
    select e.*, (e.created_at at time zone v_tz)::date as day
    from public.app_traffic_events e
    where e.created_at >= v_floor
      and (
        v_include
        or e.user_id is null
        or e.user_id not in (select a.user_id from public.app_credit_accounts a where a.is_staff or a.is_admin)
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
      'staff_views_excluded', case when v_include then 0 else coalesce(v_staff_views, 0) end
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
      -- Every day in the range, including the empty ones.
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
$$;

grant execute on function public.staff_traffic_summary(integer, boolean) to authenticated;
