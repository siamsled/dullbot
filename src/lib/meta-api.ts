/**
 * Service to interact with the Meta Graph API for sending messages
 * to Messenger, Instagram, and WhatsApp.
 */

export async function sendMetaMessage(recipientId: string, text: string) {
  const pageAccessToken = process.env.META_PAGE_ACCESS_TOKEN;
  
  if (!pageAccessToken) {
    console.error("META_PAGE_ACCESS_TOKEN is not configured.");
    return { success: false, error: "Missing Page Access Token" };
  }

  try {
    const response = await fetch(`https://graph.facebook.com/v19.0/me/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${pageAccessToken}`,
      },
      body: JSON.stringify({
        recipient: {
          id: recipientId
        },
        message: {
          text: text
        },
        messaging_type: "RESPONSE"
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Failed to send message via Meta API:", data);
      return { success: false, error: data.error?.message || "Unknown Meta API error" };
    }

    return { success: true, messageId: data.message_id };
  } catch (error) {
    console.error("Error connecting to Meta Graph API:", error);
    return { success: false, error: "Internal connection error" };
  }
}
