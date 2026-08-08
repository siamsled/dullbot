-- ============================================================
-- Bulletproof Webhook Routing Migration
-- Prevents Instagram DM routing failures for all customers
-- ============================================================

-- 1. Clean up the existing duplicate:
--    The Dullbot page (1246008781920134) exists in two rows —
--    one for shop 84ca459f (no IG, stale) and one for shop 2e2d42b7 (has IG, correct).
--    Remove the stale row so the UNIQUE constraint can be added.
DELETE FROM shop_meta_pages
WHERE meta_page_id = '1246008781920134'
  AND instagram_business_id IS NULL
  AND shop_id = '84ca459f-b9e3-455d-ab6f-fdb5395c5096';

-- 2. Add UNIQUE constraint: a Facebook Page can only belong to ONE shop.
--    If the same page is re-connected via OAuth, it will update (upsert) rather
--    than create a duplicate that breaks maybeSingle() and webhook routing.
ALTER TABLE shop_meta_pages
  DROP CONSTRAINT IF EXISTS uq_shop_meta_pages_page_id;

ALTER TABLE shop_meta_pages
  ADD CONSTRAINT uq_shop_meta_pages_page_id UNIQUE (meta_page_id);

-- 3. Fast lookup index for Instagram webhook routing (entry.id = instagram_business_id)
CREATE INDEX IF NOT EXISTS idx_smp_instagram_business_id
  ON shop_meta_pages (instagram_business_id)
  WHERE instagram_business_id IS NOT NULL;

-- 4. Fast lookup index for primary page per shop
CREATE INDEX IF NOT EXISTS idx_smp_shop_primary
  ON shop_meta_pages (shop_id)
  WHERE is_primary = true;

-- 5. Dead-letter table: stores any webhook payloads that couldn't be routed
--    to a shop. Zero-message drops become visible instead of silent.
CREATE TABLE IF NOT EXISTS webhook_dead_letters (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  object      TEXT,
  page_id     TEXT,
  channel     TEXT,
  raw_payload JSONB,
  error_reason TEXT
);

CREATE INDEX IF NOT EXISTS idx_wdl_received_at
  ON webhook_dead_letters (received_at DESC);

-- Allow service role to insert
ALTER TABLE webhook_dead_letters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all" ON webhook_dead_letters
  FOR ALL TO service_role USING (true) WITH CHECK (true);
