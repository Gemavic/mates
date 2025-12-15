/*
  # Add Geographic Location Support to User Profiles

  This migration adds geographic location capabilities to the user_profiles table.
  
  ## Changes
  
  1. New Columns
    - `geo_location` (geography point) - Stores latitude/longitude for distance calculations
    - `location_updated_at` (timestamp) - Tracks when location was last updated
    - `location_accuracy_meters` (integer) - Optional accuracy metric
  
  2. Indexes
    - GiST index on geo_location for fast geographic queries
    - Index on location_updated_at for filtering stale locations
  
  3. Helper Function
    - `calculate_distance_km()` - Calculates distance between two users in kilometers
  
  ## Security
  - Maintains existing RLS policies
  - Location data follows same access rules as other profile data
  
  ## Performance
  - GiST spatial index enables fast radius queries
  - Can efficiently find users within X km of a location
*/

-- Add geographic location column to user_profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'geo_location'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN geo_location geography(POINT, 4326);
  END IF;
END $$;

-- Add metadata columns for location tracking
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'location_updated_at'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN location_updated_at timestamptz;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'location_accuracy_meters'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN location_accuracy_meters integer;
  END IF;
END $$;

-- Create GiST index for fast geographic queries
CREATE INDEX IF NOT EXISTS idx_user_profiles_geo_location 
ON user_profiles USING GIST(geo_location);

-- Create index for location freshness queries
CREATE INDEX IF NOT EXISTS idx_user_profiles_location_updated 
ON user_profiles(location_updated_at) 
WHERE geo_location IS NOT NULL;

-- Helper function to calculate distance between two users in kilometers
CREATE OR REPLACE FUNCTION calculate_distance_km(
  user1_id uuid,
  user2_id uuid
) RETURNS numeric AS $$
DECLARE
  distance_meters numeric;
BEGIN
  SELECT ST_Distance(
    (SELECT geo_location FROM user_profiles WHERE user_id = user1_id),
    (SELECT geo_location FROM user_profiles WHERE user_id = user2_id)
  ) INTO distance_meters;
  
  -- Return NULL if either user has no location
  IF distance_meters IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Convert meters to kilometers and round to 2 decimal places
  RETURN ROUND((distance_meters / 1000)::numeric, 2);
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Comment on function
COMMENT ON FUNCTION calculate_distance_km IS 'Calculate distance between two users in kilometers using their geographic locations';
