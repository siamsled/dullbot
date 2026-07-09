import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function run() {
  try {
    const list = await genAI.getGenerativeModel({ model: "gemini-2.0-flash" }).listModels?.() || [];
    console.log(list);
  } catch (err) {
    console.error("Error listing models directly:", err);
  }
}
run();
