const { Client } = require('pg');
const fs = require('fs');

async function run() {
  const client = new Client({
    connectionString: 'postgresql://postgres.rgcnhwzuhdifwrglclme:ShahMdEliausKomol@aws-1-ap-northeast-2.pooler.supabase.com:6543/postgres',
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    await client.connect();
    console.log('Successfully connected to remote Supabase database!');
    
    // Apply migration
    const sql = fs.readFileSync('/Users/shah/Documents/GitHub/dullbot/supabase/migrations/20260718000400_add_services_table.sql', 'utf8');
    await client.query(sql);
    console.log('Remote migration applied successfully!');
  } catch (err) {
    console.error('Remote connection/migration failed:', err);
  } finally {
    await client.end();
  }
}

run();
