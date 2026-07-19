-- Create performance indexes for faster dashboard queries and instant tab/sidebar transitions
CREATE INDEX IF NOT EXISTS idx_conversations_shop_last_message ON conversations(shop_id, last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_shop_created_at ON orders(shop_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payment_verifications_status ON payment_verifications(status);
CREATE INDEX IF NOT EXISTS idx_bookings_shop_starts_at ON bookings(shop_id, starts_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_products_shop_active ON products(shop_id, is_active, draft);
