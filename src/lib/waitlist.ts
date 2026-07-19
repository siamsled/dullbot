import { supabaseAdmin } from './supabase-admin';

/**
 * Service to manage daily serial number queue waitlist tracking.
 */

export async function joinQueue(
  shopId: string,
  resourceId: string | null,
  customerPhone: string,
  customerName: string
) {
  try {
    // 1. Get today's start and end timestamps in UTC+6 local day
    const dateStr = new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString().split('T')[0];
    const startOfDay = new Date(`${dateStr}T00:00:00+06:00`).toISOString();
    const endOfDay = new Date(`${dateStr}T23:59:59+06:00`).toISOString();

    // 2. Count today's entries to compute next serial number
    let query = supabaseAdmin
      .from('serial_queue')
      .select('id', { count: 'exact', head: true })
      .eq('shop_id', shopId)
      .gte('joined_at', startOfDay)
      .lte('joined_at', endOfDay);

    if (resourceId) {
      query = query.eq('resource_id', resourceId);
    }

    const { count, error: countErr } = await query;
    if (countErr) throw new Error(countErr.message);

    const nextSerial = (count || 0) + 1;

    // 3. Insert queue entry
    const { data, error } = await supabaseAdmin
      .from('serial_queue')
      .insert({
        shop_id: shopId,
        resource_id: resourceId || null,
        serial_number: nextSerial,
        customer_phone: customerPhone,
        customer_name: customerName || 'Walk-in Guest',
        status: 'waiting'
      })
      .select()
      .single();

    if (error) throw new Error(error.message);

    return { success: true, data };
  } catch (err: any) {
    console.error('Error in joinQueue:', err);
    return { success: false, error: err.message || 'Failed to join waitlist' };
  }
}

export async function callNextInQueue(shopId: string, resourceId: string | null) {
  try {
    // 1. Mark current being_served entries as completed
    let finishQuery = supabaseAdmin
      .from('serial_queue')
      .update({ status: 'completed' })
      .eq('shop_id', shopId)
      .eq('status', 'being_served');

    if (resourceId) {
      finishQuery = finishQuery.eq('resource_id', resourceId);
    }
    
    await finishQuery;

    // 2. Find next waiting entry (oldest joined_at first)
    const dateStr = new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString().split('T')[0];
    const startOfDay = new Date(`${dateStr}T00:00:00+06:00`).toISOString();
    
    let nextQuery = supabaseAdmin
      .from('serial_queue')
      .select('*')
      .eq('shop_id', shopId)
      .eq('status', 'waiting')
      .gte('joined_at', startOfDay)
      .order('joined_at', { ascending: true })
      .limit(1);

    if (resourceId) {
      nextQuery = nextQuery.eq('resource_id', resourceId);
    }

    const { data: nextList, error: nextErr } = await nextQuery;
    if (nextErr) throw new Error(nextErr.message);

    if (!nextList || nextList.length === 0) {
      return { success: true, called: null }; // Queue is empty
    }

    const nextEntry = nextList[0];

    // 3. Update next entry to being_served
    const { data, error } = await supabaseAdmin
      .from('serial_queue')
      .update({
        status: 'being_served',
        called_at: new Date().toISOString()
      })
      .eq('id', nextEntry.id)
      .select()
      .single();

    if (error) throw new Error(error.message);

    return { success: true, called: data };
  } catch (err: any) {
    console.error('Error in callNextInQueue:', err);
    return { success: false, error: err.message || 'Failed to call next' };
  }
}

export async function getWaitTimeEstimate(shopId: string, resourceId: string | null, customerPhone: string) {
  try {
    const dateStr = new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString().split('T')[0];
    const startOfDay = new Date(`${dateStr}T00:00:00+06:00`).toISOString();

    // 1. Find customer's active waiting queue entry
    let userQuery = supabaseAdmin
      .from('serial_queue')
      .select('*')
      .eq('shop_id', shopId)
      .eq('customer_phone', customerPhone)
      .eq('status', 'waiting')
      .gte('joined_at', startOfDay)
      .order('joined_at', { ascending: false })
      .limit(1);

    if (resourceId) {
      userQuery = userQuery.eq('resource_id', resourceId);
    }

    const { data: userList } = await userQuery;
    if (!userList || userList.length === 0) {
      return { success: false, error: 'You do not have an active waiting spot in the queue.' };
    }

    const customerEntry = userList[0];

    // 2. Count waiting entries in front of this customer (older joined_at)
    let frontQuery = supabaseAdmin
      .from('serial_queue')
      .select('id', { count: 'exact', head: true })
      .eq('shop_id', shopId)
      .eq('status', 'waiting')
      .gte('joined_at', startOfDay)
      .lt('joined_at', customerEntry.joined_at);

    if (resourceId) {
      frontQuery = frontQuery.eq('resource_id', resourceId);
    }

    const { count: waitingAhead } = await frontQuery;

    // 3. Check if there is someone currently being served
    let activeQuery = supabaseAdmin
      .from('serial_queue')
      .select('id', { count: 'exact', head: true })
      .eq('shop_id', shopId)
      .eq('status', 'being_served')
      .gte('joined_at', startOfDay);

    if (resourceId) {
      activeQuery = activeQuery.eq('resource_id', resourceId);
    }

    const { count: servingCount } = await activeQuery;

    // Position in queue = waiting ahead + active serving (if any)
    const position = (waitingAhead || 0) + (servingCount || 0);

    // 4. Estimate wait time: average service duration
    // Let's query the first service's duration or default to 20 minutes
    const { data: services } = await supabaseAdmin
      .from('services')
      .select('duration_minutes')
      .eq('shop_id', shopId)
      .eq('active', true)
      .limit(1);

    const avgDuration = services && services.length > 0 ? (services[0].duration_minutes || 20) : 20;
    const estimateMinutes = position * avgDuration;

    return {
      success: true,
      serial_number: customerEntry.serial_number,
      position,
      minutes: estimateMinutes
    };
  } catch (err: any) {
    console.error('Error in getWaitTimeEstimate:', err);
    return { success: false, error: err.message };
  }
}
