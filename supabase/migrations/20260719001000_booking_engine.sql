-- Migration: Extend services and create scheduling schema
ALTER TABLE services ADD COLUMN IF NOT EXISTS buffer_minutes INTEGER DEFAULT 0;
ALTER TABLE services ADD COLUMN IF NOT EXISTS requires_resource_type TEXT DEFAULT 'staff';

-- Bookable resources (staff, tables, rooms)
CREATE TABLE IF NOT EXISTS resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  resource_type TEXT NOT NULL DEFAULT 'staff',
  capacity INTEGER DEFAULT 1,
  active BOOLEAN DEFAULT true
);

-- Weekly availability rules (0-6, Sunday=0)
CREATE TABLE IF NOT EXISTS availability_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_id UUID NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL
);

-- One-off availability exceptions
CREATE TABLE IF NOT EXISTS availability_exceptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_id UUID NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  is_available BOOLEAN NOT NULL,
  start_time TIME,
  end_time TIME
);

-- Bookings table
CREATE TABLE IF NOT EXISTS bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  resource_id UUID NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  customer_phone TEXT NOT NULL,
  customer_name TEXT,
  party_size INTEGER DEFAULT 1,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed','cancelled','completed','no_show')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE availability_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE availability_exceptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

-- Scoped owner policies
DROP POLICY IF EXISTS "Manage resources" ON resources;
CREATE POLICY "Manage resources" ON resources
  FOR ALL TO authenticated
  USING (shop_id IN (SELECT id FROM shops WHERE owner_id = auth.uid()));

DROP POLICY IF EXISTS "Manage availability_rules" ON availability_rules;
CREATE POLICY "Manage availability_rules" ON availability_rules
  FOR ALL TO authenticated
  USING (resource_id IN (SELECT id FROM resources WHERE shop_id IN (SELECT id FROM shops WHERE owner_id = auth.uid())));

DROP POLICY IF EXISTS "Manage availability_exceptions" ON availability_exceptions;
CREATE POLICY "Manage availability_exceptions" ON availability_exceptions
  FOR ALL TO authenticated
  USING (resource_id IN (SELECT id FROM resources WHERE shop_id IN (SELECT id FROM shops WHERE owner_id = auth.uid())));

DROP POLICY IF EXISTS "Manage bookings" ON bookings;
CREATE POLICY "Manage bookings" ON bookings
  FOR ALL TO authenticated
  USING (shop_id IN (SELECT id FROM shops WHERE owner_id = auth.uid()));

-- Enable overlapping bookings check at postgres level
CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE bookings DROP CONSTRAINT IF EXISTS no_overlapping_bookings;
ALTER TABLE bookings ADD CONSTRAINT no_overlapping_bookings
  EXCLUDE USING gist (
    resource_id WITH =,
    tstzrange(starts_at, ends_at) WITH &&
  ) WHERE (status = 'confirmed');
