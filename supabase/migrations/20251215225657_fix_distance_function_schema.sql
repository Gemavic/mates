/*
  # Fix Distance Calculation Function Schema References

  This migration fixes the calculate_distance_km function to properly reference
  tables with explicit schema qualification.
*/

-- Drop and recreate with proper schema references
DROP FUNCTION IF EXISTS calculate_distance_km(uuid, uuid);

CREATE OR REPLACE FUNCTION calculate_distance_km(
  user1_id uuid,
  user2_id uuid
) RETURNS numeric AS $$
DECLARE
  distance_meters numeric;
BEGIN
  SELECT ST_Distance(
    (SELECT geo_location FROM public.user_profiles WHERE user_id = user1_id),
    (SELECT geo_location FROM public.user_profiles WHERE user_id = user2_id)
  ) INTO distance_meters;
  
  IF distance_meters IS NULL THEN
    RETURN NULL;
  END IF;
  
  RETURN ROUND((distance_meters / 1000)::numeric, 2);
END;
$$ LANGUAGE plpgsql STABLE 
SET search_path = public, pg_temp;

COMMENT ON FUNCTION calculate_distance_km IS 'Calculate distance between two users in kilometers';

GRANT EXECUTE ON FUNCTION calculate_distance_km TO authenticated;
