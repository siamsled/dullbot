'use server';

import { supabaseAdmin } from '@/lib/supabase-admin';
import { revalidatePath } from 'next/cache';
import { encrypt } from '@/lib/encryption';

// ─── Get connected pages for a shop ────────────────────────────────────────
export async function getConnectedPages(shopId: string) {
  let resolvedId = shopId;
  const isUUID = shopId.includes('-') && shopId.length === 36;
  if (!isUUID) {
    const { data: s } = await supabaseAdmin.from('shops').select('id').eq('slug', shopId).single();
    if (s?.id) resolvedId = s.id;
  }

  const { data } = await supabaseAdmin
    .from('shop_meta_pages')
    .select('meta_page_id, meta_page_name, instagram_business_id, is_primary')
    .eq('shop_id', resolvedId)
    .order('is_primary', { ascending: false });
  return data || [];
}

// ─── Select (multi) pages — upserts selected, removes de-selected ────────────
export async function selectPagesMeta(
  shopId: string,
  pages: Array<{ id: string; name: string; access_token: string; instagram_business_id: string | null; user_access_token?: string | null }>
) {
  if (pages.length === 0) return { success: false, error: 'No pages selected' };

  let resolvedId = shopId;
  const isUUID = shopId.includes('-') && shopId.length === 36;
  if (!isUUID) {
    const { data: s } = await supabaseAdmin.from('shops').select('id').eq('slug', shopId).single();
    if (s?.id) resolvedId = s.id;
  }

  // Build upsert rows — first page is primary
  const upsertRows = pages.map((page, index) => ({
    shop_id: resolvedId,
    meta_page_id: page.id,
    meta_page_name: page.name,
    meta_page_access_token: page.access_token,
    ...(page.user_access_token ? { meta_user_access_token: page.user_access_token } : {}),
    instagram_business_id: page.instagram_business_id || null,
    instagram_access_token: page.instagram_business_id ? page.access_token : null,
    is_primary: index === 0,
  }));

  // Remove pages that were de-selected
  const { data: currentPages } = await supabaseAdmin
    .from('shop_meta_pages')
    .select('meta_page_id')
    .eq('shop_id', resolvedId);
  const currentPageIds = (currentPages || []).map((p) => p.meta_page_id);
  const newPageIds = pages.map((p) => p.id);
  const toRemove = currentPageIds.filter((id) => !newPageIds.includes(id));
  if (toRemove.length > 0) {
    await supabaseAdmin.from('shop_meta_pages').delete().eq('shop_id', resolvedId).in('meta_page_id', toRemove);
  }

  // Upsert selected pages
  const { error: upsertErr } = await supabaseAdmin
    .from('shop_meta_pages')
    .upsert(upsertRows, { onConflict: 'shop_id,meta_page_id' });
  if (upsertErr) return { success: false, error: upsertErr.message };

  // Keep shops table in sync with primary page (backward compat)
  const primary = pages[0];
  const { error: shopErr } = await supabaseAdmin
    .from('shops')
    .update({
      meta_page_id: primary.id,
      meta_page_name: primary.name,
      meta_page_access_token: primary.access_token,
      instagram_business_id: primary.instagram_business_id || null,
      instagram_access_token: primary.instagram_business_id ? primary.access_token : null,
    })
    .eq('id', resolvedId);
  if (shopErr) return { success: false, error: shopErr.message };

  revalidatePath('/dashboard/settings');
  revalidatePath('/onboarding');
  return {
    success: true,
    instagramConnected: pages.some((p) => !!p.instagram_business_id),
    pageCount: pages.length,
  };
}

// ─── Legacy single-page select (kept for backward compat) ───────────────────
export async function selectPageMeta(
  shopId: string,
  page: { id: string; name: string; access_token: string; instagram_business_id?: string | null }
) {
  let instagramBusinessId: string | null = page.instagram_business_id ?? null;
  if (instagramBusinessId === undefined) {
    try {
      const igRes = await fetch(
        `https://graph.facebook.com/v19.0/${page.id}?fields=instagram_business_account&access_token=${page.access_token}`
      );
      const igData = await igRes.json();
      instagramBusinessId = igData?.instagram_business_account?.id || null;
    } catch (e) {
      console.error('Failed to fetch Instagram Business Account for selected page:', e);
    }
  }
  return selectPagesMeta(shopId, [{ id: page.id, name: page.name, access_token: page.access_token, instagram_business_id: instagramBusinessId }]);
}

// ─── Disconnect a specific page ──────────────────────────────────────────────
export async function disconnectMetaPage(shopId: string, metaPageId: string) {
  await supabaseAdmin.from('shop_meta_pages').delete().eq('shop_id', shopId).eq('meta_page_id', metaPageId);

  const { data: remaining } = await supabaseAdmin
    .from('shop_meta_pages')
    .select('meta_page_id, meta_page_name, meta_page_access_token, instagram_business_id, instagram_access_token, is_primary')
    .eq('shop_id', shopId)
    .order('is_primary', { ascending: false });

  if (!remaining || remaining.length === 0) {
    await supabaseAdmin
      .from('shops')
      .update({ meta_page_id: null, meta_page_name: null, meta_page_access_token: null, instagram_business_id: null, instagram_access_token: null })
      .eq('id', shopId);
  } else {
    const newPrimary = remaining.find((p) => p.is_primary) || remaining[0];
    if (!remaining.find((p) => p.is_primary)) {
      await supabaseAdmin.from('shop_meta_pages').update({ is_primary: true }).eq('shop_id', shopId).eq('meta_page_id', newPrimary.meta_page_id);
    }
    await supabaseAdmin.from('shops').update({
      meta_page_id: newPrimary.meta_page_id,
      meta_page_name: newPrimary.meta_page_name,
      meta_page_access_token: newPrimary.meta_page_access_token,
      instagram_business_id: newPrimary.instagram_business_id,
      instagram_access_token: newPrimary.instagram_access_token,
    }).eq('id', shopId);
  }

  revalidatePath('/dashboard/settings');
  revalidatePath('/onboarding');
  return { success: true };
}

export async function disconnectFacebook(shopId: string) {
  // Clear all pages from shop_meta_pages
  await supabaseAdmin.from('shop_meta_pages').delete().eq('shop_id', shopId);

  const { error } = await supabaseAdmin
    .from('shops')
    .update({ meta_page_id: null, meta_page_name: null, meta_page_access_token: null, instagram_business_id: null, instagram_access_token: null })
    .eq('id', shopId);

  if (error) return { success: false, error: error.message };
  revalidatePath('/dashboard/settings');
  revalidatePath('/onboarding');
  return { success: true };
}

export async function disconnectInstagram(shopId: string) {
  const { error } = await supabaseAdmin
    .from('shops')
    .update({
      instagram_business_id: null,
    })
    .eq('id', shopId);

  if (error) {
    console.error('Failed to disconnect Instagram:', error);
    return { success: false, error: error.message };
  }

  revalidatePath('/dashboard/settings');
  revalidatePath('/onboarding');
  return { success: true };
}

export async function disconnectWhatsApp(shopId: string) {
  const { error } = await supabaseAdmin
    .from('shops')
    .update({
      whatsapp_business_account_id: null,
      whatsapp_phone_number_id: null,
      whatsapp_access_token: null,
    })
    .eq('id', shopId);

  if (error) {
    console.error('Failed to disconnect WhatsApp:', error);
    return { success: false, error: error.message };
  }

  revalidatePath('/dashboard/settings');
  revalidatePath('/onboarding');
  return { success: true };
}

export async function saveWidgetEnabled(shopId: string, enabled: boolean) {
  const { error } = await supabaseAdmin
    .from('shops')
    .update({ widget_enabled: enabled })
    .eq('id', shopId);

  if (error) {
    console.error('Failed to save widget state:', error);
    return { success: false, error: error.message };
  }

  revalidatePath('/dashboard/settings');
  return { success: true };
}

export async function saveSettings(
  shopId: string,
  payload: {
    confirmationTier: 'light' | 'otp_verified' | 'prepay_verified';
    bkashNumber: string;
    agentEnabled: boolean;
    paymentVerificationMethod: 'none' | 'merchant_api' | 'notification_app';
    bkashConfig: any;
    nagadConfig: any;
    courierProvider: string;
    courierConfig: any;
  }
) {
  const bkashConfigEncrypted = payload.bkashConfig ? encrypt(JSON.stringify(payload.bkashConfig)) : null;
  const nagadConfigEncrypted = payload.nagadConfig ? encrypt(JSON.stringify(payload.nagadConfig)) : null;
  const courierConfigEncrypted = payload.courierConfig ? encrypt(JSON.stringify(payload.courierConfig)) : null;

  const { error: shopErr } = await supabaseAdmin
    .from('shops')
    .update({
      confirmation_tier: payload.confirmationTier,
      bkash_number: payload.bkashNumber,
      agent_enabled: payload.agentEnabled,
      payment_verification_method: payload.paymentVerificationMethod,
      bkash_config_encrypted: bkashConfigEncrypted,
      nagad_config_encrypted: nagadConfigEncrypted,
      courier_provider: payload.courierProvider || null,
      courier_config_encrypted: courierConfigEncrypted,
    })
    .eq('id', shopId);

  if (shopErr) {
    console.error('Failed to update shop settings:', shopErr);
    return { success: false, error: shopErr.message };
  }

  revalidatePath('/dashboard/settings');
  return { success: true };
}

export async function saveWhatsAppConfig(
  shopId: string,
  payload: { wabaId: string; phoneId: string; token: string }
) {
  const { error } = await supabaseAdmin
    .from('shops')
    .update({
      whatsapp_business_account_id: payload.wabaId || null,
      whatsapp_phone_number_id: payload.phoneId || null,
      whatsapp_access_token: payload.token || null,
    })
    .eq('id', shopId);

  if (error) {
    console.error('Failed to update WhatsApp config:', error);
    return { success: false, error: error.message };
  }

  revalidatePath('/dashboard/settings');
  return { success: true };
}

// ─── Diagnostic: check what Meta Graph API returns for instagram_business_account ─
export async function checkInstagramForPage(shopId: string) {
  let resolvedId = shopId;
  const isUUID = shopId.includes('-') && shopId.length === 36;
  if (!isUUID) {
    const { data: s } = await supabaseAdmin.from('shops').select('id').eq('slug', shopId).single();
    if (s?.id) resolvedId = s.id;
  }

  let { data: pages } = await supabaseAdmin
    .from('shop_meta_pages')
    .select('meta_page_id, meta_page_name, meta_page_access_token, meta_user_access_token')
    .eq('shop_id', resolvedId);

  // Fallback to shops table if shop_meta_pages has no entries for this shop yet
  if (!pages || pages.length === 0) {
    const { data: shopRow } = await supabaseAdmin
      .from('shops')
      .select('meta_page_id, meta_page_name, meta_page_access_token')
      .eq('id', resolvedId)
      .single();

    if (shopRow?.meta_page_id && shopRow?.meta_page_access_token) {
      pages = [{
        meta_page_id: shopRow.meta_page_id,
        meta_page_name: shopRow.meta_page_name || 'Primary Page',
        meta_page_access_token: shopRow.meta_page_access_token,
        meta_user_access_token: null,
      }];
    }
  }

  if (!pages || pages.length === 0) {
    return { success: false, error: 'No connected pages found for this shop in database.' };
  }

  const results = await Promise.all(
    pages.map(async (pg) => {
      try {
        const token = pg.meta_user_access_token || pg.meta_page_access_token;
        const res = await fetch(
          `https://graph.facebook.com/v19.0/${pg.meta_page_id}?fields=instagram_business_account,name&access_token=${token}`
        );
        const data = await res.json();
        return {
          pageId: pg.meta_page_id,
          pageName: pg.meta_page_name,
          rawResponse: data,
          instagramBusinessId: data?.instagram_business_account?.id || null,
          error: data?.error?.message || null,
        };
      } catch (e: any) {
        return { pageId: pg.meta_page_id, pageName: pg.meta_page_name, rawResponse: null, instagramBusinessId: null, error: e.message };
      }
    })
  );

  // If any page returned an IG ID, also upsert it
  for (const r of results) {
    if (r.instagramBusinessId) {
      const pg = pages.find(p => p.meta_page_id === r.pageId)!;
      await supabaseAdmin.from('shop_meta_pages').update({
        instagram_business_id: r.instagramBusinessId,
        instagram_access_token: pg.meta_page_access_token,
      }).eq('shop_id', shopId).eq('meta_page_id', r.pageId);
      // Also update primary in shops table for backward compat
      const { data: primaryPage } = await supabaseAdmin.from('shop_meta_pages').select('meta_page_id').eq('shop_id', shopId).eq('is_primary', true).single();
      if (primaryPage?.meta_page_id === r.pageId) {
        await supabaseAdmin.from('shops').update({ instagram_business_id: r.instagramBusinessId, instagram_access_token: pg.meta_page_access_token }).eq('id', shopId);
      }
      revalidatePath('/onboarding');
    }
  }

  return { success: true, results };
}
