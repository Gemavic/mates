/*
  # Optimize Chat Performance

  1. Performance Improvements
    - Add composite index for faster message loading by thread
    - Add index for unread message queries
    - Add index for typing indicator lookups
    - Optimize real-time subscription performance

  2. Purpose
    - Reduce chat message loading time
    - Speed up read receipt updates
    - Improve typing indicator performance
    - Enable faster message delivery tracking
*/

-- Composite index for messages by thread (most common query)
CREATE INDEX IF NOT EXISTS idx_mail_messages_thread_created 
ON mail_messages(thread_id, created_at DESC);

-- Index for unread messages queries (for badge counts)
CREATE INDEX IF NOT EXISTS idx_mail_messages_unread 
ON mail_messages(thread_id, is_read) 
WHERE is_read = false;

-- Index for sender lookups in messages
CREATE INDEX IF NOT EXISTS idx_mail_messages_sender 
ON mail_messages(sender_id);

-- Improve thread lookup performance
CREATE INDEX IF NOT EXISTS idx_mail_threads_participants 
ON mail_threads(participant1_id, participant2_id);

-- Optimize typing indicator queries
CREATE INDEX IF NOT EXISTS idx_typing_indicators_active 
ON typing_indicators(thread_id, is_typing, updated_at)
WHERE is_typing = true;

COMMENT ON INDEX idx_mail_messages_thread_created IS 'Speeds up message loading by thread';
COMMENT ON INDEX idx_mail_messages_unread IS 'Speeds up unread message counts';
COMMENT ON INDEX idx_typing_indicators_active IS 'Speeds up active typing indicator lookups';
