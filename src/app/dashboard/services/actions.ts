'use server';

import { supabaseAdmin } from '@/lib/supabase-admin';
import { revalidatePath } from 'next/cache';

export async function upsertService(
  shopId: string,
  service: {
    id?: string;
    name: string;
    description?: string;
    price: number;
    duration_minutes?: number;
    active?: boolean;
  }
) {
  try {
    const payload = {
      shop_id: shopId,
      name: service.name,
      description: service.description || '',
      price: service.price,
      duration_minutes: service.duration_minutes || 60,
      active: service.active !== undefined ? service.active : true,
    };

    if (service.id) {
      const { data, error } = await supabaseAdmin
        .from('services')
        .update(payload)
        .eq('id', service.id)
        .eq('shop_id', shopId)
        .select()
        .single();

      if (error) {
        return { success: false, error: error.message };
      }
      revalidatePath('/dashboard/services');
      return { success: true, data };
    } else {
      const { data, error } = await supabaseAdmin
        .from('services')
        .insert(payload)
        .select()
        .single();

      if (error) {
        return { success: false, error: error.message };
      }
      revalidatePath('/dashboard/services');
      return { success: true, data };
    }
  } catch (err: any) {
    console.error('Error in upsertService:', err);
    return { success: false, error: err.message || 'Failed to save service' };
  }
}

export async function deleteService(shopId: string, serviceId: string) {
  try {
    const { error } = await supabaseAdmin
      .from('services')
      .delete()
      .eq('id', serviceId)
      .eq('shop_id', shopId);

    if (error) {
      return { success: false, error: error.message };
    }
    revalidatePath('/dashboard/services');
    return { success: true };
  } catch (err: any) {
    console.error('Error in deleteService:', err);
    return { success: false, error: err.message || 'Failed to delete service' };
  }
}

export async function toggleServiceActive(shopId: string, serviceId: string, active: boolean) {
  try {
    const { error } = await supabaseAdmin
      .from('services')
      .update({ active })
      .eq('id', serviceId)
      .eq('shop_id', shopId);

    if (error) {
      return { success: false, error: error.message };
    }
    revalidatePath('/dashboard/services');
    return { success: true };
  } catch (err: any) {
    console.error('Error in toggleServiceActive:', err);
    return { success: false, error: err.message || 'Failed to toggle status' };
  }
}
