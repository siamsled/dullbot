import { supabaseAdmin } from './src/lib/supabase-admin';

async function updateNila() {
  const { error } = await supabaseAdmin
    .from('agent_personas')
    .update({ msg_off_topic: 'Haha temon kichu na, specific kono product niye kichu janar thakle bolte paren.' })
    .eq('name', 'Nila');
    
  if (error) console.error("Error updating Nila:", error);
  else console.log("Updated Nila successfully");
}

updateNila();
