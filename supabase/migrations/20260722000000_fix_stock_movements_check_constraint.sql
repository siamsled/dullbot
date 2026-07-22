-- Fix check constraint on stock_movements to include 'audit' (inserted by log_product_audit trigger)
ALTER TABLE stock_movements DROP CONSTRAINT IF EXISTS stock_movements_change_type_check;
ALTER TABLE stock_movements ADD CONSTRAINT stock_movements_change_type_check 
  CHECK (change_type IN ('order', 'manual_adjust', 'restock', 'import', 'initial_stock', 'audit'));
