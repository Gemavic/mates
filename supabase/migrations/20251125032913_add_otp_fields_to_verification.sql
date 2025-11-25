/*
  # Add OTP Fields to Verification Requests

  ## Changes
  - Add OTP code storage field for phone verification
  - Add OTP expiration timestamp
  - Add phone_verified boolean flag
  
  ## New Columns
  - `otp_code` (text, nullable) - Stores the 6-digit verification code
  - `otp_expires_at` (timestamptz, nullable) - When the OTP expires (10 minutes from generation)
  - `phone_verified` (boolean, default false) - Whether phone number has been verified
  
  ## Security Notes
  - OTP codes are cleared after successful verification
  - OTP expires after 10 minutes for security
  - Requires authentication to access
*/

-- Add OTP fields to verification_requests table
DO $$
BEGIN
  -- Add otp_code column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'verification_requests' AND column_name = 'otp_code'
  ) THEN
    ALTER TABLE verification_requests ADD COLUMN otp_code text;
  END IF;

  -- Add otp_expires_at column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'verification_requests' AND column_name = 'otp_expires_at'
  ) THEN
    ALTER TABLE verification_requests ADD COLUMN otp_expires_at timestamptz;
  END IF;

  -- Add phone_verified column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'verification_requests' AND column_name = 'phone_verified'
  ) THEN
    ALTER TABLE verification_requests ADD COLUMN phone_verified boolean DEFAULT false;
  END IF;
END $$;

-- Add index on otp_expires_at for efficient expiration checks
CREATE INDEX IF NOT EXISTS idx_verification_requests_otp_expires 
ON verification_requests(otp_expires_at) 
WHERE otp_expires_at IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN verification_requests.otp_code IS 'Temporary 6-digit code for phone verification - cleared after use';
COMMENT ON COLUMN verification_requests.otp_expires_at IS 'OTP expiration time - codes expire 10 minutes after generation';
COMMENT ON COLUMN verification_requests.phone_verified IS 'Whether the phone number has been successfully verified';
