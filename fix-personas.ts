import { supabaseAdmin } from './src/lib/supabase-admin';

async function fixPersonas() {
  await supabaseAdmin.from('agent_personas')
    .update({ disclosure_line: 'সত্যি বলতে আমি AI, মানুষ না। কিন্তু দোকানের সব খবর আমার কাছে আছে, ইনশাআল্লাহ ঠিকমতোই সাহায্য করব।' })
    .eq('name', 'Sharmin Apa');
    
  console.log("Updated remote personas successfully.");
}

fixPersonas();
