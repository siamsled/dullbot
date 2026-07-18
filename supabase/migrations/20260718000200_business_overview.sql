-- Migration: Add business overview to shops
ALTER TABLE shops ADD COLUMN IF NOT EXISTS business_overview TEXT;
