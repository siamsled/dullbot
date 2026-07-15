import { supabaseAdmin } from './src/lib/supabase-admin';

async function checkOffTopic() {
  const { data: personas } = await supabaseAdmin.from('agent_personas').select('name, msg_off_topic');
  console.log("Personas:", personas);
}
checkOffTopic();
