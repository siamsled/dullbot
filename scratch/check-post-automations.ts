import { supabaseAdmin } from '../src/lib/supabase-admin';

async function checkTable() {
  const { data, error } = await supabaseAdmin
    .from('post_automations')
    .select('*')
    .limit(1);

  console.log('post_automations select result:', { data, error });

  const { data: commentsData, error: commentsError } = await supabaseAdmin
    .from('post_comments')
    .select('*')
    .limit(1);

  console.log('post_comments select result:', { commentsData, commentsError });
}

checkTable().catch(console.error);
