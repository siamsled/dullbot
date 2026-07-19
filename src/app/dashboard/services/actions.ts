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
    buffer_minutes?: number;
    requires_resource_type?: string;
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
      buffer_minutes: service.buffer_minutes || 0,
      requires_resource_type: service.requires_resource_type || 'staff',
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

// ─── Resource Management Actions ──────────────────────────────────────────────

export async function upsertResource(
  shopId: string,
  resource: {
    id?: string;
    name: string;
    resource_type: string;
    capacity?: number;
    active?: boolean;
  }
) {
  try {
    const payload = {
      shop_id: shopId,
      name: resource.name,
      resource_type: resource.resource_type,
      capacity: resource.capacity || 1,
      active: resource.active !== undefined ? resource.active : true
    };

    if (resource.id) {
      const { data, error } = await supabaseAdmin
        .from('resources')
        .update(payload)
        .eq('id', resource.id)
        .eq('shop_id', shopId)
        .select()
        .single();
      if (error) return { success: false, error: error.message };
      revalidatePath('/dashboard/services');
      return { success: true, data };
    } else {
      const { data, error } = await supabaseAdmin
        .from('resources')
        .insert(payload)
        .select()
        .single();
      if (error) return { success: false, error: error.message };
      revalidatePath('/dashboard/services');
      return { success: true, data };
    }
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function deleteResource(shopId: string, id: string) {
  try {
    const { error } = await supabaseAdmin
      .from('resources')
      .delete()
      .eq('id', id)
      .eq('shop_id', shopId);
    if (error) return { success: false, error: error.message };
    revalidatePath('/dashboard/services');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function saveAvailabilityRules(
  resourceId: string,
  rules: { day_of_week: number; start_time: string; end_time: string }[]
) {
  try {
    await supabaseAdmin
      .from('availability_rules')
      .delete()
      .eq('resource_id', resourceId);

    if (rules.length > 0) {
      const payload = rules.map(r => ({
        resource_id: resourceId,
        day_of_week: r.day_of_week,
        start_time: r.start_time,
        end_time: r.end_time
      }));

      const { error } = await supabaseAdmin
        .from('availability_rules')
        .insert(payload);
      if (error) return { success: false, error: error.message };
    }

    revalidatePath('/dashboard/services');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function addAvailabilityException(
  resourceId: string,
  exception: {
    date: string;
    is_available: boolean;
    start_time?: string;
    end_time?: string;
  }
) {
  try {
    await supabaseAdmin
      .from('availability_exceptions')
      .delete()
      .eq('resource_id', resourceId)
      .eq('date', exception.date);

    const { data, error } = await supabaseAdmin
      .from('availability_exceptions')
      .insert({
        resource_id: resourceId,
        date: exception.date,
        is_available: exception.is_available,
        start_time: exception.start_time || null,
        end_time: exception.end_time || null
      })
      .select()
      .single();

    if (error) return { success: false, error: error.message };
    revalidatePath('/dashboard/services');
    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function deleteAvailabilityException(exceptionId: string) {
  try {
    const { error } = await supabaseAdmin
      .from('availability_exceptions')
      .delete()
      .eq('id', exceptionId);
    if (error) return { success: false, error: error.message };
    revalidatePath('/dashboard/services');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ─── Booking Management Actions ───────────────────────────────────────────────

export async function createBooking(
  shopId: string,
  booking: {
    resource_id: string;
    service_id: string;
    customer_phone: string;
    customer_name: string;
    party_size?: number;
    starts_at: string;
  }
) {
  try {
    const { data: service } = await supabaseAdmin
      .from('services')
      .select('duration_minutes, buffer_minutes')
      .eq('id', booking.service_id)
      .eq('shop_id', shopId)
      .single();

    if (!service) return { success: false, error: 'Service not found.' };

    const totalMinutes = (service.duration_minutes || 60) + (service.buffer_minutes || 0);
    const startsAt = new Date(booking.starts_at);
    const endsAt = new Date(startsAt.getTime() + totalMinutes * 60 * 1000);

    const { data, error } = await supabaseAdmin
      .from('bookings')
      .insert({
        shop_id: shopId,
        resource_id: booking.resource_id,
        service_id: booking.service_id,
        customer_phone: booking.customer_phone,
        customer_name: booking.customer_name || 'Walk-in Customer',
        party_size: booking.party_size || 1,
        starts_at: startsAt.toISOString(),
        ends_at: endsAt.toISOString(),
        status: 'confirmed'
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23P01') {
        return { success: false, error: 'Overlapping booking: this slot is no longer available.', isOverlap: true };
      }
      return { success: false, error: error.message };
    }

    revalidatePath('/dashboard/services');
    return { success: true, data };
  } catch (err: any) {
    console.error('Error in createBooking:', err);
    return { success: false, error: err.message || 'Failed to create booking' };
  }
}

export async function cancelBooking(shopId: string, bookingId: string) {
  try {
    const { error } = await supabaseAdmin
      .from('bookings')
      .update({ status: 'cancelled' })
      .eq('id', bookingId)
      .eq('shop_id', shopId);

    if (error) return { success: false, error: error.message };
    revalidatePath('/dashboard/services');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function rescheduleBooking(shopId: string, bookingId: string, startsAt: string) {
  try {
    const { data: booking } = await supabaseAdmin
      .from('bookings')
      .select('service_id, resource_id')
      .eq('id', bookingId)
      .eq('shop_id', shopId)
      .single();

    if (!booking) return { success: false, error: 'Booking not found.' };

    const { data: service } = await supabaseAdmin
      .from('services')
      .select('duration_minutes, buffer_minutes')
      .eq('id', booking.service_id)
      .eq('shop_id', shopId)
      .single();

    if (!service) return { success: false, error: 'Service not found.' };

    const totalMinutes = (service.duration_minutes || 60) + (service.buffer_minutes || 0);
    const newStart = new Date(startsAt);
    const newEnd = new Date(newStart.getTime() + totalMinutes * 60 * 1000);

    const { error } = await supabaseAdmin
      .from('bookings')
      .update({
        starts_at: newStart.toISOString(),
        ends_at: newEnd.toISOString()
      })
      .eq('id', bookingId)
      .eq('shop_id', shopId);

    if (error) {
      if (error.code === '23P01') {
        return { success: false, error: 'Reschedule conflict: this slot overlaps with an existing booking.', isOverlap: true };
      }
      return { success: false, error: error.message };
    }

    revalidatePath('/dashboard/services');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function updateBookingStatus(shopId: string, bookingId: string, status: string) {
  try {
    const { error } = await supabaseAdmin
      .from('bookings')
      .update({ status })
      .eq('id', bookingId)
      .eq('shop_id', shopId);

    if (error) return { success: false, error: error.message };
    revalidatePath('/dashboard/services');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ─── Slot Availability Calculation Engine ─────────────────────────────────────

export async function getAvailableSlots(
  shopId: string,
  serviceId: string,
  dateStr: string,
  partySize: number = 1
) {
  try {
    const { data: service } = await supabaseAdmin
      .from('services')
      .select('id, name, duration_minutes, buffer_minutes, requires_resource_type')
      .eq('id', serviceId)
      .eq('shop_id', shopId)
      .single();

    if (!service) return { success: false, error: 'Service not found.' };

    const resourceType = service.requires_resource_type || 'staff';
    const duration = service.duration_minutes || 60;
    const buffer = service.buffer_minutes || 0;
    const totalNeededMinutes = duration + buffer;

    let query = supabaseAdmin
      .from('resources')
      .select('id, name, capacity')
      .eq('shop_id', shopId)
      .eq('resource_type', resourceType)
      .eq('active', true);

    if (resourceType === 'table') {
      query = query.gte('capacity', partySize);
    }

    const { data: resources } = await query;
    if (!resources || resources.length === 0) {
      return { success: true, slots: [] };
    }

    if (resourceType === 'table') {
      resources.sort((a, b) => a.capacity - b.capacity);
    }

    const resourceIds = resources.map(r => r.id);

    const parsedDate = new Date(dateStr);
    const dayOfWeek = parsedDate.getDay();

    const { data: rules } = await supabaseAdmin
      .from('availability_rules')
      .select('*')
      .in('resource_id', resourceIds)
      .eq('day_of_week', dayOfWeek);

    const { data: exceptions } = await supabaseAdmin
      .from('availability_exceptions')
      .select('*')
      .in('resource_id', resourceIds)
      .eq('date', dateStr);

    const startOfDay = new Date(`${dateStr}T00:00:00+06:00`).toISOString();
    const endOfDay = new Date(`${dateStr}T23:59:59+06:00`).toISOString();

    const { data: bookings } = await supabaseAdmin
      .from('bookings')
      .select('resource_id, starts_at, ends_at')
      .in('resource_id', resourceIds)
      .eq('status', 'confirmed')
      .gte('ends_at', startOfDay)
      .lte('starts_at', endOfDay);

    const availableSlots: { time: string; resourceId: string; resourceName: string }[] = [];

    for (const res of resources) {
      const resExceptions = exceptions?.filter(e => e.resource_id === res.id) || [];
      const resRules = rules?.filter(r => r.resource_id === res.id) || [];
      const resBookings = bookings?.filter(b => b.resource_id === res.id) || [];

      let isAvailable = false;
      let startHoursStr = '09:00:00';
      let endHoursStr = '20:00:00';

      const exception = resExceptions[0];
      if (exception) {
        isAvailable = exception.is_available;
        if (isAvailable && exception.start_time && exception.end_time) {
          startHoursStr = exception.start_time;
          endHoursStr = exception.end_time;
        }
      } else if (resRules.length > 0) {
        isAvailable = true;
        startHoursStr = resRules[0].start_time;
        endHoursStr = resRules[0].end_time;
      }

      if (!isAvailable) continue;

      const [startH, startM] = startHoursStr.split(':').map(Number);
      const [endH, endM] = endHoursStr.split(':').map(Number);

      const startTimeMin = startH * 60 + startM;
      const endTimeMin = endH * 60 + endM;

      for (let timeMin = startTimeMin; timeMin + duration <= endTimeMin; timeMin += 30) {
        const slotH = Math.floor(timeMin / 60);
        const slotM = timeMin % 60;
        const timeString = `${slotH.toString().padStart(2, '0')}:${slotM.toString().padStart(2, '0')}`;

        const slotStart = new Date(`${dateStr}T${timeString}:00+06:00`);
        const slotEnd = new Date(slotStart.getTime() + totalNeededMinutes * 60 * 1000);

        const overlaps = resBookings.some(b => {
          const bStart = new Date(b.starts_at).getTime();
          const bEnd = new Date(b.ends_at).getTime();
          return slotStart.getTime() < bEnd && slotEnd.getTime() > bStart;
        });

        if (!overlaps) {
          availableSlots.push({
            time: timeString,
            resourceId: res.id,
            resourceName: res.name
          });
        }
      }
    }

    availableSlots.sort((a, b) => a.time.localeCompare(b.time));

    return { success: true, slots: availableSlots };
  } catch (err: any) {
    console.error('Error calculating available slots:', err);
    return { success: false, error: err.message || 'Failed to calculate slots' };
  }
}
