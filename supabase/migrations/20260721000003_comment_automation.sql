-- Phase 3: Post Comment Automation tables

-- Per-post automation configuration
CREATE TABLE IF NOT EXISTS post_automations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID REFERENCES shops(id) ON DELETE CASCADE,
  post_id TEXT NOT NULL,
  post_platform TEXT NOT NULL DEFAULT 'facebook' CHECK (post_platform IN ('facebook', 'instagram')),
  post_preview_text TEXT,
  post_thumbnail_url TEXT,
  reply_as_comment BOOLEAN DEFAULT false,
  instructions TEXT,
  delete_negative BOOLEAN DEFAULT false,
  delete_examples JSONB DEFAULT '[]'::jsonb,
  send_as_messenger BOOLEAN DEFAULT false,
  product_ids UUID[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(shop_id, post_id)
);

ALTER TABLE post_automations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner can manage own post_automations" ON post_automations
  FOR ALL USING (user_owns_shop(shop_id));

-- Per-comment tracking (idempotency + dedup + private reply guard)
CREATE TABLE IF NOT EXISTS post_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID REFERENCES shops(id) ON DELETE CASCADE,
  post_id TEXT NOT NULL,
  comment_id TEXT NOT NULL UNIQUE,
  commenter_psid TEXT,
  comment_text TEXT NOT NULL,
  comment_text_normalized TEXT,
  reply_text TEXT,
  replied_at TIMESTAMPTZ,
  private_reply_sent BOOLEAN DEFAULT false,
  private_reply_sent_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE post_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner can manage own post_comments" ON post_comments
  FOR ALL USING (user_owns_shop(shop_id));

-- Dedup index: same normalized text on same post within time window
CREATE INDEX IF NOT EXISTS idx_post_comments_dedup
  ON post_comments(post_id, comment_text_normalized, created_at);

CREATE INDEX IF NOT EXISTS idx_post_comments_comment_id
  ON post_comments(comment_id);

CREATE INDEX IF NOT EXISTS idx_post_automations_shop_post
  ON post_automations(shop_id, post_id);
