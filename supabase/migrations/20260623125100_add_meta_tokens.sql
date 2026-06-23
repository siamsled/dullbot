-- Add columns for Meta Integration per-shop
ALTER TABLE shops ADD COLUMN meta_verify_token TEXT;
ALTER TABLE shops ADD COLUMN meta_page_access_token TEXT;
