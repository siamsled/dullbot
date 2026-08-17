-- Add meta_page_id and meta_page_name to conversations for multi-page routing
ALTER TABLE conversations 
  ADD COLUMN IF NOT EXISTS meta_page_id text,
  ADD COLUMN IF NOT EXISTS meta_page_name text;

CREATE INDEX IF NOT EXISTS idx_conversations_meta_page_id ON conversations(meta_page_id);
