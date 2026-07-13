import { GoogleGenerativeAI } from '@google/generative-ai';
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || 'MOCK_KEY');
async function run() {
  const model = genAI.getGenerativeModel({ model: 'gemini-3.5-flash' });
  try {
    const res = await model.generateContent("i wanna know if youre an ai");
    console.log("Success:", res.response.text());
  } catch (e) {
    console.log("Error caught:", e);
  }
}
run();
