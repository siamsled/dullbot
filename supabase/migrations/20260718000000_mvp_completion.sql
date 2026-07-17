-- MVP Completion Migration

-- Create payment_verifications table
CREATE TABLE IF NOT EXISTS payment_verifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    method TEXT NOT NULL CHECK (method IN ('merchant_api', 'notification_app')),
    expected_amount NUMERIC NOT NULL,
    matched_reference TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'mismatch', 'failed')),
    customer_provided_ref TEXT,
    confirmed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on payment_verifications
ALTER TABLE payment_verifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner can manage own payment_verifications" ON payment_verifications
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM orders o 
            WHERE o.id = payment_verifications.order_id 
            AND user_owns_shop(o.shop_id)
        )
    );

-- Create audit_logs table
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    target_shop_id UUID REFERENCES shops(id) ON DELETE CASCADE,
    target_conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on audit_logs
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can view own audit logs" ON audit_logs
    FOR SELECT USING (user_owns_shop(target_shop_id));

-- Add columns to shops table
ALTER TABLE shops ADD COLUMN IF NOT EXISTS payment_verification_method TEXT DEFAULT 'none' CHECK (payment_verification_method IN ('none', 'merchant_api', 'notification_app'));
ALTER TABLE shops ADD COLUMN IF NOT EXISTS bkash_config_encrypted TEXT;
ALTER TABLE shops ADD COLUMN IF NOT EXISTS nagad_config_encrypted TEXT;
ALTER TABLE shops ADD COLUMN IF NOT EXISTS courier_provider TEXT;
ALTER TABLE shops ADD COLUMN IF NOT EXISTS courier_config_encrypted TEXT;

-- Add columns to orders table
ALTER TABLE orders ADD COLUMN IF NOT EXISTS courier_tracking_id TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS courier_ref TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS courier_status TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS courier_status_updated_at TIMESTAMPTZ;
