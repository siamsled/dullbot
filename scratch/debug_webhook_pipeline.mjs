// Test: Simulate what a Facebook comment webhook payload looks like
// and POST it to the local webhook endpoint to verify it works end-to-end

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

// 1. Check which App ID is registered in the Meta Developer portal
console.log('=== App Config ===');
console.log('App ID:', env.NEXT_PUBLIC_FACEBOOK_APP_ID || env.FACEBOOK_APP_ID);
console.log('Webhook URL would be:', `${env.NEXT_PUBLIC_APP_URL || 'https://dullbot.vercel.app'}/api/webhooks/messenger`);
console.log('Verify token:', env.META_GLOBAL_VERIFY_TOKEN ? '[SET]' : '[MISSING]');

// 2. Check if META_GLOBAL_VERIFY_TOKEN is set
if (!env.META_GLOBAL_VERIFY_TOKEN) {
  console.error('\n❌ META_GLOBAL_VERIFY_TOKEN is not set in .env.local! This would cause webhook verification to fail.');
}

// 3. Try to hit the app's webhook endpoint (verification test)
const appUrl = env.NEXT_PUBLIC_APP_URL || 'https://dullbot.vercel.app';
const webhookUrl = `${appUrl}/api/webhooks/messenger?hub.mode=subscribe&hub.verify_token=${env.META_GLOBAL_VERIFY_TOKEN}&hub.challenge=test_challenge_123`;
console.log('\n=== Testing Webhook Endpoint ===');
console.log('GET:', webhookUrl);
try {
  const res = await fetch(webhookUrl);
  const text = await res.text();
  console.log('Status:', res.status);
  console.log('Response:', text);
  if (text === 'test_challenge_123') {
    console.log('✅ Webhook verification works correctly!');
  } else {
    console.log('❌ Webhook verification returned unexpected response');
  }
} catch (err) {
  console.error('Error hitting webhook:', err.message);
}

// 4. Test posting a simulated Facebook comment event
const fakeCommentPayload = {
  object: 'page',
  entry: [{
    id: '1226805843855270', // Dullbot2.0 page
    changes: [{
      field: 'feed',
      value: {
        item: 'comment',
        verb: 'add',
        comment_id: 'TEST_COMMENT_' + Date.now(),
        post_id: '1226805843855270_122127879820791880', // try to match an existing post
        from: { id: '123456789', name: 'Test User' },
        message: 'This is a test comment to verify webhook pipeline',
        created_time: Math.floor(Date.now() / 1000)
      }
    }]
  }]
};

console.log('\n=== Simulating Comment Webhook Event ===');
try {
  const postRes = await fetch(`${appUrl}/api/webhooks/messenger`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(fakeCommentPayload)
  });
  console.log('POST Status:', postRes.status);
  const postText = await postRes.text();
  console.log('POST Response:', postText.slice(0, 500));
} catch (err) {
  console.error('Error simulating webhook:', err.message);
}
