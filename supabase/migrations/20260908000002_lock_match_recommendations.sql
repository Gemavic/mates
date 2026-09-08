-- match_recommendations exposes seeker_id, potential_match_id, compatibility
-- and distance_km. It was selectable by anon. It has never been populated,
-- so it leaks nothing today; the first REFRESH would have made every
-- member's match list public. Closing it before that happens.
revoke all on public.match_recommendations from anon, authenticated, public;
