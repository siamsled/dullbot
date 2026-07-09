import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const modelsToTest = [
  "gemini-1.5-flash",
  "gemini-1.5-pro",
  "gemini-pro-latest",
  "gemini-2.5-pro",
  "gemini-3-flash-preview",
  "gemini-3-pro-preview",
  "gemini-3.1-flash-lite"
];

async function run() {
  for (const modelName of modelsToTest) {
    try {
      console.log(`Testing model: ${modelName}`);
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent("hello");
      console.log(`  -> SUCCESS! Response:`, result.response.text().trim());
    } catch (e) {
      console.log(`  -> FAILED: ${e.message.split('\n')[0]}`);
    }
  }
}

run();
