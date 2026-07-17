'use server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { revalidatePath } from 'next/cache';

export async function addCreditsAdmin(shopId: string, amount: number) {
  // Add to shop credit balance
  const { data: shop, error: shopErr } = await supabaseAdmin
    .from('shops')
    .select('credit_balance')
    .eq('id', shopId)
    .single();

  if (shopErr || !shop) return { success: false, error: 'Shop not found' };

  await supabaseAdmin
    .from('shops')
    .update({ credit_balance: (shop.credit_balance || 0) + amount })
    .eq('id', shopId);

  // Log a manual admin topup (using 0 taka as it's an admin grant)
  await supabaseAdmin
    .from('credit_topups')
    .insert({
      shop_id: shopId,
      amount_taka: 0,
      credits_granted: amount,
      payment_method: 'admin_grant',
      trx_id: `admin_${Date.now()}`,
      verified: true
    });

  revalidatePath('/admin');
  return { success: true };
}

/**
 * Fetches secure configuration status details for support overview.
 */
export async function getShopDetails(shopId: string) {
  const { data: shop, error } = await supabaseAdmin
    .from('shops')
    .select('id, name, slug, payment_verification_method, bkash_config_encrypted, nagad_config_encrypted, courier_provider, courier_config_encrypted, meta_page_name, agent_enabled')
    .eq('id', shopId)
    .single();

  if (error || !shop) {
    return { success: false, error: error?.message || 'Shop not found' };
  }

  // Decrypt and mask credential details for visual confirmation
  const mask = (str?: string) => str ? `${str.slice(0, 4)}***${str.slice(-4)}` : 'Not Configured';

  const { decrypt } = await import('@/lib/encryption');
  let bkashStatus = 'Not Configured';
  if (shop.bkash_config_encrypted) {
    const dec = JSON.parse(decrypt(shop.bkash_config_encrypted) || '{}');
    bkashStatus = dec.username ? `Configured (Username: ${dec.username}, Sandbox: ${dec.sandbox})` : 'Configured';
  }

  let nagadStatus = 'Not Configured';
  if (shop.nagad_config_encrypted) {
    const dec = JSON.parse(decrypt(shop.nagad_config_encrypted) || '{}');
    nagadStatus = dec.merchant_id ? `Configured (Merchant ID: ${dec.merchant_id})` : 'Configured';
  }

  let courierStatus = 'Not Configured';
  if (shop.courier_config_encrypted) {
    const dec = JSON.parse(decrypt(shop.courier_config_encrypted) || '{}');
    courierStatus = dec.username || dec.api_key ? `Configured (${shop.courier_provider})` : 'Configured';
  }

  return {
    success: true,
    details: {
      id: shop.id,
      name: shop.name,
      slug: shop.slug,
      meta_page_name: shop.meta_page_name || 'Not Connected',
      payment_method: shop.payment_verification_method,
      agent_enabled: shop.agent_enabled,
      bkashStatus,
      nagadStatus,
      courierStatus,
      courier_provider: shop.courier_provider || 'None'
    }
  };
}

/**
 * Manually confirm or reject a pending verification order.
 */
export async function manuallyResolvePayment(
  pvId: string,
  orderId: string,
  shopId: string,
  status: 'confirmed' | 'failed'
) {
  try {
    const dbStatus = status === 'confirmed' ? 'confirmed' : 'failed';
    const orderStatus = status === 'confirmed' ? 'confirmed' : 'rejected';

    // 1. Update verification
    await supabaseAdmin
      .from('payment_verifications')
      .update({
        status: dbStatus,
        confirmed_at: dbStatus === 'confirmed' ? new Date().toISOString() : null
      })
      .eq('id', pvId);

    // 2. Update order
    await supabaseAdmin
      .from('orders')
      .update({
        status: orderStatus,
        confirmed_at: dbStatus === 'confirmed' ? new Date().toISOString() : null,
        bkash_transaction_id: `MANUAL_ADMIN_${Date.now()}`
      })
      .eq('id', orderId);

    if (dbStatus === 'confirmed') {
      // Trigger stock decrement
      const { data: order } = await supabaseAdmin.from('orders').select('product_id, variant_id').eq('id', orderId).single();
      if (order) {
        await supabaseAdmin.rpc('decrement_stock', {
          p_product_id: order.product_id,
          p_variant_id: order.variant_id || null,
          p_shop_id: shopId,
          p_note: `Manual admin override confirmation`
        });
      }

      // Trigger courier booking
      const { triggerCourierShipment } = await import('@/lib/courier');
      await triggerCourierShipment(orderId, shopId);
    }

    // 3. Log compliance audit log
    await supabaseAdmin
      .from('audit_logs')
      .insert({
        action: `manual_payment_${status}`,
        target_shop_id: shopId,
        metadata: { orderId, pvId, resolved_at: new Date().toISOString() }
      });

    revalidatePath('/admin');
    return { success: true };
  } catch (err: any) {
    console.error('Manual payment override failed:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Retrieves full conversation messages and logs intervention access entry.
 */
export async function getConversationMessagesAdmin(conversationId: string, shopId: string) {
  // Log access audit log
  await supabaseAdmin
    .from('audit_logs')
    .insert({
      action: 'remote_intervention_access',
      target_shop_id: shopId,
      target_conversation_id: conversationId,
      metadata: { accessed_at: new Date().toISOString() }
    });

  const { data: messages, error } = await supabaseAdmin
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });

  if (error) return { success: false, error: error.message };
  return { success: true, messages };
}

/**
 * Sends a response message on behalf of the bot during manual intervention.
 */
export async function sendInterventionReply(conversationId: string, shopId: string, text: string) {
  try {
    // 1. Fetch shop page access token and conversation target customer phone (PSID)
    const { data: shop } = await supabaseAdmin.from('shops').select('slug, meta_page_access_token').eq('id', shopId).single();
    const { data: conv } = await supabaseAdmin.from('conversations').select('customer_phone').eq('id', conversationId).single();

    if (!shop || !conv) throw new Error('Shop or Conversation not found.');

    // 2. Insert message into DB
    await supabaseAdmin
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender: 'bot',
        content: text
      });

    // 3. Send message via Meta API if connected, or mock it
    const { sendMetaMessage } = await import('@/lib/meta-api');
    await sendMetaMessage(conv.customer_phone, text, shop.slug);

    // 4. Log sending audit log
    await supabaseAdmin
      .from('audit_logs')
      .insert({
        action: 'remote_intervention_reply',
        target_shop_id: shopId,
        target_conversation_id: conversationId,
        metadata: { text, sent_at: new Date().toISOString() }
      });

    return { success: true };
  } catch (err: any) {
    console.error('Failed to send remote intervention reply:', err);
    return { success: false, error: err.message };
  }
}
