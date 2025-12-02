/*
  # Insert Default Virtual Gifts
  
  Populates the virtual_gifts table with default gift offerings.
*/

INSERT INTO virtual_gifts (gift_name, gift_description, credit_cost, category, popularity_score, is_active) VALUES
  ('Rose', 'A beautiful red rose to show your affection', 15, 'romantic', 95, true),
  ('Heart', 'Send love with a sparkling heart', 20, 'romantic', 90, true),
  ('Chocolate Box', 'Sweet gesture with delicious chocolates', 25, 'romantic', 85, true),
  ('Teddy Bear', 'Cute and cuddly teddy bear gift', 30, 'cute', 80, true),
  ('Diamond Ring', 'Luxurious diamond ring for special moments', 100, 'luxury', 75, true),
  ('Champagne', 'Celebrate together with champagne', 50, 'celebration', 70, true),
  ('Coffee', 'Virtual coffee date starter', 10, 'casual', 88, true),
  ('Stars', 'Send a constellation of stars', 15, 'romantic', 92, true),
  ('Trophy', 'You are a winner!', 20, 'fun', 65, true),
  ('Sunflower', 'Bright and cheerful sunflower', 15, 'romantic', 78, true)
ON CONFLICT DO NOTHING;
