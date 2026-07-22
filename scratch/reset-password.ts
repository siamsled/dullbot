import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase.auth.admin.updateUserById(
    '12fa227d-de03-4115-a250-714326c52cd3',
    { password: 'password123' }
  );
  if (error) {
    console.error("Error resetting password:", error);
  } else {
    console.log("Password reset successfully for user:", data.user.email);
  }
}

run();
