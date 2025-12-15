/*
  # Fix Compatibility Function Schema References

  This migration fixes the calculate_compatibility function to properly reference
  tables with explicit schema qualification.
  
  ## Changes
  - Adds explicit schema references (public.table_name)
  - Adds search_path setting for security
  - Ensures function can be called from materialized view context
*/

-- Drop and recreate with proper schema references
DROP FUNCTION IF EXISTS calculate_compatibility(uuid, uuid);

CREATE OR REPLACE FUNCTION calculate_compatibility(
  seeker_id uuid,
  potential_match_id uuid
) RETURNS integer AS $$
DECLARE
  score integer := 0;
  
  -- User data
  seeker_profile RECORD;
  match_profile RECORD;
  seeker_prefs RECORD;
  
  -- Scoring components
  distance_score integer := 0;
  age_score integer := 0;
  interest_score integer := 0;
  personality_score integer := 0;
  behavioral_score integer := 0;
  preference_score integer := 0;
  
  -- Calculations
  distance_km numeric;
  age_diff integer;
  shared_interests integer := 0;
  total_interests integer := 0;
BEGIN
  -- Get user profiles with explicit schema
  SELECT * INTO seeker_profile FROM public.user_profiles WHERE user_id = seeker_id;
  SELECT * INTO match_profile FROM public.user_profiles WHERE user_id = potential_match_id;
  
  -- Get seeker preferences
  SELECT * INTO seeker_prefs FROM public.matching_preferences WHERE user_id = seeker_id;
  
  -- Return 0 if profiles don't exist
  IF seeker_profile IS NULL OR match_profile IS NULL THEN
    RETURN 0;
  END IF;
  
  -- 1. DISTANCE COMPATIBILITY (0-20 points)
  IF seeker_profile.geo_location IS NOT NULL AND match_profile.geo_location IS NOT NULL THEN
    distance_km := calculate_distance_km(seeker_id, potential_match_id);
    
    IF seeker_prefs IS NOT NULL AND distance_km IS NOT NULL THEN
      IF distance_km <= COALESCE(seeker_prefs.distance_max_km, seeker_profile.distance_preference, 50) THEN
        distance_score := 20 - LEAST(distance_km::integer / 10, 10);
      ELSE
        distance_score := 0;
      END IF;
    ELSE
      IF distance_km <= 50 THEN
        distance_score := 15;
      ELSIF distance_km <= 100 THEN
        distance_score := 10;
      ELSE
        distance_score := 5;
      END IF;
    END IF;
  ELSE
    distance_score := 10;
  END IF;
  
  -- 2. AGE COMPATIBILITY (0-20 points)
  IF match_profile.age IS NOT NULL AND seeker_profile.age IS NOT NULL THEN
    age_diff := ABS(match_profile.age - seeker_profile.age);
    
    IF seeker_prefs IS NOT NULL THEN
      IF match_profile.age BETWEEN 
         COALESCE(seeker_prefs.age_min, seeker_profile.age_range_min, 18) AND 
         COALESCE(seeker_prefs.age_max, seeker_profile.age_range_max, 99) THEN
        age_score := 20 - LEAST(age_diff / 2, 10);
      ELSE
        age_score := 2;
      END IF;
    ELSE
      IF age_diff <= 5 THEN
        age_score := 20;
      ELSIF age_diff <= 10 THEN
        age_score := 15;
      ELSIF age_diff <= 15 THEN
        age_score := 10;
      ELSE
        age_score := 5;
      END IF;
    END IF;
  ELSE
    age_score := 10;
  END IF;
  
  -- 3. INTEREST OVERLAP (0-20 points)
  IF seeker_profile.interests IS NOT NULL AND match_profile.interests IS NOT NULL THEN
    SELECT COUNT(*) INTO shared_interests
    FROM (
      SELECT jsonb_array_elements(seeker_profile.interests) AS interest
      INTERSECT
      SELECT jsonb_array_elements(match_profile.interests) AS interest
    ) AS shared;
    
    SELECT COUNT(DISTINCT interest) INTO total_interests
    FROM (
      SELECT jsonb_array_elements(seeker_profile.interests) AS interest
      UNION
      SELECT jsonb_array_elements(match_profile.interests) AS interest
    ) AS all_interests;
    
    IF total_interests > 0 THEN
      interest_score := ROUND((shared_interests::numeric / total_interests::numeric) * 20);
    ELSE
      interest_score := 10;
    END IF;
  ELSE
    interest_score := 10;
  END IF;
  
  -- 4. PERSONALITY COMPATIBILITY (0-20 points)
  SELECT COALESCE(ms.personality_score, 50) INTO personality_score
  FROM public.match_scores ms
  WHERE ms.user_id = seeker_id AND ms.potential_match_id = potential_match_id
    AND ms.expires_at > NOW();
  
  personality_score := ROUND(COALESCE(personality_score, 50) * 0.2);
  
  -- 5. BEHAVIORAL COMPATIBILITY (0-10 points)
  SELECT COALESCE(ms.behavioral_score, 50) INTO behavioral_score
  FROM public.match_scores ms
  WHERE ms.user_id = seeker_id AND ms.potential_match_id = potential_match_id
    AND ms.expires_at > NOW();
  
  behavioral_score := ROUND(COALESCE(behavioral_score, 50) * 0.1);
  
  -- 6. PREFERENCE MATCH (0-10 points)
  SELECT COALESCE(ms.preference_score, 50) INTO preference_score
  FROM public.match_scores ms
  WHERE ms.user_id = seeker_id AND ms.potential_match_id = potential_match_id
    AND ms.expires_at > NOW();
  
  preference_score := ROUND(COALESCE(preference_score, 50) * 0.1);
  
  -- CALCULATE TOTAL SCORE
  score := distance_score + age_score + interest_score + 
           personality_score + behavioral_score + preference_score;
  
  score := LEAST(GREATEST(score, 0), 100);
  
  RETURN score;
END;
$$ LANGUAGE plpgsql STABLE 
SET search_path = public, pg_temp;

COMMENT ON FUNCTION calculate_compatibility IS 'Calculate comprehensive compatibility score (0-100) between two users';

GRANT EXECUTE ON FUNCTION calculate_compatibility TO authenticated;
