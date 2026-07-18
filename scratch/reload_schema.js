const { Client } = require('pg');

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
    console.log('Connected to database to reload schema...');
    await client.query("NOTIFY pgrst, 'reload schema';");
    console.log('Schema reload notification sent successfully!');
  } catch (err) {
    console.error('Failed to notify schema reload:', err);
  } finally {
    await client.end();
  }
}

run();
