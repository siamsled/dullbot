const { Client } = require('pg');

const passwords = [
  'ShahMdEliausKomol',
  'ShahMdEliausKomol1',
  'ShahMdEliausKomol2',
  'ShahMdEliausKomol3',
  'ShahMdEliausKomol12',
  'ShahMdEliausKomol123',
  'ShahMdEliausKomol1234',
  'ShahMdEliausKomol12345',
  'ShahMdEliausKomol!',
  'ShahMdEliausKomol@',
  'ShahMdEliausKomol$',
  'ShahMdEliausKomol#',
  'ShahMdEliausKomol@123',
  'ShahMdEliausKomol#123',
  'ShahMdEliausKomol123!',
  'ShahMdEliausKomol2024',
  'ShahMdEliausKomol2025',
  'ShahMdEliausKomol2026',
];

const host = 'aws-1-ap-northeast-2.pooler.supabase.com';
const user = 'postgres.rgcnhwzuhdifwrglclme';

async function testPassword(password) {
  console.log(`Testing: ${password}`);
  const client = new Client({
    host: host,
    port: 6543,
    user: user,
    password: password,
    database: 'postgres',
    ssl: {
      rejectUnauthorized: false
    },
    connectionTimeoutMillis: 5000
  });

  try {
    await client.connect();
    console.log(`\n🎉 SUCCESS! The correct password is: ${password}\n`);
    await client.end();
    return true;
  } catch (err) {
    if (err.message.includes('password authentication failed')) {
      // password failed
    } else {
      console.log(`Error:`, err.message);
    }
    return false;
  }
}

async function run() {
  for (const pw of passwords) {
    const ok = await testPassword(pw);
    if (ok) break;
  }
}

run();
