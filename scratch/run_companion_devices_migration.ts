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
CREATE TABLE IF NOT EXISTS companion_devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    device_name TEXT NOT NULL DEFAULT 'Android Companion',
    device_secret TEXT UNIQUE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_seen_at TIMESTAMPTZ,
    is_active BOOLEAN NOT NULL DEFAULT true
);

CREATE INDEX IF NOT EXISTS idx_companion_devices_secret ON companion_devices(device_secret);
CREATE INDEX IF NOT EXISTS idx_companion_devices_shop ON companion_devices(shop_id);
`;

async function run() {
  console.log("Running companion_devices DB migration via exec_sql...");
  const { data, error } = await supabaseAdmin.rpc('exec_sql', { sql: migrationSql });
  if (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  } else {
    console.log("Migration executed successfully!");
    process.exit(0);
  }
}

run();
