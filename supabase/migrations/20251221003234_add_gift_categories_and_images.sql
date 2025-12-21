/*
  # Add Gift Categories and Image Support

  1. Changes to `virtual_gifts` table
    - Add `category` column (text) for organizing gifts
    - Add `image_url` column (text) for custom gift images
    - Add `kobos_cost` column (integer) for alternative pricing
    - Add `popularity` column (integer) for sorting
    
  2. Data Updates
    - Add default categories to existing gifts
    - Insert new gift items with images and categories
*/

-- Add new columns to virtual_gifts table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'virtual_gifts' AND column_name = 'category'
  ) THEN
    ALTER TABLE virtual_gifts ADD COLUMN category text DEFAULT 'romantic';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'virtual_gifts' AND column_name = 'image_url'
  ) THEN
    ALTER TABLE virtual_gifts ADD COLUMN image_url text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'virtual_gifts' AND column_name = 'kobos_cost'
  ) THEN
    ALTER TABLE virtual_gifts ADD COLUMN kobos_cost integer DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'virtual_gifts' AND column_name = 'popularity'
  ) THEN
    ALTER TABLE virtual_gifts ADD COLUMN popularity integer DEFAULT 50;
  END IF;
END $$;

-- Update existing gifts with categories
UPDATE virtual_gifts SET category = 'romantic', popularity = 95, kobos_cost = credit_cost WHERE name = 'Rose';
UPDATE virtual_gifts SET category = 'romantic', popularity = 92, kobos_cost = credit_cost WHERE name = 'Heart';
UPDATE virtual_gifts SET category = 'luxury', popularity = 95, kobos_cost = credit_cost WHERE name = 'Diamond';

-- Insert new categorized gifts with the new image
INSERT INTO virtual_gifts (name, description, icon, credit_cost, kobos_cost, category, image_url, popularity, is_active)
VALUES
  ('Red Rose', 'Classic symbol of love', '🌹', 950, 950, 'romantic', '/images/gifts/frame_75.png', 95, true),
  ('Rose Bouquet', 'Beautiful flower arrangement', '💐', 1500, 1500, 'romantic', NULL, 88, true),
  ('Love Heart', 'Express your feelings', '💖', 300, 300, 'romantic', NULL, 92, true),
  ('Chocolate Box', 'Sweet treats', '🍫', 1200, 1200, 'romantic', NULL, 87, true),
  
  -- Luxury Gifts
  ('Premium Diamond', 'Ultimate luxury gift', '💎', 10000, 10000, 'luxury', NULL, 95, true),
  ('Emerald', 'Precious green gem', '💚', 8000, 8000, 'luxury', NULL, 75, true),
  ('Sapphire', 'Royal blue gem', '💙', 8500, 8500, 'luxury', NULL, 78, true),
  ('Crown', 'Treat them like royalty', '👑', 5000, 5000, 'luxury', NULL, 88, true),
  ('Champagne', 'Celebrate in style', '🍾', 3500, 3500, 'luxury', NULL, 85, true),
  ('Luxury Watch', 'Timeless elegance', '⌚', 7500, 7500, 'luxury', NULL, 72, true),
  ('Sports Car', 'Ultimate dream gift', '🏎️', 20000, 20000, 'luxury', NULL, 90, true),
  
  -- Fun & Cute Gifts
  ('Teddy Bear', 'Cuddly companion', '🧸', 800, 800, 'fun', NULL, 92, true),
  ('Cute Puppy', 'Adorable furry friend', '🐶', 1200, 1200, 'fun', NULL, 95, true),
  ('Birthday Cake', 'Celebrate special moments', '🎂', 1000, 1000, 'fun', NULL, 88, true),
  
  -- Casual Gifts
  ('Coffee', 'Morning energy boost', '☕', 300, 300, 'casual', NULL, 90, true),
  ('Pizza Slice', 'Delicious comfort food', '🍕', 500, 500, 'casual', NULL, 92, true),
  ('Ice Cream', 'Cool sweet treat', '🍦', 400, 400, 'casual', NULL, 89, true)
ON CONFLICT (id) DO NOTHING;