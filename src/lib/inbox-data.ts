import { supabaseAdmin } from '@/lib/supabase-admin';

export async function getMessages(conversationId: string, before?: string, limit: number = 40) {
  try {
    let query = supabaseAdmin
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (before) {
      query = query.lt('created_at', before);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching messages:', error);
      return [];
    }

    // Return in chronological order
    return (data || []).reverse();
  } catch (err) {
    console.error('Unhandled exception in getMessages:', err);
    return [];
  }
}

export async function getConversations(shopId: string) {
  try {
    const { data: conversations, error } = await supabaseAdmin
      .from('conversations')
      .select('*, orders(id, status, customer_name, customer_phone, customer_address, total_amount)')
      .eq('shop_id', shopId)
      .order('last_message_at', { ascending: false });

    if (error || !conversations) {
      console.error('Error fetching conversations:', error);
      return [];
    }

    // Heal / Backfill missing last_message_content and last_message_at using a single batched query
    const unhealedConvs = conversations.filter(c => !c.last_message_content);
    if (unhealedConvs.length > 0) {
      const unhealedIds = unhealedConvs.map(c => c.id);
      const { data: latestMsgs } = await supabaseAdmin
        .from('messages')
        .select('conversation_id, content, created_at')
        .in('conversation_id', unhealedIds)
        .order('created_at', { ascending: false });

      if (latestMsgs && latestMsgs.length > 0) {
        const latestMap = new Map<string, { content: string; created_at: string }>();
        for (const m of latestMsgs) {
          if (!latestMap.has(m.conversation_id)) {
            latestMap.set(m.conversation_id, { content: m.content, created_at: m.created_at });
          }
        }

        for (const conv of unhealedConvs) {
          const latest = latestMap.get(conv.id);
          if (latest) {
            conv.last_message_content = latest.content;
            conv.last_message_at = latest.created_at;

            supabaseAdmin
              .from('conversations')
              .update({
                last_message_content: latest.content,
                last_message_at: latest.created_at
              })
              .eq('id', conv.id)
              .then(({ error: healErr }) => {
                if (healErr) console.error(`Failed to heal conversation ${conv.id}:`, healErr.message);
              });
          }
        }
      }
    }

    return conversations.map(c => ({
      ...c,
      meta_page_id: c.meta_page_id || c.handoff_summary?.meta_page_id || null,
      meta_page_name: c.meta_page_name || c.handoff_summary?.meta_page_name || null,
    }));
  } catch (err) {
    console.error('Unhandled exception in getConversations:', err);
    return [];
  }
}
