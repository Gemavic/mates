/*
  # Enable PostGIS Extension for Geographic Queries

  This migration enables PostGIS, which provides geographic data types and spatial functions.
  This allows us to:
  - Store user locations as geographic points
  - Query users by distance
  - Build location-based matching recommendations
  
  ## Changes
  1. Enable PostGIS extension if not already enabled
  2. Enable PostGIS topology extension (optional, for advanced spatial queries)
  
  ## Impact
  - No breaking changes
  - Adds geographic query capabilities
  - Required for location-based matching features
*/

-- Enable PostGIS extension for geographic data types and functions
CREATE EXTENSION IF NOT EXISTS postgis;

-- Enable PostGIS topology (optional, for advanced spatial features)
CREATE EXTENSION IF NOT EXISTS postgis_topology;
