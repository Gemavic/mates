/*
  # Fix Function Search Paths
  
  Sets immutable search paths for functions to improve security
  and prevent search_path manipulation attacks.
*/

-- Fix next_auth.uid function if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE p.proname = 'uid' AND n.nspname = 'next_auth'
  ) THEN
    EXECUTE 'ALTER FUNCTION next_auth.uid() SET search_path = next_auth, public';
  END IF;
END $$;

-- Fix public functions
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_user_verification_status' AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')) THEN
    ALTER FUNCTION public.get_user_verification_status(uuid) SET search_path = public, pg_temp;
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_blog_articles_updated_at' AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')) THEN
    ALTER FUNCTION public.update_blog_articles_updated_at() SET search_path = public, pg_temp;
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'increment_blog_article_views' AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')) THEN
    ALTER FUNCTION public.increment_blog_article_views(uuid) SET search_path = public, pg_temp;
  END IF;
END $$;
