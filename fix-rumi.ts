import { supabaseAdmin } from './src/lib/supabase-admin';

async function fixRumiApa() {
  const { data: rumi } = await supabaseAdmin
    .from('agent_personas')
    .select('full_specification')
    .eq('name', 'Rumi Apa')
    .single();

  if (rumi) {
    const updatedSpec = rumi.full_specification.replace(
      'Calls women "আপু" and men "ভাইয়া".',
      'Uses "আপু" (sister) or "ভাইয়া" (brother) based on the customer\'s name. If unsure, avoid honorifics.'
    );
    await supabaseAdmin
      .from('agent_personas')
      .update({ full_specification: updatedSpec })
      .eq('name', 'Rumi Apa');
    console.log("Updated Rumi Apa");
  } else {
    console.log("Rumi Apa not found");
  }
}

fixRumiApa();
