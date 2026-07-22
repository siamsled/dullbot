import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log("Checking buckets...");
  const { data: buckets, error } = await supabase.storage.listBuckets();
  if (error) {
    console.error("Error listing buckets:", error.message);
    return;
  }
  console.log("Buckets:", buckets.map(b => ({ name: b.name, public: b.public })));

  const bucket = buckets.find(b => b.name === 'product-images');
  if (!bucket) {
    console.log("Bucket 'product-images' does NOT exist!");
    console.log("Creating bucket 'product-images'...");
    const { data, error: createError } = await supabase.storage.createBucket('product-images', { public: true });
    if (createError) console.error("Error creating bucket:", createError.message);
    else console.log("Created bucket 'product-images' successfully!");
  } else {
    console.log("'product-images' bucket exists! Public status:", bucket.public);
    if (!bucket.public) {
      console.log("Bucket is NOT public! Updating to public...");
      await supabase.storage.updateBucket('product-images', { public: true });
      console.log("Updated bucket to public!");
    }
  }
}

run();
