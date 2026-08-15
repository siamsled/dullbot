'use server';

import { supabaseAdmin, getCurrentShop } from '@/lib/supabase-admin';

async function getShopId(): Promise<string | null> {
  const shop = await getCurrentShop();
  return shop?.id ?? null;
}

export async function getPostAutomations() {
  try {
    const shopId = await getShopId();
    if (!shopId) return [];
    const { data, error } = await supabaseAdmin
      .from('post_automations')
      .select('*')
      .eq('shop_id', shopId)
      .order('created_at', { ascending: false });
    if (error) {
      if (error.code !== 'PGRST205') {
        console.warn('[SOCIAL] getPostAutomations error:', error.message);
      }
      return [];
    }
    return data || [];
  } catch (err) {
    console.warn('[SOCIAL] getPostAutomations exception:', err);
    return [];
  }
}

export async function getPostAutomation(postId: string) {
  try {
    const shopId = await getShopId();
    if (!shopId) return null;
    const { data, error } = await supabaseAdmin
      .from('post_automations')
      .select('*')
      .eq('shop_id', shopId)
      .eq('post_id', postId)
      .maybeSingle();
    if (error) return null;
    return data;
  } catch {
    return null;
  }
}

export async function upsertPostAutomation(payload: {
  post_id: string;
  post_platform: 'facebook' | 'instagram';
  post_preview_text?: string;
  post_thumbnail_url?: string;
  reply_as_comment: boolean;
  instructions?: string;
  delete_negative: boolean;
  delete_examples?: string[];
  send_as_messenger: boolean;
  product_ids?: string[];
}) {
  try {
    const shopId = await getShopId();
    if (!shopId) return { success: false, error: 'Not authenticated or shop session expired' };

    const { data: existing } = await supabaseAdmin
      .from('post_automations')
      .select('id')
      .eq('shop_id', shopId)
      .eq('post_id', payload.post_id)
      .maybeSingle();

    if (existing) {
      const { error: updateErr } = await supabaseAdmin
        .from('post_automations')
        .update({
          ...payload,
          delete_examples: payload.delete_examples || [],
          product_ids: payload.product_ids || [],
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id);

      if (updateErr) {
        console.error('[SOCIAL] Update error:', updateErr);
        const isMissingTable = updateErr.code === 'PGRST205' || updateErr.message?.includes('schema cache');
        return {
          success: false,
          error: isMissingTable
            ? 'Database table "post_automations" is pending. Please run supabase/migrations/20260815_social_post_automations.sql in Supabase SQL Editor.'
            : updateErr.message
        };
      }
      return { success: true };
    }

    const { error: insertErr } = await supabaseAdmin
      .from('post_automations')
      .insert({
        shop_id: shopId,
        ...payload,
        delete_examples: payload.delete_examples || [],
        product_ids: payload.product_ids || [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

    if (insertErr) {
      console.error('[SOCIAL] Insert error:', insertErr);
      const isMissingTable = insertErr.code === 'PGRST205' || insertErr.message?.includes('schema cache');
      return {
        success: false,
        error: isMissingTable
          ? 'Database table "post_automations" is pending. Please run supabase/migrations/20260815_social_post_automations.sql in Supabase SQL Editor.'
          : insertErr.message
      };
    }
    return { success: true };
  } catch (err: any) {
    console.error('[SOCIAL] Exception in upsertPostAutomation:', err);
    return { success: false, error: err.message || 'Failed to save automation' };
  }
}

export async function deletePostAutomation(postId: string) {
  try {
    const shopId = await getShopId();
    if (!shopId) return { success: false, error: 'Not authenticated' };
    const { error } = await supabaseAdmin
      .from('post_automations')
      .delete()
      .eq('shop_id', shopId)
      .eq('post_id', postId);
    if (error) {
      const isMissingTable = error.code === 'PGRST205' || error.message?.includes('schema cache');
      return {
        success: false,
        error: isMissingTable
          ? 'Database table "post_automations" is pending. Please run supabase/migrations/20260815_social_post_automations.sql in Supabase SQL Editor.'
          : error.message
      };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to delete automation' };
  }
}

export async function getShopProducts() {
  const shopId = await getShopId();
  if (!shopId) return [];
  const { data } = await supabaseAdmin
    .from('products')
    .select('id, name, price, currency, image_url')
    .eq('shop_id', shopId)
    .eq('is_active', true)
    .order('name');
  return data || [];
}

/** Fetch post preview from Meta Graph API using the page access token */
export async function fetchPostPreview(postUrl: string) {
  const shopId = await getShopId();
  if (!shopId) return null;

  const { data: shop } = await supabaseAdmin
    .from('shops')
    .select('meta_page_access_token')
    .eq('id', shopId)
    .single();

  if (!shop?.meta_page_access_token) return null;

  // Extract post ID from URL
  // Patterns: facebook.com/.../posts/123456 or instagram.com/p/ABCDEF
  const fbMatch = postUrl.match(/posts\/(\d+)/);
  const igMatch = postUrl.match(/\/p\/([A-Za-z0-9_-]+)/);
  const rawId = fbMatch?.[1] || igMatch?.[1];
  if (!rawId) return null;

  // For Facebook posts, full post ID is {page_id}_{post_id}
  try {
    const res = await fetch(
      `https://graph.facebook.com/v19.0/${rawId}?fields=message,full_picture,created_time&access_token=${shop.meta_page_access_token}`
    );
    const data = await res.json();
    if (!res.ok || data.error) return null;

    return {
      post_id: rawId,
      post_preview_text: (data.message || '').slice(0, 200),
      post_thumbnail_url: data.full_picture || null,
    };
  } catch {
    return null;
  }
}

export async function getCommentStats(postId: string) {
  const shopId = await getShopId();
  if (!shopId) return null;
  const { data } = await supabaseAdmin
    .from('post_comments')
    .select('id, private_reply_sent, deleted_at, replied_at')
    .eq('shop_id', shopId)
    .eq('post_id', postId);

  if (!data) return null;
  return {
    total: data.length,
    replied: data.filter(c => c.replied_at).length,
    privateReplied: data.filter(c => c.private_reply_sent).length,
    deleted: data.filter(c => c.deleted_at).length,
  };
}

export type ConnectedPostItem = {
  post_id: string;
  platform: 'facebook' | 'instagram';
  preview_text: string;
  thumbnail_url: string | null;
  permalink_url: string | null;
  created_time: string;
};

export async function togglePostAutomationStatus(postId: string, enabled: boolean, postData?: {
  platform: 'facebook' | 'instagram';
  preview_text?: string;
  thumbnail_url?: string;
}) {
  try {
    const shopId = await getShopId();
    if (!shopId) return { success: false, error: 'Not authenticated or shop session expired' };

    if (!enabled) {
      const { error } = await supabaseAdmin
        .from('post_automations')
        .delete()
        .eq('shop_id', shopId)
        .eq('post_id', postId);
      if (error) {
        console.error('[SOCIAL] Error deleting automation:', error);
        return { success: false, error: error.message };
      }
      return { success: true, enabled: false };
    }

    // 1. Check if row exists
    const { data: existing } = await supabaseAdmin
      .from('post_automations')
      .select('*')
      .eq('shop_id', shopId)
      .eq('post_id', postId)
      .maybeSingle();

    if (existing) {
      const { data: updated, error: updateErr } = await supabaseAdmin
        .from('post_automations')
        .update({
          reply_as_comment: true,
          send_as_messenger: true,
          post_platform: postData?.platform || existing.post_platform || 'facebook',
          post_preview_text: postData?.preview_text || existing.post_preview_text || '',
          post_thumbnail_url: postData?.thumbnail_url || existing.post_thumbnail_url || undefined,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
        .select('*')
        .single();

      if (updateErr) {
        console.error('[SOCIAL] Error updating automation:', updateErr);
        const isMissingTable = updateErr.code === 'PGRST205' || updateErr.message?.includes('schema cache');
        return {
          success: false,
          error: isMissingTable
            ? 'Database table "post_automations" is pending. Please run supabase/migrations/20260815_social_post_automations.sql in Supabase SQL Editor.'
            : updateErr.message
        };
      }
      return { success: true, enabled: true, data: updated };
    }

    // 2. Insert new row
    const { data: inserted, error: insertErr } = await supabaseAdmin
      .from('post_automations')
      .insert({
        shop_id: shopId,
        post_id: postId,
        post_platform: postData?.platform || 'facebook',
        post_preview_text: postData?.preview_text || '',
        post_thumbnail_url: postData?.thumbnail_url || undefined,
        reply_as_comment: true,
        send_as_messenger: true,
        delete_negative: false,
        instructions: '',
        delete_examples: [],
        product_ids: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select('*')
      .single();

    if (insertErr) {
      console.error('[SOCIAL] Error inserting automation:', insertErr);
      const isMissingTable = insertErr.code === 'PGRST205' || insertErr.message?.includes('schema cache');
      return {
        success: false,
        error: isMissingTable
          ? 'Database table "post_automations" is pending. Please run supabase/migrations/20260815_social_post_automations.sql in Supabase SQL Editor.'
          : insertErr.message
      };
    }

    return { success: true, enabled: true, data: inserted };
  } catch (err: any) {
    console.error('[SOCIAL] Exception in togglePostAutomationStatus:', err);
    return { success: false, error: err.message || 'Failed to toggle automation' };
  }
}

export async function fetchConnectedSocialPosts() {
  const shopId = await getShopId();
  if (!shopId) return { connected: false, posts: [] as ConnectedPostItem[] };

  const [{ data: shop }, { data: metaPages }] = await Promise.all([
    supabaseAdmin
      .from('shops')
      .select('name, meta_page_id, meta_page_name, meta_page_access_token, instagram_business_id, instagram_access_token')
      .eq('id', shopId)
      .single(),
    supabaseAdmin
      .from('shop_meta_pages')
      .select('meta_page_id, meta_page_name, meta_page_access_token, instagram_business_id, instagram_access_token')
      .eq('shop_id', shopId)
  ]);

  const pagesToFetch: { page_id: string; page_name: string; page_token: string; ig_id: string | null; ig_token: string | null }[] = [];

  if (shop?.meta_page_id && shop?.meta_page_access_token) {
    pagesToFetch.push({
      page_id: shop.meta_page_id,
      page_name: shop.meta_page_name || shop.name || 'Facebook Page',
      page_token: shop.meta_page_access_token,
      ig_id: shop.instagram_business_id || null,
      ig_token: shop.instagram_access_token || shop.meta_page_access_token,
    });
  }

  if (metaPages && Array.isArray(metaPages)) {
    for (const p of metaPages) {
      if (p.meta_page_id && p.meta_page_access_token && !pagesToFetch.some(existing => existing.page_id === p.meta_page_id)) {
        pagesToFetch.push({
          page_id: p.meta_page_id,
          page_name: p.meta_page_name || 'Facebook Page',
          page_token: p.meta_page_access_token,
          ig_id: p.instagram_business_id || null,
          ig_token: p.instagram_access_token || p.meta_page_access_token,
        });
      }
    }
  }

  if (pagesToFetch.length === 0) {
    return { connected: false, posts: [] as ConnectedPostItem[] };
  }

  const hasPage = pagesToFetch.some(p => !!p.page_id);
  const hasIg = pagesToFetch.some(p => !!p.ig_id);

  const posts: ConnectedPostItem[] = [];
  const seenPostIds = new Set<string>();

  for (const item of pagesToFetch) {
    // 1. Fetch Facebook Page Published Posts
    if (item.page_id && item.page_token) {
      try {
        const fbRes = await fetch(
          `https://graph.facebook.com/v19.0/${item.page_id}/published_posts?fields=id,message,full_picture,permalink_url,created_time&limit=30&access_token=${item.page_token}`
        );
        const fbData = await fbRes.json();
        if (fbData.data && Array.isArray(fbData.data)) {
          for (const p of fbData.data) {
            if (!seenPostIds.has(p.id)) {
              seenPostIds.add(p.id);
              posts.push({
                post_id: p.id,
                platform: 'facebook',
                preview_text: p.message || '(Facebook Post)',
                thumbnail_url: p.full_picture || null,
                permalink_url: p.permalink_url || `https://www.facebook.com/${p.id}`,
                created_time: p.created_time || new Date().toISOString(),
              });
            }
          }
        }
      } catch (err) {
        console.error('[SOCIAL POSTS] Error fetching Facebook page posts:', err);
      }
    }

    // 2. Fetch Instagram Media
    if (item.ig_id && item.ig_token) {
      try {
        const igRes = await fetch(
          `https://graph.facebook.com/v19.0/${item.ig_id}/media?fields=id,caption,media_url,thumbnail_url,permalink,timestamp&limit=30&access_token=${item.ig_token}`
        );
        const igData = await igRes.json();
        if (igData.data && Array.isArray(igData.data)) {
          for (const m of igData.data) {
            if (!seenPostIds.has(m.id)) {
              seenPostIds.add(m.id);
              posts.push({
                post_id: m.id,
                platform: 'instagram',
                preview_text: m.caption || '(Instagram Post)',
                thumbnail_url: m.media_url || m.thumbnail_url || null,
                permalink_url: m.permalink || null,
                created_time: m.timestamp || new Date().toISOString(),
              });
            }
          }
        }
      } catch (err) {
        console.error('[SOCIAL POSTS] Error fetching Instagram posts:', err);
      }
    }
  }

  // Sort newest first by default
  posts.sort((a, b) => new Date(b.created_time).getTime() - new Date(a.created_time).getTime());

  return {
    connected: true,
    hasPage,
    hasIg,
    shopName: shop?.name || 'My Store',
    posts,
  };
}

export type CommentDetailItem = {
  id: string;
  comment_id: string;
  sender_id?: string | null;
  sender_name?: string | null;
  comment_text: string;
  reply_text?: string | null;
  is_negative?: boolean;
  is_deleted?: boolean;
  private_reply_sent?: boolean;
  replied_at?: string | null;
  created_at: string;
  source: 'database' | 'meta_api';
};

export async function fetchPostComments(postId: string, platform: 'facebook' | 'instagram'): Promise<{
  success: boolean;
  comments: CommentDetailItem[];
  error?: string;
}> {
  try {
    const shopId = await getShopId();
    if (!shopId) return { success: false, comments: [], error: 'Not authenticated' };

    // 1. Fetch from Supabase post_comments
    const { data: dbComments } = await supabaseAdmin
      .from('post_comments')
      .select('*')
      .eq('shop_id', shopId)
      .eq('post_id', postId)
      .order('created_at', { ascending: false });

    const commentsMap = new Map<string, CommentDetailItem>();

    if (dbComments && Array.isArray(dbComments)) {
      for (const c of dbComments) {
        commentsMap.set(c.comment_id, {
          id: c.id,
          comment_id: c.comment_id,
          sender_id: c.sender_id || (c as any).commenter_psid || null,
          sender_name: c.sender_name || 'Customer',
          comment_text: c.comment_text || '',
          reply_text: c.reply_text || null,
          is_negative: !!c.is_negative,
          is_deleted: !!(c.is_deleted || (c as any).deleted_at),
          private_reply_sent: !!(c as any).private_reply_sent,
          replied_at: (c as any).replied_at || null,
          created_at: c.created_at || new Date().toISOString(),
          source: 'database',
        });
      }
    }

    // 2. Also try fetching live comments from Meta Graph API using shop or page token
    const [{ data: shop }, { data: metaPages }] = await Promise.all([
      supabaseAdmin
        .from('shops')
        .select('meta_page_access_token, instagram_access_token')
        .eq('id', shopId)
        .single(),
      supabaseAdmin
        .from('shop_meta_pages')
        .select('meta_page_access_token, instagram_access_token')
        .eq('shop_id', shopId)
    ]);

    const tokens: string[] = [];
    if (shop?.meta_page_access_token) tokens.push(shop.meta_page_access_token);
    if (shop?.instagram_access_token && !tokens.includes(shop.instagram_access_token)) tokens.push(shop.instagram_access_token);
    if (metaPages && Array.isArray(metaPages)) {
      for (const p of metaPages) {
        if (p.meta_page_access_token && !tokens.includes(p.meta_page_access_token)) tokens.push(p.meta_page_access_token);
        if (p.instagram_access_token && !tokens.includes(p.instagram_access_token)) tokens.push(p.instagram_access_token);
      }
    }

    for (const token of tokens) {
      try {
        const url = platform === 'instagram'
          ? `https://graph.facebook.com/v19.0/${postId}/comments?fields=id,text,username,timestamp,replies{id,text,username,timestamp}&limit=50&access_token=${token}`
          : `https://graph.facebook.com/v19.0/${postId}/comments?fields=id,message,from,created_time,comments{id,message,from,created_time}&limit=50&access_token=${token}`;

        const res = await fetch(url);
        const data = await res.json();

        if (data && Array.isArray(data.data)) {
          for (const item of data.data) {
            const commentId = item.id;
            const message = item.message || item.text || '';
            const senderName = item.from?.name || item.username || 'User';
            const senderId = item.from?.id || null;
            const createdAt = item.created_time || item.timestamp || new Date().toISOString();

            // Extract reply if any sub-comment exists from page
            let replyText: string | null = null;
            let repliedAt: string | null = null;
            const subComments = item.comments?.data || item.replies?.data;
            if (Array.isArray(subComments) && subComments.length > 0) {
              replyText = subComments[0]?.message || subComments[0]?.text || null;
              repliedAt = subComments[0]?.created_time || subComments[0]?.timestamp || null;
            }

            if (commentsMap.has(commentId)) {
              const existing = commentsMap.get(commentId)!;
              commentsMap.set(commentId, {
                ...existing,
                sender_name: existing.sender_name !== 'Customer' ? existing.sender_name : senderName,
                reply_text: existing.reply_text || replyText,
                replied_at: existing.replied_at || repliedAt,
              });
            } else {
              commentsMap.set(commentId, {
                id: commentId,
                comment_id: commentId,
                sender_id: senderId,
                sender_name: senderName,
                comment_text: message,
                reply_text: replyText,
                is_negative: false,
                is_deleted: false,
                private_reply_sent: false,
                replied_at: repliedAt,
                created_at: createdAt,
                source: 'meta_api',
              });
            }
          }
          break; // successfully fetched
        }
      } catch (err) {
        // continue to next token if any
      }
    }

    const allComments = Array.from(commentsMap.values()).sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    return {
      success: true,
      comments: allComments,
    };
  } catch (err: any) {
    console.error('[SOCIAL] Error in fetchPostComments:', err);
    return { success: false, comments: [], error: err.message || 'Failed to fetch comments' };
  }
}

