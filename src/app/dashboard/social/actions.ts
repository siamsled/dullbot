'use server';

import { supabaseAdmin } from '@/lib/supabase-admin';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

async function getShopId(): Promise<string | null> {
  const supabaseUser = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookies().getAll() } }
  );
  const { data: { user } } = await supabaseUser.auth.getUser();
  if (!user) return null;
  const { data: shop } = await supabaseAdmin.from('shops').select('id').eq('owner_id', user.id).single();
  return shop?.id ?? null;
}

export async function getPostAutomations() {
  const shopId = await getShopId();
  if (!shopId) return [];
  const { data } = await supabaseAdmin
    .from('post_automations')
    .select('*')
    .eq('shop_id', shopId)
    .order('created_at', { ascending: false });
  return data || [];
}

export async function getPostAutomation(postId: string) {
  const shopId = await getShopId();
  if (!shopId) return null;
  const { data } = await supabaseAdmin
    .from('post_automations')
    .select('*')
    .eq('shop_id', shopId)
    .eq('post_id', postId)
    .maybeSingle();
  return data;
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
  const shopId = await getShopId();
  if (!shopId) return { success: false, error: 'Not authenticated' };

  const { error } = await supabaseAdmin
    .from('post_automations')
    .upsert(
      {
        shop_id: shopId,
        ...payload,
        delete_examples: payload.delete_examples || [],
        product_ids: payload.product_ids || [],
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'shop_id,post_id' }
    );

  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function deletePostAutomation(postId: string) {
  const shopId = await getShopId();
  if (!shopId) return { success: false, error: 'Not authenticated' };
  const { error } = await supabaseAdmin
    .from('post_automations')
    .delete()
    .eq('shop_id', shopId)
    .eq('post_id', postId);
  if (error) return { success: false, error: error.message };
  return { success: true };
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
