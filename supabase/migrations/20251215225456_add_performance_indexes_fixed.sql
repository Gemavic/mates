/*
  # Add Performance Optimization Indexes (Fixed)

  This migration adds strategic indexes to improve query performance across the dating app.
  
  ## Changes
  
  1. GIN Indexes (for JSONB and array searches)
    - user_profiles.interests (fast interest matching)
    - matching_preferences arrays (education, occupation, religion)
    - user_personality_profile.life_goals, values, interests
  
  2. Partial Indexes (for common filtered queries)
    - Active and verified profiles
    - Online users
    - Unread messages
  
  3. Composite Indexes (for common query patterns)
    - User lookups with verification status
    - Match queries
  
  ## Impact
  - Significantly faster profile discovery
  - Improved matching algorithm performance
  - Faster interest-based searches
  - Reduced query execution time for common patterns
  
  ## Note
  - Avoided NOW() in partial indexes (not immutable)
  - Used static predicates for better performance
*/

-- GIN index for user_profiles interests (JSONB)
CREATE INDEX IF NOT EXISTS idx_user_profiles_interests_gin 
ON user_profiles USING GIN(interests);

-- Partial index for active, verified profiles (most common query)
CREATE INDEX IF NOT EXISTS idx_user_profiles_active_verified 
ON user_profiles(user_id, last_active) 
WHERE is_verified = true AND is_online = true;

-- Index for recent activity queries
CREATE INDEX IF NOT EXISTS idx_user_profiles_last_active 
ON user_profiles(last_active DESC) 
WHERE is_verified = true;

-- GIN indexes for matching_preferences arrays
CREATE INDEX IF NOT EXISTS idx_matching_preferences_education 
ON matching_preferences USING GIN(education_level);

CREATE INDEX IF NOT EXISTS idx_matching_preferences_occupation 
ON matching_preferences USING GIN(occupation_categories);

CREATE INDEX IF NOT EXISTS idx_matching_preferences_religion 
ON matching_preferences USING GIN(religion_preferences);

-- GIN indexes for personality profile JSONB fields
CREATE INDEX IF NOT EXISTS idx_personality_life_goals 
ON user_personality_profile USING GIN(life_goals);

CREATE INDEX IF NOT EXISTS idx_personality_values 
ON user_personality_profile USING GIN(values);

CREATE INDEX IF NOT EXISTS idx_personality_interests 
ON user_personality_profile USING GIN(interests);

-- Composite index for match lookups
CREATE INDEX IF NOT EXISTS idx_matches_users_lookup 
ON matches(user1_id, user2_id, matched_at);

-- Regular index for match scores expiration (removed NOW() predicate)
CREATE INDEX IF NOT EXISTS idx_match_scores_expires 
ON match_scores(user_id, expires_at, overall_score DESC);

-- Partial index for unread messages
CREATE INDEX IF NOT EXISTS idx_messages_unread 
ON messages(to_user_id, created_at DESC) 
WHERE is_read = false;

-- Index for user behavioral metrics (used in matching algorithm)
CREATE INDEX IF NOT EXISTS idx_behavioral_engagement 
ON user_behavioral_metrics(user_id, engagement_score) 
WHERE engagement_score >= 50;

-- Index for verification status lookups
CREATE INDEX IF NOT EXISTS idx_verification_status 
ON verification_requests(user_id, verification_status) 
WHERE verification_status IN ('submitted', 'under_review');

-- Index for credit transactions by type
CREATE INDEX IF NOT EXISTS idx_credit_transactions_type 
ON credit_transactions(user_id, transaction_type, created_at DESC);

-- Index for user likes/matches
CREATE INDEX IF NOT EXISTS idx_user_likes_lookup 
ON user_likes(user_id, target_user_id, like_type);

-- Comment on the optimization strategy
COMMENT ON INDEX idx_user_profiles_interests_gin IS 'GIN index for fast JSONB interest matching queries';
COMMENT ON INDEX idx_user_profiles_active_verified IS 'Partial index for active verified users - most common discovery query';
COMMENT ON INDEX idx_match_scores_expires IS 'Index for match score queries with expiration filtering';
