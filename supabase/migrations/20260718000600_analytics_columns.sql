-- Analytics: district, channel attribution, and order total
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_district TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS total_amount NUMERIC;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS channel TEXT DEFAULT 'facebook';
