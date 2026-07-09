import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function run() {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-3.5-flash" });
    const result = await model.generateContent("hello");
    console.log("Success:", result.response.text());
  } catch (e) {
    console.error("Failed:", e);
  }
}

run();
