-- Add columns to conversations
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS is_test BOOLEAN DEFAULT false;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS meta_name TEXT;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS meta_profile_pic TEXT;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS meta_checked_at TIMESTAMPTZ;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS handoff_summary JSONB;

-- Mark conversations starting with TEST_ or test_ as test data
UPDATE conversations 
SET is_test = true 
WHERE customer_phone LIKE 'TEST_%' 
   OR customer_phone LIKE 'test_%'
   OR customer_phone LIKE 'test-sender-%';

-- Delete test data
DELETE FROM conversations WHERE is_test = true;

-- Enable Realtime for conversations, messages and orders if not already done
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE messages;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'conversations'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE conversations;
  END IF;
END $$;
