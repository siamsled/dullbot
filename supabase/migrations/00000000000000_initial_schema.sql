-- DullBot Initial Schema

-- Types (Enums)
CREATE TYPE confirmation_tier_enum AS ENUM ('light', 'otp_verified', 'prepay_verified');
CREATE TYPE gemini_key_mode_enum AS ENUM ('shared_pool', 'byo_key');
CREATE TYPE whatsapp_number_mode_enum AS ENUM ('shared', 'dedicated');
CREATE TYPE channel_enum AS ENUM ('whatsapp', 'messenger', 'instagram', 'mock');
CREATE TYPE conversation_status_enum AS ENUM ('bot_active', 'human_takeover', 'closed');
CREATE TYPE sender_enum AS ENUM ('customer', 'bot', 'human_agent');
CREATE TYPE order_status_enum AS ENUM ('pending_verification', 'confirmed', 'rejected', 'fulfilled');
CREATE TYPE verification_method_enum AS ENUM ('light', 'otp', 'prepay');
CREATE TYPE spam_outcome_enum AS ENUM ('not_delivered', 'refused', 'delivered_ok');

-- Tables

CREATE TABLE shops (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    confirmation_tier confirmation_tier_enum DEFAULT 'light',
    gemini_key_mode gemini_key_mode_enum DEFAULT 'shared_pool',
    gemini_byo_key_encrypted TEXT,
    bkash_number TEXT,
    whatsapp_number_mode whatsapp_number_mode_enum DEFAULT 'shared',
    agent_enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID REFERENCES shops(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    price NUMERIC NOT NULL,
    currency TEXT DEFAULT 'BDT',
    variant_group_id UUID,
    stock_quantity INT DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    image_url TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID REFERENCES shops(id) ON DELETE CASCADE,
    customer_phone TEXT NOT NULL,
    channel channel_enum NOT NULL,
    status conversation_status_enum DEFAULT 'bot_active',
    last_message_at TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
    sender sender_enum NOT NULL,
    content TEXT NOT NULL,
    gemini_call_made BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID REFERENCES shops(id) ON DELETE CASCADE,
    conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
    customer_name TEXT,
    customer_phone TEXT,
    customer_address TEXT,
    product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    status order_status_enum DEFAULT 'pending_verification',
    verification_method verification_method_enum,
    delivery_charge_amount NUMERIC,
    bkash_transaction_id TEXT,
    confirmed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE spam_registry (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone_number TEXT NOT NULL,
    shop_id UUID REFERENCES shops(id) ON DELETE CASCADE,
    outcome spam_outcome_enum NOT NULL,
    order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_spam_registry_phone ON spam_registry(phone_number);

CREATE TABLE quick_replies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID REFERENCES shops(id) ON DELETE CASCADE,
    trigger_pattern TEXT NOT NULL,
    response_text TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE response_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID REFERENCES shops(id) ON DELETE CASCADE,
    cache_key TEXT NOT NULL,
    response_text TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_response_cache_shop_key ON response_cache(shop_id, cache_key);

CREATE TABLE gemini_usage_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID REFERENCES shops(id) ON DELETE CASCADE,
    call_date DATE NOT NULL DEFAULT CURRENT_DATE,
    call_count INT DEFAULT 0,
    UNIQUE(shop_id, call_date)
);

-- Row Level Security (RLS)

ALTER TABLE shops ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE spam_registry ENABLE ROW LEVEL SECURITY;
ALTER TABLE quick_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE response_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE gemini_usage_log ENABLE ROW LEVEL SECURITY;

-- Policies for shops (Owner can read/update their own shop)
CREATE POLICY "Owner can read own shop" ON shops FOR SELECT USING (auth.uid() = owner_id);
CREATE POLICY "Owner can update own shop" ON shops FOR UPDATE USING (auth.uid() = owner_id);
CREATE POLICY "Owner can insert own shop" ON shops FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Owner can delete own shop" ON shops FOR DELETE USING (auth.uid() = owner_id);

-- Helper function to check if the current user owns a shop
CREATE OR REPLACE FUNCTION user_owns_shop(shop_id UUID) RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (SELECT 1 FROM shops WHERE id = shop_id AND owner_id = auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Policies for products
CREATE POLICY "Owner can manage own products" ON products FOR ALL USING (user_owns_shop(shop_id));

-- Policies for conversations
CREATE POLICY "Owner can manage own conversations" ON conversations FOR ALL USING (user_owns_shop(shop_id));

-- Policies for messages (Join through conversation to shop)
CREATE POLICY "Owner can manage own messages" ON messages FOR ALL USING (
    EXISTS (SELECT 1 FROM conversations c WHERE c.id = messages.conversation_id AND user_owns_shop(c.shop_id))
);

-- Policies for orders
CREATE POLICY "Owner can manage own orders" ON orders FOR ALL USING (user_owns_shop(shop_id));

-- Policies for spam_registry
CREATE POLICY "Owner can insert spam for own shop" ON spam_registry FOR INSERT WITH CHECK (user_owns_shop(shop_id));
CREATE POLICY "Owner can update own spam entries" ON spam_registry FOR UPDATE USING (user_owns_shop(shop_id));
CREATE POLICY "Owner can delete own spam entries" ON spam_registry FOR DELETE USING (user_owns_shop(shop_id));
-- Allow owners to read aggregate flags (we allow them to select all spam entries for now, or just limit to read-only the ones they own? Wait, spec: "can READ aggregate flags for any phone number ... but cannot read which other specific shop reported it".
-- To achieve this, we can allow SELECT on all rows but obfuscate shop_id, OR we just use a SECURITY DEFINER function to get aggregate counts, and restrict direct SELECT.
-- Let's restrict direct SELECT to own entries, and create a function for aggregate checks.
CREATE POLICY "Owner can select own spam entries" ON spam_registry FOR SELECT USING (user_owns_shop(shop_id));

CREATE OR REPLACE FUNCTION get_spam_count(check_phone TEXT) RETURNS INT AS $$
DECLARE
  spam_count INT;
BEGIN
  -- Anyone authenticated can check this (or even anonymous if needed for webhook, but let's say authenticated or service role)
  SELECT COUNT(*) INTO spam_count FROM spam_registry WHERE phone_number = check_phone;
  RETURN spam_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Policies for quick_replies
CREATE POLICY "Owner can manage own quick_replies" ON quick_replies FOR ALL USING (user_owns_shop(shop_id));

-- Policies for response_cache
CREATE POLICY "Owner can manage own response_cache" ON response_cache FOR ALL USING (user_owns_shop(shop_id));

-- Policies for gemini_usage_log
CREATE POLICY "Owner can manage own gemini_usage" ON gemini_usage_log FOR ALL USING (user_owns_shop(shop_id));
