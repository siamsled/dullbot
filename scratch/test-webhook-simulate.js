require('./load-env.js');
const { processIncomingMessage } = require('../src/lib/chat-pipeline');

async function run() {
  console.log("Simulating incoming message...");
  const result = await processIncomingMessage('dull-store', '27695249016829924', 'accha kobe nagad new products ashte pare?');
  console.log("Result:", result);
}

run();
