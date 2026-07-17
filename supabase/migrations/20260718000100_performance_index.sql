-- Add business_type to shops
ALTER TABLE shops ADD COLUMN IF NOT EXISTS business_type TEXT DEFAULT 'retail';

-- Create performance index for conversation messages pagination
CREATE INDEX IF NOT EXISTS idx_messages_conversation_created_at ON messages(conversation_id, created_at DESC);
