import { supabaseAdmin } from '@/lib/supabase-admin';

export interface MetaSyncResult {
  success: boolean;
  syncedPages: number;
  syncedConversations: number;
  syncedMessages: number;
  error?: string;
}

/**
 * Syncs historical chats from connected Meta (Facebook Page) mailboxes via Meta Graph API.
 * Fetches recent conversations and messages, safely creating conversation threads
 * and inserting messages without duplicates.
 */
export async function syncMetaHistoricalChats(shopId: string, specificPageId?: string): Promise<MetaSyncResult> {
  try {
    let query = supabaseAdmin
      .from('shop_meta_pages')
      .select('*')
      .eq('shop_id', shopId);

    if (specificPageId) {
      query = query.eq('meta_page_id', specificPageId);
    }

    const { data: pages, error: pagesErr } = await query;

    if (pagesErr || !pages || pages.length === 0) {
      console.warn(`[META SYNC] No connected pages found for shop ${shopId}`);
      return { success: true, syncedPages: 0, syncedConversations: 0, syncedMessages: 0 };
    }

    let totalConversations = 0;
    let totalMessages = 0;

    for (const page of pages) {
      if (!page.meta_page_access_token || !page.meta_page_id) continue;

      const pageId = page.meta_page_id;
      const pageName = page.meta_page_name || 'Facebook Page';
      const token = page.meta_page_access_token;

      try {
        const url = `https://graph.facebook.com/v21.0/${pageId}/conversations?fields=id,snippet,updated_time,participants,messages.limit(100){id,message,created_time,from,to}&limit=40&access_token=${token}`;
        const res = await fetch(url);
        const json = await res.json();

        if (!json.data || !Array.isArray(json.data)) {
          console.warn(`[META SYNC] Unexpected response from Graph API for page ${pageName}:`, json.error || json);
          continue;
        }

        for (const metaConv of json.data) {
          const participants = metaConv.participants?.data || [];
          const customerParticipant = participants.find((p: any) => p.id !== pageId) || participants[0];

          if (!customerParticipant || !customerParticipant.id) continue;

          const customerPsid = customerParticipant.id;
          const customerName = customerParticipant.name || 'Facebook User';

          // 1. Find or create conversation in Supabase
          const { data: existingConv } = await supabaseAdmin
            .from('conversations')
            .select('id, meta_name, handoff_summary')
            .eq('shop_id', shopId)
            .eq('customer_phone', customerPsid)
            .maybeSingle();

          let conversationId: string;

          if (existingConv) {
            conversationId = existingConv.id;
            const updatedHandoff = {
              ...(existingConv.handoff_summary || {}),
              meta_page_id: pageId,
              meta_page_name: pageName,
            };

            await supabaseAdmin
              .from('conversations')
              .update({
                meta_name: existingConv.meta_name || customerName,
                handoff_summary: updatedHandoff,
              })
              .eq('id', conversationId);
          } else {
            const { data: newConv, error: createErr } = await supabaseAdmin
              .from('conversations')
              .insert({
                shop_id: shopId,
                customer_phone: customerPsid,
                channel: 'messenger',
                status: 'bot_active',
                meta_name: customerName,
                handoff_summary: {
                  meta_page_id: pageId,
                  meta_page_name: pageName,
                },
                last_message_at: metaConv.updated_time || new Date().toISOString(),
                last_message_content: metaConv.snippet || '',
              })
              .select('id')
              .single();

            if (createErr || !newConv) {
              console.error(`[META SYNC] Error creating conversation for PSID ${customerPsid}:`, createErr);
              continue;
            }
            conversationId = newConv.id;
          }

          totalConversations++;

          // 2. Fetch and insert messages (oldest first)
          const rawMessages = metaConv.messages?.data || [];
          const sortedMessages = [...rawMessages].sort(
            (a, b) => new Date(a.created_time).getTime() - new Date(b.created_time).getTime()
          );

          if (sortedMessages.length === 0) continue;

          // Query existing message timestamps or metadata IDs for this conversation
          const { data: existingMsgs } = await supabaseAdmin
            .from('messages')
            .select('id, created_at, content, sender, metadata')
            .eq('conversation_id', conversationId);

          const existingSet = new Set<string>();
          (existingMsgs || []).forEach(m => {
            if (m.metadata?.meta_message_id) {
              existingSet.add(m.metadata.meta_message_id);
            }
            // fallback signature for dedup
            existingSet.add(`${m.sender}:${m.content}:${new Date(m.created_at).getTime()}`);
          });

          const messagesToInsert: any[] = [];

          for (const msg of sortedMessages) {
            const msgId = msg.id;
            const content = msg.message;
            if (!content || !content.trim()) continue;

            const isFromPage = msg.from?.id === pageId;
            const sender = isFromPage ? 'agent' : 'customer';
            const createdAt = new Date(msg.created_time).toISOString();
            const fallbackSig = `${sender}:${content}:${new Date(createdAt).getTime()}`;

            if (existingSet.has(msgId) || existingSet.has(fallbackSig)) {
              continue; // Skip duplicate
            }

            messagesToInsert.push({
              conversation_id: conversationId,
              sender,
              content: content.trim(),
              created_at: createdAt,
              metadata: {
                meta_message_id: msgId,
                synced_from_graph_api: true,
              },
            });

            existingSet.add(msgId);
            existingSet.add(fallbackSig);
          }

          if (messagesToInsert.length > 0) {
            const { error: insertErr } = await supabaseAdmin
              .from('messages')
              .insert(messagesToInsert);

            if (insertErr) {
              console.error(`[META SYNC] Error inserting messages for conv ${conversationId}:`, insertErr);
            } else {
              totalMessages += messagesToInsert.length;
            }
          }

          // 3. Update last_message_at and last_message_content with the latest message
          const latest = sortedMessages[sortedMessages.length - 1];
          if (latest && latest.message) {
            await supabaseAdmin
              .from('conversations')
              .update({
                last_message_at: new Date(latest.created_time).toISOString(),
                last_message_content: latest.message,
              })
              .eq('id', conversationId);
          }
        }
      } catch (pageSyncErr) {
        console.error(`[META SYNC] Error syncing page ${pageName} (${pageId}):`, pageSyncErr);
      }
    }

    return {
      success: true,
      syncedPages: pages.length,
      syncedConversations: totalConversations,
      syncedMessages: totalMessages,
    };
  } catch (error: any) {
    console.error('[META SYNC] Fatal error during Meta chat sync:', error);
    return {
      success: false,
      syncedPages: 0,
      syncedConversations: 0,
      syncedMessages: 0,
      error: error.message || 'Failed to sync historical chats',
    };
  }
}
