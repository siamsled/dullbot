import { supabaseAdmin } from './supabase-admin';
import { createBooking, getAvailableSlots } from '../app/dashboard/services/actions';
import { invokeGemini } from './gemini';

export interface BookingPayload {
  service_id: string;
  starts_at: string;
  customer_name: string;
  customer_phone: string;
  party_size?: number;
}

export async function handleBookingCreationIntercept(
  conversationId: string,
  shopId: string,
  aiText: string
): Promise<{ cleanedText: string; bookingId: string | null; isOverlap: boolean }> {
  const bookingRegex = /\[CREATE_BOOKING:\s*(\{[\s\S]*?\})\]/;
  const match = aiText.match(bookingRegex);

  if (!match) {
    return { cleanedText: aiText, bookingId: null, isOverlap: false };
  }

  const jsonString = match[1];
  const cleanedText = aiText.replace(bookingRegex, '').trim();

  try {
    const payload: BookingPayload = JSON.parse(jsonString);
    console.log(`[BOOKING INTERCEPT] parsed booking payload for conversation ${conversationId}:`, payload);

    // 1. Fetch service details
    const { data: service } = await supabaseAdmin
      .from('services')
      .select('id, name, duration_minutes, buffer_minutes, requires_resource_type')
      .eq('id', payload.service_id)
      .eq('shop_id', shopId)
      .single();

    if (!service) {
      console.warn(`[BOOKING INTERCEPT] Service ID ${payload.service_id} not found.`);
      return { cleanedText, bookingId: null, isOverlap: false };
    }

    const partySize = payload.party_size || 1;
    const dateStr = payload.starts_at.split('T')[0]; // YYYY-MM-DD

    // 2. Fetch available slots for this date to select a free resource
    const slotsRes = await getAvailableSlots(shopId, service.id, dateStr, partySize);
    if (!slotsRes.success || !slotsRes.slots || slotsRes.slots.length === 0) {
      console.warn(`[BOOKING INTERCEPT] No slots available on date ${dateStr}.`);
      return { cleanedText: await generateApologyText(shopId, service.name, payload.starts_at, []), bookingId: null, isOverlap: true };
    }

    // Try to find the slot corresponding to payload.starts_at time
    // starts_at is ISO string. Let's convert to local time time-string (HH:MM)
    const targetDate = new Date(payload.starts_at);
    const targetH = targetDate.getHours().toString().padStart(2, '0');
    const targetM = targetDate.getMinutes().toString().padStart(2, '0');
    const targetTimeStr = `${targetH}:${targetM}`;

    const matchingSlots = slotsRes.slots.filter(s => s.time === targetTimeStr);

    if (matchingSlots.length === 0) {
      console.warn(`[BOOKING INTERCEPT] Slot at ${targetTimeStr} is not available.`);
      // Generate apology with other available slots on the same day
      const altTimes = slotsRes.slots.slice(0, 3).map(s => s.time);
      const apology = await generateApologyText(shopId, service.name, targetTimeStr, altTimes);
      return { cleanedText: apology, bookingId: null, isOverlap: true };
    }

    // Pick the first free resource for this slot
    const chosenResource = matchingSlots[0];

    // 3. Create the booking
    const bookingRes = await createBooking(shopId, {
      resource_id: chosenResource.resourceId,
      service_id: service.id,
      customer_phone: payload.customer_phone,
      customer_name: payload.customer_name,
      party_size: partySize,
      starts_at: payload.starts_at
    });

    if (bookingRes.success && bookingRes.data) {
      console.log(`[BOOKING INTERCEPT] successfully created booking ID: ${bookingRes.data.id}`);
      return { cleanedText, bookingId: bookingRes.data.id, isOverlap: false };
    } else if (bookingRes.isOverlap) {
      console.warn(`[BOOKING INTERCEPT] Overlap detected during createBooking database exclusion constraint.`);
      // Generate alternatives
      const altTimes = slotsRes.slots.filter(s => s.time !== targetTimeStr).slice(0, 3).map(s => s.time);
      const apology = await generateApologyText(shopId, service.name, targetTimeStr, altTimes);
      return { cleanedText: apology, bookingId: null, isOverlap: true };
    } else {
      console.error('[BOOKING INTERCEPT] failed to create booking:', bookingRes.error);
      return { cleanedText, bookingId: null, isOverlap: false };
    }

  } catch (err) {
    console.error('[BOOKING INTERCEPT] error parsing booking json:', err);
    return { cleanedText, bookingId: null, isOverlap: false };
  }
}

// Generate natural apology via Gemini
async function generateApologyText(
  shopId: string,
  serviceName: string,
  takenTime: string,
  altTimes: string[]
): Promise<string> {
  const { data: shop } = await supabaseAdmin
    .from('shops')
    .select('name, persona_id, persona_custom_name')
    .eq('id', shopId)
    .single();

  let personaText = 'Use a warm, native Bangladeshi shopkeeper tone.';
  if (shop?.persona_id) {
    const { data: persona } = await supabaseAdmin
      .from('agent_personas')
      .select('*')
      .eq('id', shop.persona_id)
      .single();
    if (persona) {
      personaText = `Persona details: Name: ${shop.persona_custom_name || persona.name}. job: ${persona.job_function}. Style: ${persona.language_style}. Character details: ${persona.full_specification}`;
    }
  }

  const timesList = altTimes.length > 0 ? altTimes.join(', ') : 'any other slot tomorrow';
  const prompt = `You are an AI sales assistant for ${shop?.name || 'our shop'}.
${personaText}

A customer tried to book the service "${serviceName}" at "${takenTime}", but that slot was just booked by another client a second ago.
Please write a very brief, friendly, natural reply in your persona voice:
1. Apologize that the ${takenTime} slot was just taken.
2. Politely suggest these alternative times: [${timesList}].
3. Ask if any of these work for them.
4. Keep it short (max 2 sentences). Do not repeat phrases.`;

  const res = await invokeGemini(prompt, 'A slot collision occurred.', []);
  if (res.success && res.text) {
    return res.text.trim();
  }
  return `Sorry, the slot at ${takenTime} was just booked by someone else. Would you like to select another time?`;
}
