-- Add summary column to conversations table to support compressing long histories
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS summary TEXT;

-- Add is_summarized column to messages table to know which messages have been compressed
ALTER TABLE messages ADD COLUMN IF NOT EXISTS is_summarized BOOLEAN DEFAULT false;
