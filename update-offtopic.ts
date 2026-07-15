import { supabaseAdmin } from './src/lib/supabase-admin';

async function updateOffTopic() {
  const updates = [
    { name: 'Biplob Uncle', msg: 'আচ্ছা, আমরা বরং কাজের কথায় আসি। প্রোডাক্ট নিয়ে কোনো প্রশ্ন থাকলে বলতে পারেন।' },
    { name: 'Shuvo "Bhai" Ahmed', msg: 'হা হা, ভাই আমরা তো প্রোডাক্ট নিয়েই আছি। প্রোডাক্ট নিয়ে কিছু জানার থাকলে বলেন।' },
    { name: 'Nila', msg: 'Haha thanks! But amra mainly product niyei kotha boli, kono kichu janar thakle bolte paren.' },
    { name: 'Tanim "Problem Solver"', msg: 'অসংখ্য ধন্যবাদ। তবে আপনার যদি কোনো অর্ডার বা সমস্যা নিয়ে কথা বলার থাকে, আমি সাহায্য করতে পারি।' },
    { name: 'Jisan', msg: 'Haha thik ache. But kono product lagle amake janate paren.' },
    { name: 'Sharmin Apa', msg: 'অনেক ধন্যবাদ! তবে আপনার কোনো কিছু পছন্দ হলে বা দরকার হলে জানাবেন, আমি সেভাবে তৈরি করে দিতাম।' }
  ];

  for (const u of updates) {
    const { error } = await supabaseAdmin
      .from('agent_personas')
      .update({ msg_off_topic: u.msg })
      .eq('name', u.name);
      
    if (error) console.error(`Error updating ${u.name}:`, error);
    else console.log(`Updated ${u.name}`);
  }
}

updateOffTopic();
