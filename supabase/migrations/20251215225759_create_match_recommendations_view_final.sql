/*
  # Create Materialized View for Fast Match Recommendations (Final)

  Pre-calculates match recommendations for fast discovery page loading.
  
  ## Features
  - Pre-calculated compatibility scores
  - Filtered for preferences and distance
  - Excludes already matched/liked/blocked users
  - Ranked by compatibility
  
  ## Usage
  ```sql
  -- Get recommendations
  SELECT * FROM get_recommendations_for_user('user-uuid', 20);
  
  -- Refresh (run every 1-6 hours)
  SELECT refresh_match_recommendations();
  ```
*/

DROP MATERIALIZED VIEW IF EXISTS match_recommendations CASCADE;

CREATE MATERIALIZED VIEW match_recommendations AS
WITH active_users AS (
  SELECT 
    user_id,
    age,
    geo_location,
    distance_preference,
    age_range_min,
    age_range_max
  FROM public.user_profiles
  WHERE is_verified = true
    AND (last_active > NOW() - INTERVAL '30 days' OR is_online = true)
),
user_prefs AS (
  SELECT 
    user_id,
    distance_max_km,
    age_min,
    age_max
  FROM public.matching_preferences
),
existing_interactions AS (
  SELECT DISTINCT
    user_id,
    target_user_id
  FROM (
    SELECT user1_id AS user_id, user2_id AS target_user_id FROM public.matches
    UNION
    SELECT user2_id AS user_id, user1_id AS target_user_id FROM public.matches
    UNION
    SELECT user_id, target_user_id FROM public.user_likes
    UNION
    SELECT user_id, blocked_user_id AS target_user_id FROM public.user_blocked
    UNION
    SELECT blocked_user_id AS user_id, user_id AS target_user_id FROM public.user_blocked
  ) AS interactions
),
potential_matches AS (
  SELECT 
    seeker.user_id AS seeker_id,
    candidate.user_id AS potential_match_id,
    public.calculate_distance_km(seeker.user_id, candidate.user_id) AS distance_km,
    ABS(COALESCE(seeker.age, 25) - COALESCE(candidate.age, 25)) AS age_difference
  FROM active_users seeker
  CROSS JOIN active_users candidate
  LEFT JOIN user_prefs prefs ON prefs.user_id = seeker.user_id
  WHERE 
    candidate.user_id != seeker.user_id
    AND candidate.age BETWEEN 
      COALESCE(prefs.age_min, seeker.age_range_min, 18) AND 
      COALESCE(prefs.age_max, seeker.age_range_max, 99)
    AND (
      seeker.geo_location IS NULL 
      OR candidate.geo_location IS NULL 
      OR ST_DWithin(
        seeker.geo_location::geography,
        candidate.geo_location::geography,
        COALESCE(prefs.distance_max_km, seeker.distance_preference, 50) * 1000
      )
    )
    AND NOT EXISTS (
      SELECT 1 FROM existing_interactions ei
      WHERE ei.user_id = seeker.user_id 
        AND ei.target_user_id = candidate.user_id
    )
  LIMIT 50
),
scored_matches AS (
  SELECT 
    seeker_id,
    potential_match_id,
    public.calculate_compatibility(seeker_id, potential_match_id) AS compatibility_score,
    distance_km,
    age_difference
  FROM potential_matches
  WHERE public.calculate_compatibility(seeker_id, potential_match_id) >= 40
)
SELECT 
  seeker_id,
  potential_match_id,
  compatibility_score,
  distance_km,
  age_difference,
  ROW_NUMBER() OVER (
    PARTITION BY seeker_id 
    ORDER BY compatibility_score DESC, distance_km ASC NULLS LAST
  ) AS rank,
  NOW() AS calculated_at
FROM scored_matches;

CREATE UNIQUE INDEX idx_match_recommendations_seeker_rank 
ON match_recommendations(seeker_id, rank);

CREATE INDEX idx_match_recommendations_match 
ON match_recommendations(potential_match_id);

CREATE INDEX idx_match_recommendations_score 
ON match_recommendations(seeker_id, compatibility_score DESC);

CREATE OR REPLACE FUNCTION refresh_match_recommendations()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY match_recommendations;
  RAISE NOTICE 'Match recommendations refreshed at %', NOW();
END;
$$ LANGUAGE plpgsql 
SET search_path = public, pg_temp;

CREATE OR REPLACE FUNCTION get_recommendations_for_user(
  user_uuid uuid,
  result_limit integer DEFAULT 20
)
RETURNS TABLE (
  match_user_id uuid,
  compatibility_score integer,
  distance_km numeric,
  age_difference integer,
  rank bigint
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    mr.potential_match_id,
    mr.compatibility_score,
    mr.distance_km,
    mr.age_difference,
    mr.rank
  FROM public.match_recommendations mr
  WHERE mr.seeker_id = user_uuid
  ORDER BY mr.rank
  LIMIT result_limit;
END;
$$ LANGUAGE plpgsql STABLE 
SET search_path = public, pg_temp;

GRANT SELECT ON match_recommendations TO authenticated;
GRANT EXECUTE ON FUNCTION refresh_match_recommendations TO authenticated;
GRANT EXECUTE ON FUNCTION get_recommendations_for_user TO authenticated;

COMMENT ON MATERIALIZED VIEW match_recommendations IS 'Pre-calculated match recommendations. Refresh every 1-6 hours for optimal performance.';
COMMENT ON FUNCTION refresh_match_recommendations IS 'Refresh the match recommendations materialized view. Should be called every 1-6 hours.';
COMMENT ON FUNCTION get_recommendations_for_user IS 'Get pre-calculated match recommendations for a specific user, ordered by compatibility.';
