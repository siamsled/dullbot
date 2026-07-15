import { supabaseAdmin } from './src/lib/supabase-admin';

async function updateNilaFallbacks() {
  const { error } = await supabaseAdmin
    .from('agent_personas')
    .update({ 
      msg_escalation: 'Wait, amader senior ekjon asche help korar jonno.',
      msg_abusive_fallback: 'Vaiya/apu amra ekhane just product niye kotha boli, kindly language ta ektu thik rakhle bhalo hoy.'
    })
    .eq('name', 'Nila');
    
  if (error) console.error("Error updating Nila fallbacks:", error);
  else console.log("Updated Nila fallbacks successfully");
}

updateNilaFallbacks();
