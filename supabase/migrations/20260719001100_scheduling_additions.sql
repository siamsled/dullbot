-- Migration: Add scheduling additions (reminders, deposit bookings, waitlist queue)

-- 1. Phase A: Add reminder tracking columns to bookings
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS reminder_sent_at TIMESTAMPTZ;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS followup_sent_at TIMESTAMPTZ;

-- 2. Phase B: Add deposit config to services and shops
ALTER TABLE services ADD COLUMN IF NOT EXISTS deposit_required BOOLEAN DEFAULT false;
ALTER TABLE services ADD COLUMN IF NOT EXISTS deposit_amount NUMERIC DEFAULT 0;

ALTER TABLE shops ADD COLUMN IF NOT EXISTS deposit_refund_policy TEXT DEFAULT 'refundable_24h'
  CHECK (deposit_refund_policy IN ('refundable_24h', 'non_refundable', 'refundable_anytime'));

-- Add columns to bookings for deposit status and conversation matching
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS deposit_status TEXT DEFAULT 'not_required'
  CHECK (deposit_status IN ('not_required', 'pending', 'verified', 'refunded', 'forfeited'));

ALTER TABLE bookings ADD COLUMN IF NOT EXISTS conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL;

-- 3. Extend payment_verifications to map bookings
ALTER TABLE payment_verifications ADD COLUMN IF NOT EXISTS booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE;

-- Relax foreign key check so order_id is nullable (either order_id or booking_id is set)
ALTER TABLE payment_verifications ALTER COLUMN order_id DROP NOT NULL;

-- Update RLS policy on payment_verifications to support both order and booking associations
DROP POLICY IF EXISTS "Owner can manage own payment_verifications" ON payment_verifications;
CREATE POLICY "Owner can manage own payment_verifications" ON payment_verifications
  FOR ALL TO authenticated
  USING (
    (order_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM orders o WHERE o.id = payment_verifications.order_id AND o.shop_id IN (SELECT id FROM shops WHERE owner_id = auth.uid())
    )) OR
    (booking_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM bookings b WHERE b.id = payment_verifications.booking_id AND b.shop_id IN (SELECT id FROM shops WHERE owner_id = auth.uid())
    ))
  );

-- 4. Phase C: Create serial_queue waitlist table
CREATE TABLE IF NOT EXISTS serial_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  resource_id UUID REFERENCES resources(id) ON DELETE CASCADE,
  serial_number INTEGER NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_name TEXT,
  status TEXT NOT NULL DEFAULT 'waiting' 
    CHECK (status IN ('waiting', 'being_served', 'completed', 'skipped')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  called_at TIMESTAMPTZ
);

-- Enable RLS on serial_queue
ALTER TABLE serial_queue ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Manage serial_queue" ON serial_queue;
CREATE POLICY "Manage serial_queue" ON serial_queue
  FOR ALL TO authenticated
  USING (shop_id IN (SELECT id FROM shops WHERE owner_id = auth.uid()));

-- 5. Create booking_status_history audit trail table
CREATE TABLE IF NOT EXISTS booking_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on booking_status_history
ALTER TABLE booking_status_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Manage booking_status_history" ON booking_status_history;
CREATE POLICY "Manage booking_status_history" ON booking_status_history
  FOR ALL TO authenticated
  USING (booking_id IN (SELECT id FROM bookings WHERE shop_id IN (SELECT id FROM shops WHERE owner_id = auth.uid())));
