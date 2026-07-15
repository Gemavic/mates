-- FIX PERMISSION DENIED ERRORS
-- Copy this ENTIRE file and paste into Supabase SQL Editor

-- USER PROFILES
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view public profiles" ON user_profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Allow public profile viewing" ON user_profiles;
DROP POLICY IF EXISTS "Allow authenticated users to read profiles" ON user_profiles;
DROP POLICY IF EXISTS "Users can read all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Authenticated users can read all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can delete own profile" ON user_profiles;

CREATE POLICY "Authenticated users can read all profiles" ON user_profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert own profile" ON user_profiles FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own profile" ON user_profiles FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can delete own profile" ON user_profiles FOR DELETE TO authenticated USING (user_id = auth.uid());

-- USER CREDITS
ALTER TABLE user_credits ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their own credits" ON user_credits;
DROP POLICY IF EXISTS "Users can manage their credits" ON user_credits;
DROP POLICY IF EXISTS "Users can view own credits" ON user_credits;
DROP POLICY IF EXISTS "Users can insert own credits" ON user_credits;
DROP POLICY IF EXISTS "Users can update own credits" ON user_credits;

CREATE POLICY "Users can view own credits" ON user_credits FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can insert own credits" ON user_credits FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own credits" ON user_credits FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- USER PREFERENCES
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their own preferences" ON user_preferences;
DROP POLICY IF EXISTS "Users can view their preferences" ON user_preferences;
DROP POLICY IF EXISTS "Users can select own preferences" ON user_preferences;
DROP POLICY IF EXISTS "Users can insert own preferences" ON user_preferences;
DROP POLICY IF EXISTS "Users can update own preferences" ON user_preferences;
DROP POLICY IF EXISTS "Users can delete own preferences" ON user_preferences;

CREATE POLICY "Users can select own preferences" ON user_preferences FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can insert own preferences" ON user_preferences FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own preferences" ON user_preferences FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can delete own preferences" ON user_preferences FOR DELETE TO authenticated USING (user_id = auth.uid());

-- USER PHOTOS
ALTER TABLE user_photos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view photos of visible profiles" ON user_photos;
DROP POLICY IF EXISTS "Users can manage their own photos" ON user_photos;
DROP POLICY IF EXISTS "Authenticated users can view all photos" ON user_photos;
DROP POLICY IF EXISTS "Users can insert own photos" ON user_photos;
DROP POLICY IF EXISTS "Users can update own photos" ON user_photos;
DROP POLICY IF EXISTS "Users can delete own photos" ON user_photos;

CREATE POLICY "Authenticated users can view all photos" ON user_photos FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert own photos" ON user_photos FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own photos" ON user_photos FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can delete own photos" ON user_photos FOR DELETE TO authenticated USING (user_id = auth.uid());

-- CREDIT PACKAGES
ALTER TABLE credit_packages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can view credit packages" ON credit_packages;
DROP POLICY IF EXISTS "Authenticated users can view packages" ON credit_packages;
DROP POLICY IF EXISTS "Authenticated users can view credit packages" ON credit_packages;

CREATE POLICY "Authenticated users can view credit packages" ON credit_packages FOR SELECT TO authenticated USING (true);

-- VIRTUAL GIFTS
ALTER TABLE virtual_gifts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can view active gifts" ON virtual_gifts;
DROP POLICY IF EXISTS "Authenticated users can view gifts" ON virtual_gifts;
DROP POLICY IF EXISTS "Authenticated users can view virtual gifts" ON virtual_gifts;

CREATE POLICY "Authenticated users can view virtual gifts" ON virtual_gifts FOR SELECT TO authenticated USING (is_active = true);

-- MESSAGES
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their own messages" ON messages;
DROP POLICY IF EXISTS "Users can send messages" ON messages;
DROP POLICY IF EXISTS "Users can view own messages" ON messages;
DROP POLICY IF EXISTS "Users can update own sent messages" ON messages;

CREATE POLICY "Users can view own messages" ON messages FOR SELECT TO authenticated USING (from_user_id = auth.uid() OR to_user_id = auth.uid());
CREATE POLICY "Users can send messages" ON messages FOR INSERT TO authenticated WITH CHECK (from_user_id = auth.uid());
CREATE POLICY "Users can update own sent messages" ON messages FOR UPDATE TO authenticated USING (from_user_id = auth.uid()) WITH CHECK (from_user_id = auth.uid());

-- LIKES
ALTER TABLE likes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can create likes" ON likes;
DROP POLICY IF EXISTS "Users can view likes they sent or received" ON likes;
DROP POLICY IF EXISTS "Users can view own likes" ON likes;
DROP POLICY IF EXISTS "Users can delete own likes" ON likes;

CREATE POLICY "Users can view own likes" ON likes FOR SELECT TO authenticated USING (from_user_id = auth.uid() OR to_user_id = auth.uid());
CREATE POLICY "Users can create likes" ON likes FOR INSERT TO authenticated WITH CHECK (from_user_id = auth.uid());
CREATE POLICY "Users can delete own likes" ON likes FOR DELETE TO authenticated USING (from_user_id = auth.uid());

-- MATCHES
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their own matches" ON matches;
DROP POLICY IF EXISTS "Users can view own matches" ON matches;
DROP POLICY IF EXISTS "Users can insert matches" ON matches;

CREATE POLICY "Users can view own matches" ON matches FOR SELECT TO authenticated USING (user1_id = auth.uid() OR user2_id = auth.uid());
CREATE POLICY "Users can insert matches" ON matches FOR INSERT TO authenticated WITH CHECK (user1_id = auth.uid() OR user2_id = auth.uid());

-- MATCH CONVERSATIONS
ALTER TABLE match_conversations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view messages in their matches" ON match_conversations;
DROP POLICY IF EXISTS "Users can send messages in their matches" ON match_conversations;
DROP POLICY IF EXISTS "Users can view match messages" ON match_conversations;
DROP POLICY IF EXISTS "Users can send match messages" ON match_conversations;

CREATE POLICY "Users can view match messages" ON match_conversations FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM matches WHERE matches.id = match_conversations.match_id AND (matches.user1_id = auth.uid() OR matches.user2_id = auth.uid())));
CREATE POLICY "Users can send match messages" ON match_conversations FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND EXISTS (SELECT 1 FROM matches WHERE matches.id = match_conversations.match_id AND (matches.user1_id = auth.uid() OR matches.user2_id = auth.uid())));

-- BLOG ARTICLES
ALTER TABLE blog_articles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can view published articles" ON blog_articles;
DROP POLICY IF EXISTS "Authenticated users can view published articles" ON blog_articles;

CREATE POLICY "Authenticated users can view published articles" ON blog_articles FOR SELECT TO authenticated USING (published = true);

-- BLOG COMMENTS
ALTER TABLE blog_comments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can view comments" ON blog_comments;
DROP POLICY IF EXISTS "Authenticated users can post comments" ON blog_comments;
DROP POLICY IF EXISTS "Authenticated users can view comments" ON blog_comments;
DROP POLICY IF EXISTS "Users can post comments" ON blog_comments;

CREATE POLICY "Authenticated users can view comments" ON blog_comments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can post comments" ON blog_comments FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- CREDIT TRANSACTIONS
ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their own transactions" ON credit_transactions;
DROP POLICY IF EXISTS "Users can view own transactions" ON credit_transactions;
DROP POLICY IF EXISTS "Users can insert own transactions" ON credit_transactions;

CREATE POLICY "Users can view own transactions" ON credit_transactions FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can insert own transactions" ON credit_transactions FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- GIFT TRANSACTIONS
ALTER TABLE gift_transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view gifts they sent or received" ON gift_transactions;
DROP POLICY IF EXISTS "Users can send gifts" ON gift_transactions;
DROP POLICY IF EXISTS "Users can view own gifts" ON gift_transactions;

CREATE POLICY "Users can view own gifts" ON gift_transactions FOR SELECT TO authenticated USING (from_user_id = auth.uid() OR to_user_id = auth.uid());
CREATE POLICY "Users can send gifts" ON gift_transactions FOR INSERT TO authenticated WITH CHECK (from_user_id = auth.uid());

-- VERIFICATION REQUESTS
ALTER TABLE verification_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their own verification requests" ON verification_requests;
DROP POLICY IF EXISTS "Users can submit verification requests" ON verification_requests;
DROP POLICY IF EXISTS "Users can view own verification" ON verification_requests;
DROP POLICY IF EXISTS "Users can submit verification" ON verification_requests;

CREATE POLICY "Users can view own verification" ON verification_requests FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can submit verification" ON verification_requests FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- COUNSELLING BOOKINGS
ALTER TABLE counselling_bookings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their own bookings" ON counselling_bookings;
DROP POLICY IF EXISTS "Users can create bookings" ON counselling_bookings;
DROP POLICY IF EXISTS "Users can view own bookings" ON counselling_bookings;

CREATE POLICY "Users can view own bookings" ON counselling_bookings FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can create bookings" ON counselling_bookings FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- USER BLOCKED
ALTER TABLE user_blocked ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their own blocked list" ON user_blocked;
DROP POLICY IF EXISTS "Users can view own blocked list" ON user_blocked;
DROP POLICY IF EXISTS "Users can add to blocked list" ON user_blocked;
DROP POLICY IF EXISTS "Users can remove from blocked list" ON user_blocked;

CREATE POLICY "Users can view own blocked list" ON user_blocked FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can add to blocked list" ON user_blocked FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can remove from blocked list" ON user_blocked FOR DELETE TO authenticated USING (user_id = auth.uid());

-- FORUM POSTS
ALTER TABLE forum_posts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can view forum posts" ON forum_posts;
DROP POLICY IF EXISTS "Authenticated users can create posts" ON forum_posts;
DROP POLICY IF EXISTS "Authenticated users can view posts" ON forum_posts;
DROP POLICY IF EXISTS "Users can create posts" ON forum_posts;
DROP POLICY IF EXISTS "Users can update own posts" ON forum_posts;
DROP POLICY IF EXISTS "Users can delete own posts" ON forum_posts;

CREATE POLICY "Authenticated users can view posts" ON forum_posts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can create posts" ON forum_posts FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own posts" ON forum_posts FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can delete own posts" ON forum_posts FOR DELETE TO authenticated USING (user_id = auth.uid());

-- FORUM REPLIES
ALTER TABLE forum_replies ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can view replies" ON forum_replies;
DROP POLICY IF EXISTS "Authenticated users can post replies" ON forum_replies;
DROP POLICY IF EXISTS "Authenticated users can view replies" ON forum_replies;
DROP POLICY IF EXISTS "Users can post replies" ON forum_replies;
DROP POLICY IF EXISTS "Users can update own replies" ON forum_replies;
DROP POLICY IF EXISTS "Users can delete own replies" ON forum_replies;

CREATE POLICY "Authenticated users can view replies" ON forum_replies FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can post replies" ON forum_replies FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own replies" ON forum_replies FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can delete own replies" ON forum_replies FOR DELETE TO authenticated USING (user_id = auth.uid());

-- NEWSLETTER SUBSCRIBERS
ALTER TABLE newsletter_subscribers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can subscribe to newsletter" ON newsletter_subscribers;
DROP POLICY IF EXISTS "Anyone can subscribe" ON newsletter_subscribers;

CREATE POLICY "Anyone can subscribe" ON newsletter_subscribers FOR INSERT TO authenticated WITH CHECK (true);

SELECT 'SUCCESS: All RLS policies have been fixed!' as message;
