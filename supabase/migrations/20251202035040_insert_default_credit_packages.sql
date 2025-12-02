/*
  # Insert Default Credit Packages
  
  Populates the credit_packages table with default package offerings
  matching the pricing structure in the application.
*/

INSERT INTO credit_packages (id, package_name, credits, bonus_credits, price_usd, package_type, is_popular, features) VALUES
  ('starter', 'Starter Credits', 50, 10, 14.99, 'credits', false, '["50 Credits", "10 Bonus Credits", "Chat & Messaging", "Profile Features"]'::jsonb),
  ('popular', 'Popular Credits', 100, 25, 29.99, 'credits', true, '["100 Credits", "25 Bonus Credits", "Premium Features", "Priority Support"]'::jsonb),
  ('premium', 'Premium Credits', 450, 0, 79.99, 'credits', false, '["450 Credits", "Premium Features", "VIP Features", "Unlimited Access"]'::jsonb),
  ('kobos-small', 'Kobos Pack', 20, 0, 9.99, 'kobos', false, '["20 Kobos", "Chat Only Currency", "Special Rate", "1 Kobo = 1 Minute Chat"]'::jsonb),
  ('kobos-large', 'Mega Kobos', 200, 0, 89.99, 'kobos', true, '["200 Kobos", "Best Value", "Chat Premium", "Extended Chat Time"]'::jsonb),
  ('ultimate', 'Ultimate Combo', 750, 100, 159.99, 'combo', false, '["750 Credits", "100 Bonus Credits", "Everything Included", "VIP Status"]'::jsonb),
  ('combo-mega', 'Mega Combo', 1000, 200, 199.99, 'combo', false, '["1000 Credits", "200 Bonus Credits", "Premium Everything", "Lifetime Support"]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  package_name = EXCLUDED.package_name,
  credits = EXCLUDED.credits,
  bonus_credits = EXCLUDED.bonus_credits,
  price_usd = EXCLUDED.price_usd,
  package_type = EXCLUDED.package_type,
  is_popular = EXCLUDED.is_popular,
  features = EXCLUDED.features;
