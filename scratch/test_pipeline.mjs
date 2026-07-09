import { processIncomingMessage } from '../src/lib/chat-pipeline.js';

async function run() {
  try {
    const result = await processIncomingMessage(
      "test-shop",
      "test-phone",
      "what sizes do you have for the leather jacket?"
    );
    console.log("Pipeline result:", result);
  } catch (error) {
    console.error("Pipeline error:", error);
  }
}

run();
