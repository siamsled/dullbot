const { Client } = require('pg');

async function run() {
  const client = new Client({
    connectionString: 'postgresql://postgres.rgcnhwzuhdifwrglclme:ShahMdEliausKomol@aws-1-ap-northeast-2.pooler.supabase.com:5432/postgres',
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    await client.connect();
    console.log('Successfully connected to remote Supabase database on port 5432!');
    const res = await client.query('SELECT now()');
    console.log('Query result:', res.rows[0]);
  } catch (err) {
    console.error('Direct connection on 5432 failed:', err);
  } finally {
    await client.end();
  }
}

run();
