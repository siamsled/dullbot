ALTER TABLE shops ADD COLUMN IF NOT EXISTS allow_discounts BOOLEAN DEFAULT false;
ALTER TABLE shops ADD COLUMN IF NOT EXISTS escalation_severity TEXT DEFAULT 'serious_complaints';
ALTER TABLE shops ADD COLUMN IF NOT EXISTS handle_audio BOOLEAN DEFAULT true;
ALTER TABLE shops ADD COLUMN IF NOT EXISTS abusive_handling_mode TEXT DEFAULT 'polite';
ALTER TABLE shops ADD COLUMN IF NOT EXISTS abusive_block_threshold INTEGER DEFAULT 3;
ALTER TABLE shops ADD COLUMN IF NOT EXISTS high_value_order_threshold NUMERIC DEFAULT 0;
ALTER TABLE shops ADD COLUMN IF NOT EXISTS off_topic_tolerance TEXT DEFAULT 'strict';
