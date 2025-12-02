/*
  # Matching System Tables Migration
  
  1. New Tables
    - `user_likes`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references user_profiles)
      - `target_user_id` (uuid, references user_profiles)
      - `like_type` (text: 'like', 'super_like', 'pass', 'blink')
      - `created_at` (timestamptz)
      - Unique constraint on (user_id, target_user_id)
    
    - `matches`
      - `id` (uuid, primary key)
      - `user1_id` (uuid, references user_profiles)
      - `user2_id` (uuid, references user_profiles)
      - `matched_at` (timestamptz)
      - `last_activity` (timestamptz)
      - `is_active` (boolean, default true)
      - Unique constraint on sorted user pair
    
    - `user_personality_profile`
      - `user_id` (uuid, primary key, references user_profiles)
      - `big_five_openness` (integer, 0-100)
      - `big_five_conscientiousness` (integer, 0-100)
      - `big_five_extraversion` (integer, 0-100)
      - `big_five_agreeableness` (integer, 0-100)
      - `big_five_neuroticism` (integer, 0-100)
      - `attachment_style` (text)
      - `love_language_primary` (text)
      - `communication_style` (text)
      - `conflict_resolution` (text)
      - `life_goals` (jsonb array)
      - `values` (jsonb array)
      - `interests` (jsonb array of {interest, weight})
    
    - `user_behavioral_metrics`
      - `user_id` (uuid, primary key, references user_profiles)
      - `response_rate` (numeric)
      - `average_response_time_minutes` (integer)
      - `conversation_quality_score` (integer, 0-100)
      - `video_chat_acceptance_rate` (numeric)
      - `date_acceptance_rate` (numeric)
      - `profile_completion_score` (integer, 0-100)
      - `engagement_score` (integer, 0-100)
      - `updated_at` (timestamptz)
    
    - `matching_preferences`
      - `user_id` (uuid, primary key, references user_profiles)
      - `age_min` (integer)
      - `age_max` (integer)
      - `distance_max` (integer)
      - `education_levels` (jsonb array)
      - `relationship_goals` (jsonb array)
      - `has_children_pref` (text)
      - `wants_children_pref` (text)
      - `dealbreakers` (jsonb array)
      - `must_haves` (jsonb array)
      - `updated_at` (timestamptz)
    
    - `match_scores`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references user_profiles)
      - `potential_match_id` (uuid, references user_profiles)
      - `overall_score` (integer, 0-100)
      - `personality_score` (integer, 0-100)
      - `behavioral_score` (integer, 0-100)
      - `preference_score` (integer, 0-100)
      - `interest_score` (integer, 0-100)
      - `value_alignment_score` (integer, 0-100)
      - `communication_compatibility` (integer, 0-100)
      - `lifestyle_compatibility` (integer, 0-100)
      - `match_reasons` (jsonb array)
      - `calculated_at` (timestamptz)
      - `expires_at` (timestamptz)
      - Unique constraint on (user_id, potential_match_id)
    
    - `matching_interactions`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references user_profiles)
      - `target_user_id` (uuid, references user_profiles)
      - `interaction_type` (text)
      - `match_score_at_interaction` (integer)
      - `outcome` (text)
      - `created_at` (timestamptz)
  
  2. Security
    - Enable RLS on all matching tables
    - Users can view their own data and mutual matches
*/

CREATE TABLE IF NOT EXISTS user_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES user_profiles(user_id) ON DELETE CASCADE,
  target_user_id uuid NOT NULL REFERENCES user_profiles(user_id) ON DELETE CASCADE,
  like_type text NOT NULL CHECK (like_type IN ('like', 'super_like', 'pass', 'blink')),
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, target_user_id)
);

CREATE TABLE IF NOT EXISTS matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user1_id uuid NOT NULL REFERENCES user_profiles(user_id) ON DELETE CASCADE,
  user2_id uuid NOT NULL REFERENCES user_profiles(user_id) ON DELETE CASCADE,
  matched_at timestamptz DEFAULT now(),
  last_activity timestamptz DEFAULT now(),
  is_active boolean DEFAULT true,
  CHECK (user1_id < user2_id)
);

CREATE TABLE IF NOT EXISTS user_personality_profile (
  user_id uuid PRIMARY KEY REFERENCES user_profiles(user_id) ON DELETE CASCADE,
  big_five_openness integer DEFAULT 50 CHECK (big_five_openness >= 0 AND big_five_openness <= 100),
  big_five_conscientiousness integer DEFAULT 50 CHECK (big_five_conscientiousness >= 0 AND big_five_conscientiousness <= 100),
  big_five_extraversion integer DEFAULT 50 CHECK (big_five_extraversion >= 0 AND big_five_extraversion <= 100),
  big_five_agreeableness integer DEFAULT 50 CHECK (big_five_agreeableness >= 0 AND big_five_agreeableness <= 100),
  big_five_neuroticism integer DEFAULT 50 CHECK (big_five_neuroticism >= 0 AND big_five_neuroticism <= 100),
  attachment_style text DEFAULT 'secure' CHECK (attachment_style IN ('secure', 'anxious', 'avoidant', 'fearful')),
  love_language_primary text DEFAULT '',
  communication_style text DEFAULT 'direct',
  conflict_resolution text DEFAULT 'collaborative',
  life_goals jsonb DEFAULT '[]'::jsonb,
  values jsonb DEFAULT '[]'::jsonb,
  interests jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_behavioral_metrics (
  user_id uuid PRIMARY KEY REFERENCES user_profiles(user_id) ON DELETE CASCADE,
  response_rate numeric DEFAULT 0 CHECK (response_rate >= 0 AND response_rate <= 1),
  average_response_time_minutes integer DEFAULT 0 CHECK (average_response_time_minutes >= 0),
  conversation_quality_score integer DEFAULT 50 CHECK (conversation_quality_score >= 0 AND conversation_quality_score <= 100),
  video_chat_acceptance_rate numeric DEFAULT 0 CHECK (video_chat_acceptance_rate >= 0 AND video_chat_acceptance_rate <= 1),
  date_acceptance_rate numeric DEFAULT 0 CHECK (date_acceptance_rate >= 0 AND date_acceptance_rate <= 1),
  profile_completion_score integer DEFAULT 0 CHECK (profile_completion_score >= 0 AND profile_completion_score <= 100),
  engagement_score integer DEFAULT 50 CHECK (engagement_score >= 0 AND engagement_score <= 100),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS matching_preferences (
  user_id uuid PRIMARY KEY REFERENCES user_profiles(user_id) ON DELETE CASCADE,
  age_min integer DEFAULT 18 CHECK (age_min >= 18),
  age_max integer DEFAULT 99 CHECK (age_max <= 120),
  distance_max integer DEFAULT 50 CHECK (distance_max >= 0),
  education_levels jsonb DEFAULT '[]'::jsonb,
  relationship_goals jsonb DEFAULT '[]'::jsonb,
  has_children_pref text DEFAULT 'no_preference' CHECK (has_children_pref IN ('yes', 'no', 'no_preference')),
  wants_children_pref text DEFAULT 'no_preference' CHECK (wants_children_pref IN ('yes', 'no', 'no_preference')),
  dealbreakers jsonb DEFAULT '[]'::jsonb,
  must_haves jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS match_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES user_profiles(user_id) ON DELETE CASCADE,
  potential_match_id uuid NOT NULL REFERENCES user_profiles(user_id) ON DELETE CASCADE,
  overall_score integer NOT NULL CHECK (overall_score >= 0 AND overall_score <= 100),
  personality_score integer NOT NULL CHECK (personality_score >= 0 AND personality_score <= 100),
  behavioral_score integer NOT NULL CHECK (behavioral_score >= 0 AND behavioral_score <= 100),
  preference_score integer NOT NULL CHECK (preference_score >= 0 AND preference_score <= 100),
  interest_score integer NOT NULL CHECK (interest_score >= 0 AND interest_score <= 100),
  value_alignment_score integer NOT NULL CHECK (value_alignment_score >= 0 AND value_alignment_score <= 100),
  communication_compatibility integer NOT NULL CHECK (communication_compatibility >= 0 AND communication_compatibility <= 100),
  lifestyle_compatibility integer NOT NULL CHECK (lifestyle_compatibility >= 0 AND lifestyle_compatibility <= 100),
  match_reasons jsonb DEFAULT '[]'::jsonb,
  calculated_at timestamptz DEFAULT now(),
  expires_at timestamptz NOT NULL,
  UNIQUE(user_id, potential_match_id)
);

CREATE TABLE IF NOT EXISTS matching_interactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES user_profiles(user_id) ON DELETE CASCADE,
  target_user_id uuid NOT NULL REFERENCES user_profiles(user_id) ON DELETE CASCADE,
  interaction_type text NOT NULL,
  match_score_at_interaction integer,
  outcome text DEFAULT 'neutral',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE user_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_personality_profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_behavioral_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE matching_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE matching_interactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own likes"
  ON user_likes FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can create likes"
  ON user_likes FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their likes"
  ON user_likes FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can view likes they received"
  ON user_likes FOR SELECT
  TO authenticated
  USING (target_user_id = auth.uid());

CREATE POLICY "Users can view their matches"
  ON matches FOR SELECT
  TO authenticated
  USING (user1_id = auth.uid() OR user2_id = auth.uid());

CREATE POLICY "System can create matches"
  ON matches FOR INSERT
  TO authenticated
  WITH CHECK (user1_id = auth.uid() OR user2_id = auth.uid());

CREATE POLICY "Users can update their matches"
  ON matches FOR UPDATE
  TO authenticated
  USING (user1_id = auth.uid() OR user2_id = auth.uid())
  WITH CHECK (user1_id = auth.uid() OR user2_id = auth.uid());

CREATE POLICY "Users can view their own personality profile"
  ON user_personality_profile FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can manage their personality profile"
  ON user_personality_profile FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can view their behavioral metrics"
  ON user_behavioral_metrics FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can manage their behavioral metrics"
  ON user_behavioral_metrics FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can manage their matching preferences"
  ON matching_preferences FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can view their match scores"
  ON match_scores FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "System can manage match scores"
  ON match_scores FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can view their interactions"
  ON matching_interactions FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can create interactions"
  ON matching_interactions FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE INDEX idx_user_likes_user ON user_likes(user_id);
CREATE INDEX idx_user_likes_target ON user_likes(target_user_id);
CREATE INDEX idx_matches_user1 ON matches(user1_id);
CREATE INDEX idx_matches_user2 ON matches(user2_id);
CREATE INDEX idx_match_scores_user ON match_scores(user_id);
CREATE INDEX idx_match_scores_expires ON match_scores(expires_at);
CREATE INDEX idx_match_scores_score ON match_scores(overall_score DESC);
