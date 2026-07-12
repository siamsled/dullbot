import { GoogleGenerativeAI } from '@google/generative-ai';

async function run() {
  try {
    const models = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GEMINI_API_KEY}`);
    const data = await models.json();
    console.log(data.models.map(m => m.name).join('\n'));
  } catch (e) {
    console.error("error:", e);
  }
}
run();
