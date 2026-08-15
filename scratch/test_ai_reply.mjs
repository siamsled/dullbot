import fs from 'fs';
import path from 'path';
import { GoogleGenerativeAI } from '@google/generative-ai';

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

async function testAiReply() {
  const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: 'gemini-3.1-flash-lite' });
  const result = await model.generateContent({
    systemInstruction: 'You are a helpful customer service assistant replying to a public comment on Facebook.',
    contents: [{ role: 'user', parts: [{ text: 'Comment from Dullbot Er Baap: "helo?"' }] }]
  });
  console.log('✅ AI Reply successfully generated:', result.response.text().trim());
}

testAiReply();
