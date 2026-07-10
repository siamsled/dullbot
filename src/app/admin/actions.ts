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
