/*
  # Add Message Delivery Tracking

  1. Changes
    - Add `is_delivered` column to mail_messages table
    - Add `delivered_at` timestamp column
    - Add `read_at` timestamp column for better tracking
    - Update indexes for efficient queries

  2. Purpose
    - Track when messages are delivered (saved to database) = 1 tick
    - Track when messages are read (viewed by recipient) = 2 ticks
    - Enable proper read receipt functionality
*/

-- Add delivery tracking columns
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'mail_messages' AND column_name = 'is_delivered'
  ) THEN
    ALTER TABLE mail_messages ADD COLUMN is_delivered boolean DEFAULT true;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'mail_messages' AND column_name = 'delivered_at'
  ) THEN
    ALTER TABLE mail_messages ADD COLUMN delivered_at timestamptz DEFAULT now();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'mail_messages' AND column_name = 'read_at'
  ) THEN
    ALTER TABLE mail_messages ADD COLUMN read_at timestamptz;
  END IF;
END $$;

-- Update existing messages to be marked as delivered
UPDATE mail_messages
SET is_delivered = true,
    delivered_at = created_at
WHERE is_delivered IS NULL;

-- Update read_at for already read messages
UPDATE mail_messages
SET read_at = created_at
WHERE is_read = true AND read_at IS NULL;

-- Add index for delivery status queries
CREATE INDEX IF NOT EXISTS idx_mail_messages_delivery_status
ON mail_messages(sender_id, is_delivered, is_read);

-- Add comment
COMMENT ON COLUMN mail_messages.is_delivered IS 'Message delivered to database (1 tick)';
COMMENT ON COLUMN mail_messages.is_read IS 'Message read by recipient (2 ticks)';
