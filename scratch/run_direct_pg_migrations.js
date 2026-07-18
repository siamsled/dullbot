const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function run() {
  const client = new Client({
    host: 'aws-1-ap-northeast-2.pooler.supabase.com',
    port: 6543,
    user: 'postgres.rgcnhwzuhdifwrglclme',
    password: 'ShahMdEliausKomol',
    database: 'postgres',
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    await client.connect();
    console.log('Successfully connected directly to remote Supabase pooler!');
    
    const migrations = [
      '20260718000500_add_widget_enabled.sql',
      '20260718000600_analytics_columns.sql'
    ];

    for (const m of migrations) {
      const file = path.join('/Users/shah/Documents/GitHub/dullbot/supabase/migrations', m);
      console.log(`Reading migration: ${file}`);
      const sql = fs.readFileSync(file, 'utf8');
      
      console.log(`Executing migration on remote DB...`);
      await client.query(sql);
      console.log(`Migration ${m} completed successfully!`);
    }
  } catch (err) {
    console.error('Remote migration execution failed:', err);
  } finally {
    await client.end();
  }
}

run();
