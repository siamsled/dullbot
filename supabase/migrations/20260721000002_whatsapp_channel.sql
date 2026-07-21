-- Phase 2: WhatsApp Cloud API columns

-- Per-shop WhatsApp Business Account config
ALTER TABLE shops ADD COLUMN IF NOT EXISTS whatsapp_business_account_id TEXT;
ALTER TABLE shops ADD COLUMN IF NOT EXISTS whatsapp_phone_number_id TEXT;
ALTER TABLE shops ADD COLUMN IF NOT EXISTS whatsapp_access_token TEXT;

-- Per-conversation: track WhatsApp 24-hour session window expiry
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS whatsapp_session_expires_at TIMESTAMPTZ;

-- Index for session expiry lookups
CREATE INDEX IF NOT EXISTS idx_conversations_wa_session ON conversations(id, whatsapp_session_expires_at)
  WHERE channel = 'whatsapp';
