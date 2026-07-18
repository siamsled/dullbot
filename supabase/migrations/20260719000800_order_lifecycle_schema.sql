-- 1. Alter Orders Table to support payment audits, review flags, courier tracking, and notes
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_method TEXT; -- 'merchant_api' | 'android_notification' | 'manual'
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_verified_at TIMESTAMPTZ;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_transaction_ref TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS needs_review BOOLEAN DEFAULT false;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS review_reason TEXT; -- 'high_value' | 'payment_mismatch' | null
ALTER TABLE orders ADD COLUMN IF NOT EXISTS courier_provider TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS courier_tracking_id TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS fulfillment_status TEXT DEFAULT 'awaiting_dispatch'; -- 'awaiting_dispatch' | 'dispatched' | 'in_transit' | 'delivered' | 'cancelled'
ALTER TABLE orders ADD COLUMN IF NOT EXISTS internal_note TEXT;

-- 2. Create Status History Audit Trail
CREATE TABLE IF NOT EXISTS order_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  note TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS for order_status_history
ALTER TABLE order_status_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Owner can manage own status history" ON order_status_history;
CREATE POLICY "Owner can manage own status history" ON order_status_history
  FOR ALL USING (
    EXISTS (SELECT 1 FROM orders o WHERE o.id = order_id AND (o.shop_id IN (SELECT id FROM shops WHERE owner_id = auth.uid())))
  );

-- 3. Create Multi-Line Items Table
CREATE TABLE IF NOT EXISTS order_line_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price NUMERIC NOT NULL
);

-- Enable RLS for order_line_items
ALTER TABLE order_line_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Owner can manage own line items" ON order_line_items;
CREATE POLICY "Owner can manage own line items" ON order_line_items
  FOR ALL USING (
    EXISTS (SELECT 1 FROM orders o WHERE o.id = order_id AND (o.shop_id IN (SELECT id FROM shops WHERE owner_id = auth.uid())))
  );

-- 4. Migrate Existing Orders to order_line_items
INSERT INTO order_line_items (order_id, product_id, product_name, quantity, unit_price)
SELECT 
  o.id AS order_id,
  o.product_id AS product_id,
  COALESCE(p.name, 'Unknown Product') AS product_name,
  1 AS quantity,
  COALESCE(o.total_amount - COALESCE(o.delivery_charge_amount, 0), p.price, 0) AS unit_price
FROM orders o
LEFT JOIN products p ON p.id = o.product_id
WHERE o.product_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM order_line_items li WHERE li.order_id = o.id
  );

-- 5. Enable Realtime Replication
ALTER PUBLICATION supabase_realtime ADD TABLE order_status_history;
ALTER PUBLICATION supabase_realtime ADD TABLE order_line_items;
