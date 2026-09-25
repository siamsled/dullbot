import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

// We need pg to run raw SQL
const { Client } = require('pg');

async function run() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });
  try {
    await client.connect();
    await client.query(`
      ALTER TABLE "public"."products"
      ADD COLUMN IF NOT EXISTS "min_acceptable_price" numeric NULL,
      ADD COLUMN IF NOT EXISTS "allow_ai_negotiation" boolean NOT NULL DEFAULT false;
    `);
    console.log("Success");
  } catch (e) {
    console.error(e);
  } finally {
    await client.end();
  }
}
run();
