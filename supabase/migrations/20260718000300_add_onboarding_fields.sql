-- Migration: Add missing onboarding columns to shops
ALTER TABLE shops ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE shops ADD COLUMN IF NOT EXISTS operating_hours TEXT;
ALTER TABLE shops ADD COLUMN IF NOT EXISTS delivery_areas TEXT;
