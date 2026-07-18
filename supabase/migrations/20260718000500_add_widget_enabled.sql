-- Migration: Add website widget toggle to shops
ALTER TABLE shops ADD COLUMN IF NOT EXISTS widget_enabled BOOLEAN DEFAULT false;
