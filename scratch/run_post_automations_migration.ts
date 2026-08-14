import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

const envPath = path.resolve(__dirname, '../.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env: Record<string, string> = {};

envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    let value = match[2] ? match[2].trim() : '';
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
    env[match[1]] = value;
  }
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

const migrationSql = `
CREATE TABLE IF NOT EXISTS post_automations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    post_id TEXT NOT NULL,
    post_platform TEXT NOT NULL DEFAULT 'facebook',
    post_preview_text TEXT DEFAULT '',
    post_thumbnail_url TEXT,
    reply_as_comment BOOLEAN NOT NULL DEFAULT true,
    send_as_messenger BOOLEAN NOT NULL DEFAULT true,
    delete_negative BOOLEAN NOT NULL DEFAULT false,
    instructions TEXT DEFAULT '',
    delete_examples JSONB DEFAULT '[]'::jsonb,
    product_ids JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (shop_id, post_id)
);

CREATE INDEX IF NOT EXISTS idx_post_automations_shop_post ON post_automations(shop_id, post_id);

CREATE TABLE IF NOT EXISTS post_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    post_id TEXT NOT NULL,
    comment_id TEXT UNIQUE NOT NULL,
    sender_id TEXT,
    sender_name TEXT,
    comment_text TEXT,
    reply_text TEXT,
    is_negative BOOLEAN DEFAULT false,
    is_deleted BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_post_comments_shop_post ON post_comments(shop_id, post_id);
CREATE INDEX IF NOT EXISTS idx_post_comments_comment_id ON post_comments(comment_id);
`;

async function run() {
  console.log("Running post_automations & post_comments migration...");
  const { data, error } = await supabaseAdmin.rpc('exec_sql', { sql: migrationSql });
  if (error) {
    console.error("Migration error via rpc:", error);
    process.exit(1);
  } else {
    console.log("Migration executed successfully!");
    process.exit(0);
  }
}

run();
