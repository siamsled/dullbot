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

const appUrl = 'https://dullbot.vercel.app';

async function simulateRealComment() {
  const payload = {
    object: 'page',
    entry: [
      {
        id: '1246008781920134', // Dullbot page ID
        time: Math.floor(Date.now() / 1000),
        changes: [
          {
            field: 'feed',
            value: {
              from: {
                id: '998877665544',
                name: 'Dullbot Er Baap'
              },
              item: 'comment',
              comment_id: '122117368719382466_' + Date.now(),
              post_id: '1246008781920134_122117368719382466',
              verb: 'add',
              created_time: Math.floor(Date.now() / 1000),
              message: 'helo?'
            }
          }
        ]
      }
    ]
  };

  console.log('Sending realistic comment webhook payload to:', `${appUrl}/api/webhooks/messenger`);
  const res = await fetch(`${appUrl}/api/webhooks/messenger`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  console.log('Response status:', res.status);
  const text = await res.text();
  console.log('Response body:', text);
}

simulateRealComment();
