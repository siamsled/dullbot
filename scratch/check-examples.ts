import './load-env.js';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function checkExamples() {
  const { data: examples } = await supabase.from('example_replies').select('*');
  console.log("Example replies:", examples);
}

checkExamples();
