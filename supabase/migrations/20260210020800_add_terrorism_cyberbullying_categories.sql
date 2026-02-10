/*
  # Add Terrorism, Hate Speech, and Cyber Bullying Categories

  1. Changes
    - Update abuse_reports table to include new report types
    - Add terrorism, cyber_bullying, and expand hate_speech coverage
    - Update check constraint to allow new categories
    
  2. Security
    - Maintains existing RLS policies
    - No changes to permissions
    
  3. Purpose
    - Enhanced content moderation for terrorism content
    - Specific cyber bullying category (beyond general harassment)
    - Expanded hate speech detection and reporting
*/

-- Update the report_type check constraint to include new categories
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'abuse_reports_report_type_check'
  ) THEN
    ALTER TABLE public.abuse_reports 
    DROP CONSTRAINT abuse_reports_report_type_check;
  END IF;
END $$;

ALTER TABLE public.abuse_reports
ADD CONSTRAINT abuse_reports_report_type_check 
CHECK (report_type IN (
  'harassment',
  'nudity',
  'solicitation',
  'fraud',
  'underage',
  'violence',
  'hate_speech',
  'terrorism',
  'cyber_bullying',
  'spam',
  'other'
));

-- Add indexes for new report types for faster queries
CREATE INDEX IF NOT EXISTS idx_abuse_reports_terrorism 
ON public.abuse_reports(report_type) 
WHERE report_type = 'terrorism';

CREATE INDEX IF NOT EXISTS idx_abuse_reports_cyberbullying 
ON public.abuse_reports(report_type) 
WHERE report_type = 'cyber_bullying';

-- Add function to auto-escalate terrorism and cyber bullying reports
CREATE OR REPLACE FUNCTION public.auto_escalate_critical_reports()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Auto-escalate terrorism, underage, trafficking to critical priority
  IF NEW.report_type IN ('terrorism', 'underage', 'violence') THEN
    NEW.priority := 'critical';
    NEW.status := 'escalated';
  END IF;
  
  -- Set cyber bullying and hate speech to high priority
  IF NEW.report_type IN ('cyber_bullying', 'hate_speech') THEN
    NEW.priority := 'high';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for auto-escalation
DROP TRIGGER IF EXISTS trigger_auto_escalate_reports ON public.abuse_reports;

CREATE TRIGGER trigger_auto_escalate_reports
  BEFORE INSERT ON public.abuse_reports
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_escalate_critical_reports();

COMMENT ON FUNCTION public.auto_escalate_critical_reports IS 'Automatically escalates terrorism, underage, and violence reports to critical priority';
COMMENT ON TRIGGER trigger_auto_escalate_reports ON public.abuse_reports IS 'Auto-escalates critical report types on insert';
