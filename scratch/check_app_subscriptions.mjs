import fs from 'fs';
import path from 'path';

const envFile = fs.readFileSync(path.resolve(process.cwd(), '.env.local'), 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    const key = match[1].trim();
    let val = match[2].trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) val = val.slice(1, -1);
    env[key] = val;
  }
});

const appId = env.NEXT_PUBLIC_FACEBOOK_APP_ID || env.FACEBOOK_APP_ID;
const appSecret = env.FACEBOOK_APP_SECRET;
const appToken = `${appId}|${appSecret}`;

async function checkAppSubscriptions() {
  console.log('--- App Subscriptions for App ID:', appId, '---');
  const res = await fetch(`https://graph.facebook.com/v19.0/${appId}/subscriptions?access_token=${appToken}`);
  const data = await res.json();
  console.log(JSON.stringify(data, null, 2));
}

checkAppSubscriptions();
