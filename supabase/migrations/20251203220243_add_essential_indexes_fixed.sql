/*
  # Add Essential Indexes for Production (Fixed)
  
  Creates indexes on frequently queried columns to optimize performance.
  Removes non-immutable predicates from WHERE clauses.
*/

-- User Profiles - Discovery and search
CREATE INDEX IF NOT EXISTS idx_user_profiles_visibility ON user_profiles(profile_visibility) WHERE profile_visibility = 'public';
CREATE INDEX IF NOT EXISTS idx_user_profiles_age ON user_profiles(age) WHERE age IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_user_profiles_location ON user_profiles(location) WHERE location IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_user_profiles_verified ON user_profiles(is_verified) WHERE is_verified = true;

-- User Likes - Matching logic
CREATE INDEX IF NOT EXISTS idx_user_likes_target ON user_likes(target_user_id, like_type);
CREATE INDEX IF NOT EXISTS idx_user_likes_user_type ON user_likes(user_id, like_type);
CREATE INDEX IF NOT EXISTS idx_user_likes_created ON user_likes(created_at DESC);

-- Matches - Active matches
CREATE INDEX IF NOT EXISTS idx_matches_user1_active ON matches(user1_id, last_activity DESC) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_matches_user2_active ON matches(user2_id, last_activity DESC) WHERE is_active = true;

-- Chat Threads and Messages
CREATE INDEX IF NOT EXISTS idx_chat_threads_match ON chat_threads(match_id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_chat_messages_thread_created ON chat_messages(thread_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_sender ON chat_messages(sender_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_unread ON chat_messages(thread_id) WHERE is_read = false;

-- Mail System
CREATE INDEX IF NOT EXISTS idx_mail_threads_participant1 ON mail_threads(participant1_id, updated_at DESC) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_mail_threads_participant2 ON mail_threads(participant2_id, updated_at DESC) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_mail_messages_thread_created ON mail_messages(thread_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mail_messages_unread ON mail_messages(thread_id) WHERE is_read = false;

-- Match Scores - Recommendations (removed non-immutable predicate)
CREATE INDEX IF NOT EXISTS idx_match_scores_user_score ON match_scores(user_id, overall_score DESC, expires_at DESC);
CREATE INDEX IF NOT EXISTS idx_match_scores_expires ON match_scores(expires_at DESC);

-- Credit System
CREATE INDEX IF NOT EXISTS idx_credit_transactions_user_created ON credit_transactions(user_id, created_at DESC);

-- Gifts
CREATE INDEX IF NOT EXISTS idx_sent_gifts_recipient ON sent_gifts(recipient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sent_gifts_sender ON sent_gifts(sender_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_virtual_gifts_active ON virtual_gifts(category, popularity_score DESC) WHERE is_active = true;

-- Verification
CREATE INDEX IF NOT EXISTS idx_verification_requests_user ON verification_requests(user_id, status);
CREATE INDEX IF NOT EXISTS idx_verification_requests_status ON verification_requests(status, submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_verification_documents_request ON verification_documents(verification_request_id, status);

-- Community Features
CREATE INDEX IF NOT EXISTS idx_newsfeed_posts_public ON newsfeed_posts(created_at DESC) WHERE is_public = true;
CREATE INDEX IF NOT EXISTS idx_newsfeed_posts_user ON newsfeed_posts(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_post_likes_post ON post_likes(post_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_post_comments_post ON post_comments(post_id, created_at DESC);

-- Bookings and Services
CREATE INDEX IF NOT EXISTS idx_booking_sessions_user_date ON booking_sessions(user_id, session_date DESC);
CREATE INDEX IF NOT EXISTS idx_booking_sessions_status ON booking_sessions(status, session_date DESC);

-- Feedback
CREATE INDEX IF NOT EXISTS idx_feedback_status ON feedback_submissions(status, created_at DESC);

-- Payment Transactions
CREATE INDEX IF NOT EXISTS idx_payment_transactions_user_created ON payment_transactions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_status ON payment_transactions(payment_status, created_at DESC);

-- Newsletter
CREATE INDEX IF NOT EXISTS idx_newsletter_active ON newsletter_subscriptions(email) WHERE is_active = true;

-- Staff
CREATE INDEX IF NOT EXISTS idx_staff_members_active ON staff_members(email, role) WHERE is_active = true;

-- Matching system performance indexes
CREATE INDEX IF NOT EXISTS idx_user_personality_user ON user_personality_profile(user_id);
CREATE INDEX IF NOT EXISTS idx_user_behavioral_user ON user_behavioral_metrics(user_id);
CREATE INDEX IF NOT EXISTS idx_matching_preferences_user ON matching_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_matching_interactions_user ON matching_interactions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_matching_interactions_target ON matching_interactions(target_user_id, interaction_type);
