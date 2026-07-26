-- Onboarding v2: strict gate, 3 business types, channel-first flow
-- =================================================================

-- 1. Onboarding step tracking (replaces onboarding_steps_done[] logic as the gate signal)
ALTER TABLE shops ADD COLUMN IF NOT EXISTS onboarding_step TEXT DEFAULT 'business_type';
  -- values: 'business_type' | 'channels' | 'context' | 'type_specific' | 'payments' | 'delivery' | 'demo' | 'complete'
ALTER TABLE shops ADD COLUMN IF NOT EXISTS onboarding_step_updated_at TIMESTAMPTZ DEFAULT now();

-- 2. Retail / Wholesale type-specific columns
ALTER TABLE shops ADD COLUMN IF NOT EXISTS bulk_pricing_enabled BOOLEAN DEFAULT false;
ALTER TABLE shops ADD COLUMN IF NOT EXISTS bulk_pricing_note TEXT;

-- 3. Restaurant-specific fields (separate from delivery_areas)
ALTER TABLE shops ADD COLUMN IF NOT EXISTS location_address TEXT;
ALTER TABLE shops ADD COLUMN IF NOT EXISTS location_map_link TEXT;

-- 4. Instagram channel columns
--    (meta_instagram_user_id + meta_instagram_access_token already exist from 20260721000001)
--    Adding named columns for the new onboarding flow (different grant path)
ALTER TABLE shops ADD COLUMN IF NOT EXISTS instagram_business_id TEXT;
ALTER TABLE shops ADD COLUMN IF NOT EXISTS instagram_access_token TEXT;

-- 5. Migrate business_type: wholesale → retail
-- !! IMPORTANT: confirm before running against production that no existing
-- !! wholesale shops require bulk_pricing_enabled = true retroactively.
-- !! Run: SELECT name, slug FROM shops WHERE business_type = 'wholesale';
UPDATE shops SET business_type = 'retail' WHERE business_type = 'wholesale';

-- 6. Backfill onboarding_step = 'complete' for all shops that completed the OLD flow
--    so existing onboarded users are not locked out by the new gate.
UPDATE shops
SET
  onboarding_step = 'complete',
  onboarding_step_updated_at = now()
WHERE
  onboarding_complete = true
  OR (onboarding_steps_done @> ARRAY['context_form']::text[]);
