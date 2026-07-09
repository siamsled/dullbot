import { createClient } from '@supabase/supabase-js';

async function testMockEndpoint() {
  try {
    const res = await fetch("http://localhost:3001/api/channels/mock", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        shop_slug: "test-shop",
        customer_phone: "12345678",
        text: "do you have the leather jacket?"
      })
    });
    const data = await res.json();
    console.log("Mock Response:", data);
  } catch (error) {
    console.error("Test failed:", error);
  }
}

testMockEndpoint();
