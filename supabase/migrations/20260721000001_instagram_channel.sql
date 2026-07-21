-- Phase 1: Instagram DM support
ALTER TABLE shops ADD COLUMN IF NOT EXISTS meta_instagram_user_id TEXT;
ALTER TABLE shops ADD COLUMN IF NOT EXISTS meta_instagram_access_token TEXT;

-- Index conversations by channel for analytics queries
CREATE INDEX IF NOT EXISTS idx_conversations_channel ON conversations(channel);
CREATE INDEX IF NOT EXISTS idx_conversations_shop_channel ON conversations(shop_id, channel);
