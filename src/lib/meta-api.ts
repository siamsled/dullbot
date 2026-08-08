import { supabaseAdmin } from './supabase-admin';

/**
 * Unified Meta Graph API service for Messenger, Instagram DM, and WhatsApp.
 */

/**
 * Subscribe a Facebook Page to Meta App Webhooks for Messenger & Instagram DMs.
 */
export async function subscribePageToWebhooks(pageId: string, pageAccessToken: string) {
  try {
    const res = await fetch(
      `https://graph.facebook.com/v19.0/${pageId}/subscribed_apps?subscribed_fields=messages,messaging_postbacks,message_deliveries,message_reads,feed&access_token=${pageAccessToken}`,
      { method: 'POST' }
    );
    const data = await res.json();
    console.log(`[Meta Webhook Sub] Page ${pageId} response:`, data);
    return { success: res.ok, data };
  } catch (e: any) {
    console.error(`[Meta Webhook Sub] Error subscribing page ${pageId}:`, e);
    return { success: false, error: e.message };
  }
}

// ─── Messenger / Instagram DM ──────────────────────────────────────────────

/**
 * Send a text message via Messenger or Instagram DM.
 * Both channels use the same /me/messages endpoint with the page access token.
 */
export async function sendMetaMessage(
  recipientId: string,
  text: string,
  shopSlug: string,
  _channel: 'messenger' | 'instagram' = 'messenger'
) {
  const { data: shop } = await supabaseAdmin
    .from('shops')
    .select('meta_page_access_token')
    .eq('slug', shopSlug)
    .single();

  const pageAccessToken = shop?.meta_page_access_token;

  if (!pageAccessToken) {
    console.error(`META_PAGE_ACCESS_TOKEN not configured for shop: ${shopSlug}`);
    return { success: false, error: 'Missing Page Access Token' };
  }

  try {
    const response = await fetch(
      `https://graph.facebook.com/v19.0/me/messages?access_token=${pageAccessToken}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipient: { id: recipientId },
          message: { text },
        }),
      }
    );

    const data = await response.json();
    if (!response.ok) {
      console.error('Failed to send message via Meta API:', data);
      return { success: false, error: data.error?.message || 'Unknown Meta API error' };
    }
    return { success: true, messageId: data.message_id };
  } catch (error) {
    console.error('Error connecting to Meta Graph API:', error);
    return { success: false, error: 'Internal connection error' };
  }
}

/**
 * Post a public comment reply on a Facebook/Instagram post comment.
 * Requires pages_manage_engagement scope on the page access token.
 */
export async function replyToComment(
  commentId: string,
  text: string,
  pageAccessToken: string
): Promise<{ success: boolean; commentId?: string; error?: string }> {
  try {
    const response = await fetch(
      `https://graph.facebook.com/v19.0/${commentId}/comments?access_token=${pageAccessToken}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text }),
      }
    );
    const data = await response.json();
    if (!response.ok) {
      return { success: false, error: data.error?.message || 'Comment reply failed' };
    }
    return { success: true, commentId: data.id };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

/**
 * Send a private Messenger reply to a commenter (one-shot, 7-day window).
 * Requires pages_messaging permission.
 */
export async function sendPrivateReply(
  commentId: string,
  text: string,
  pageAccessToken: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(
      `https://graph.facebook.com/v19.0/me/messages?access_token=${pageAccessToken}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipient: { comment_id: commentId },
          message: { text },
          messaging_type: 'RESPONSE',
        }),
      }
    );
    const data = await response.json();
    if (!response.ok) {
      return { success: false, error: data.error?.message || 'Private reply failed' };
    }
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

/**
 * Delete a comment via the Graph API.
 * Requires pages_manage_engagement scope.
 */
export async function deleteComment(
  commentId: string,
  pageAccessToken: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(
      `https://graph.facebook.com/v19.0/${commentId}?access_token=${pageAccessToken}`,
      { method: 'DELETE' }
    );
    const data = await response.json();
    if (!response.ok) {
      return { success: false, error: data.error?.message || 'Delete failed' };
    }
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

// ─── WhatsApp Cloud API ────────────────────────────────────────────────────

interface WaShop {
  whatsapp_phone_number_id: string | null;
  whatsapp_access_token: string | null;
}

async function getWaShop(shopId: string): Promise<WaShop | null> {
  const { data } = await supabaseAdmin
    .from('shops')
    .select('prompt_cache_ref')
    .eq('id', shopId)
    .single();

  if (data?.prompt_cache_ref) {
    try {
      const parsed = JSON.parse(data.prompt_cache_ref);
      return {
        whatsapp_phone_number_id: parsed.phoneId || null,
        whatsapp_access_token: parsed.token || null,
      };
    } catch (e) {}
  }
  return null;
}

/**
 * Send a free-text WhatsApp message (only valid inside 24-hour session window).
 */
export async function sendWhatsAppMessage(
  toPhone: string,
  text: string,
  shopId: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const wa = await getWaShop(shopId);
  if (!wa?.whatsapp_phone_number_id || !wa?.whatsapp_access_token) {
    return { success: false, error: 'WhatsApp not configured for this shop' };
  }

  try {
    const response = await fetch(
      `https://graph.facebook.com/v19.0/${wa.whatsapp_phone_number_id}/messages`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${wa.whatsapp_access_token}`,
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: toPhone,
          type: 'text',
          text: { body: text },
        }),
      }
    );
    const data = await response.json();
    if (!response.ok) {
      return { success: false, error: data.error?.message || 'WhatsApp send failed' };
    }
    return { success: true, messageId: data.messages?.[0]?.id };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

/**
 * Send a pre-approved WhatsApp template (used outside 24-hour session window).
 * Template must be registered and approved in Meta Business Manager.
 */
export async function sendWhatsAppTemplate(
  toPhone: string,
  templateName: string,
  languageCode: string = 'en',
  components: any[] = [],
  shopId: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const wa = await getWaShop(shopId);
  if (!wa?.whatsapp_phone_number_id || !wa?.whatsapp_access_token) {
    return { success: false, error: 'WhatsApp not configured for this shop' };
  }

  try {
    const response = await fetch(
      `https://graph.facebook.com/v19.0/${wa.whatsapp_phone_number_id}/messages`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${wa.whatsapp_access_token}`,
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: toPhone,
          type: 'template',
          template: {
            name: templateName,
            language: { code: languageCode },
            components,
          },
        }),
      }
    );
    const data = await response.json();
    if (!response.ok) {
      return { success: false, error: data.error?.message || 'Template send failed' };
    }
    return { success: true, messageId: data.messages?.[0]?.id };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

/**
 * Check whether a WhatsApp conversation is within the 24-hour session window.
 * Returns true if a customer message was received within the last 24 hours.
 */
export async function isWhatsAppSessionActive(conversationId: string): Promise<boolean> {
  const { data } = await supabaseAdmin
    .from('conversations')
    .select('whatsapp_session_expires_at')
    .eq('id', conversationId)
    .single();

  if (!data?.whatsapp_session_expires_at) return false;
  return new Date(data.whatsapp_session_expires_at) > new Date();
}
