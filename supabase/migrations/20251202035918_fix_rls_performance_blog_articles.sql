/*
  # Fix RLS Performance Issues for blog_articles
  
  Optimizes RLS policies to use (select auth.uid()) pattern
  instead of auth.uid() directly for better performance.
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Users can create articles" ON blog_articles;
DROP POLICY IF EXISTS "Users can update own articles" ON blog_articles;
DROP POLICY IF EXISTS "Users can delete own articles" ON blog_articles;

-- Recreate with optimized pattern
CREATE POLICY "Users can create articles"
  ON blog_articles FOR INSERT
  TO authenticated
  WITH CHECK (author_id = (select auth.uid()));

CREATE POLICY "Users can update own articles"
  ON blog_articles FOR UPDATE
  TO authenticated
  USING (author_id = (select auth.uid()))
  WITH CHECK (author_id = (select auth.uid()));

CREATE POLICY "Users can delete own articles"
  ON blog_articles FOR DELETE
  TO authenticated
  USING (author_id = (select auth.uid()));
