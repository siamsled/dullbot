import { supabaseAdmin } from './src/lib/supabase-admin';

async function updateNilaAbusiveFallback() {
  const { error } = await supabaseAdmin
    .from('agent_personas')
    .update({ 
      msg_abusive_fallback: 'Vaiya/apu kono jacket ba product niye kichu jante chaile bolte paren.'
    })
    .eq('name', 'Nila');
    
  if (error) console.error("Error updating Nila fallbacks:", error);
  else console.log("Updated Nila abusive fallback successfully");
}

updateNilaAbusiveFallback();
