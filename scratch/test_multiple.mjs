import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const modelsToTest = [
  "gemini-2.5-flash",
  "gemini-3.5-flash",
  "gemini-2.0-flash",
  "gemini-2.0-flash-lite",
  "gemini-flash-latest",
  "gemini-2.5-flash-lite"
];

async function run() {
  for (const modelName of modelsToTest) {
    try {
      console.log(`Testing model: ${modelName}`);
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent("hello");
      console.log(`  -> SUCCESS! Response:`, result.response.text().trim());
      break;
    } catch (e) {
      console.log(`  -> FAILED: ${e.message.split('\n')[0]}`);
    }
  }
}

run();
