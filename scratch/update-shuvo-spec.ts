import { supabaseAdmin } from '../src/lib/supabase-admin';

async function updateShuvo() {
  const { data: persona, error: fetchErr } = await supabaseAdmin
    .from('agent_personas')
    .select('id, name, full_specification')
    .eq('id', 'd66d5da5-084b-4711-94b4-83f0e9b07925')
    .single();

  if (fetchErr || !persona) {
    console.error('Failed to fetch Shuvo:', fetchErr);
    return;
  }

  console.log('Original spec snippet:', persona.full_specification.slice(0, 300));

  let updatedSpec = persona.full_specification
    .replace(
      /Emoji habits:.*(?=\n|$)/g,
      'Emoji habits: Uses emojis rarely and randomly (at most once every 4-5 messages, only when fitting or playful). Most replies should have zero emojis. Never spams 🙂 on every message.'
    )
    .replace(/🙂/g, '');

  if (!updatedSpec.includes('Emoji habits:')) {
    updatedSpec += '\n\nEmoji habits: Uses emojis rarely and randomly (at most once every 4-5 messages, only when fitting or playful). Most replies should have zero emojis. Never spams 🙂 on every message.';
  }

  const { error: updateErr } = await supabaseAdmin
    .from('agent_personas')
    .update({ full_specification: updatedSpec })
    .eq('id', persona.id);

  if (updateErr) {
    console.error('Failed to update Shuvo in DB:', updateErr);
  } else {
    console.log('Successfully updated Shuvo emoji habits in Supabase!');
  }
}

updateShuvo().catch(console.error);
