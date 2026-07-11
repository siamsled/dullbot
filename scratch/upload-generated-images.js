const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '../.env.local');
let supabaseUrl = '';
let supabaseServiceKey = '';

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  for (const line of envContent.split('\n')) {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      const key = match[1];
      let value = match[2] || '';
      if (value.startsWith('"') && value.endsWith('"')) value = value.substring(1, value.length - 1);
      if (key === 'NEXT_PUBLIC_SUPABASE_URL') supabaseUrl = value;
      if (key === 'SUPABASE_SERVICE_ROLE_KEY') supabaseServiceKey = value;
    }
  }
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const imageDirectory = '/Users/shah/.gemini/antigravity-ide/brain/0956d6d7-e9b4-4dbd-8bb2-14ed30baa989/';

const mapping = [
  { prefix: 'jacket_1_biker', sku: 'LJ-BK-001' },
  { prefix: 'jacket_2_bomber', sku: 'LJ-BR-002' },
  { prefix: 'jacket_3_moto', sku: 'LJ-NV-003' },
  { prefix: 'jacket_4_cropped', sku: 'LJ-WR-004' },
  { prefix: 'jacket_5_shearling', sku: 'LJ-AV-005' },
  { prefix: 'jacket_6_suede', sku: 'LJ-SD-006' },
  { prefix: 'jacket_7_trench', sku: 'LJ-TR-007' },
  { prefix: 'jacket_8_cafe', sku: 'LJ-CR-008' },
  { prefix: 'jacket_9_puffer', sku: 'LJ-QP-009' },
  { prefix: 'jacket_10_minimalist', sku: 'LJ-MC-010' }
];

async function run() {
  const files = fs.readdirSync(imageDirectory).filter(f => f.endsWith('.png'));

  for (const item of mapping) {
    const file = files.find(f => f.startsWith(item.prefix));
    if (!file) {
      console.log(`Could not find image for ${item.prefix}`);
      continue;
    }

    const filePath = path.join(imageDirectory, file);
    const buffer = fs.readFileSync(filePath);
    
    // 1. Upload to Supabase Storage
    const fileName = `demo_jackets/${file}`;
    console.log(`Uploading ${fileName}...`);
    
    const { error: uploadError } = await supabase.storage
      .from('product-images')
      .upload(fileName, buffer, {
        contentType: 'image/png',
        upsert: true
      });
      
    if (uploadError) {
      console.error(`Failed to upload ${fileName}:`, uploadError);
      continue;
    }
    
    const { data: { publicUrl } } = supabase.storage.from('product-images').getPublicUrl(fileName);
    
    // 2. Update Database Product
    const { error: dbError } = await supabase
      .from('products')
      .update({ 
        image_url: publicUrl,
        images: [publicUrl]
      })
      .eq('sku', item.sku);
      
    if (dbError) {
      console.error(`Failed to update DB for SKU ${item.sku}:`, dbError);
    } else {
      console.log(`Successfully updated SKU ${item.sku} with beautiful custom jacket image!`);
    }
  }
}

run();
