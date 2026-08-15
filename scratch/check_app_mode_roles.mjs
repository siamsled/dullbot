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

async function checkApp() {
  // 1. Get App details
  const appRes = await fetch(`https://graph.facebook.com/v19.0/${appId}?fields=id,name,link,app_type,category&access_token=${appToken}`);
  const appData = await appRes.json();
  console.log('App Data:', appData);

  // 2. Check Roles / Roles in App
  const rolesRes = await fetch(`https://graph.facebook.com/v19.0/${appId}/roles?access_token=${appToken}`);
  const rolesData = await rolesRes.json();
  console.log('App Roles (Admins, Developers, Testers):', JSON.stringify(rolesData, null, 2));

  // 3. Test sending a test webhook from Meta for the feed field!
  console.log('\n--- Attempting to trigger Meta Webhook Test Ping for page/feed ---');
  // Meta has an endpoint to test subscriptions: POST /{app_id}/subscriptions (or via developer portal)
}

checkApp();
