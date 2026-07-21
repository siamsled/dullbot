-- Migration for Human Agent Tools
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS internal_notes TEXT;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS assigned_to_id UUID REFERENCES auth.users(id);
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS suggested_reply TEXT;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ;

-- Add conversation-level tags
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS conv_tags TEXT[] DEFAULT '{}';

-- Quick replies table already exists, but ensure it's shop-configurable
-- (Assuming it has shop_id, trigger_pattern, response_text)
