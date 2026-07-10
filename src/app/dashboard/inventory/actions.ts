'use server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { revalidatePath } from 'next/cache';

const SHOP_SLUG = 'dull-store';

async function getShopId() {
  const { data } = await supabaseAdmin.from('shops').select('id').eq('slug', SHOP_SLUG).single();
  return data?.id;
}

export async function approveProduct(productId: string) {
  await supabaseAdmin.from('products').update({ draft: false, is_active: true }).eq('id', productId);
  revalidatePath('/dashboard/inventory');
}

export async function rejectProduct(productId: string) {
  await supabaseAdmin.from('products').delete().eq('id', productId);
  revalidatePath('/dashboard/inventory');
}

export async function toggleProductActive(productId: string, isActive: boolean) {
  await supabaseAdmin.from('products').update({ is_active: !isActive }).eq('id', productId);
  revalidatePath('/dashboard/inventory');
}

export async function addProduct(data: {
  name: string;
  description: string;
  price: number;
  stock_quantity: number;
  currency: string;
}) {
  const shopId = await getShopId();
  if (!shopId) return { error: 'Shop not found' };
  await supabaseAdmin.from('products').insert({ ...data, shop_id: shopId, source: 'manual', draft: false, is_active: true });
  revalidatePath('/dashboard/inventory');
  return { success: true };
}

export async function updateStock(productId: string, stock_quantity: number) {
  await supabaseAdmin.from('products').update({ stock_quantity }).eq('id', productId);
  revalidatePath('/dashboard/inventory');
}
