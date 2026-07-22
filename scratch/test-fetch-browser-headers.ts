async function test() {
  const url = "https://rgcnhwzuhdifwrglclme.supabase.co/storage/v1/object/public/product-images/84ca459f-b9e3-455d-ab6f-fdb5395c5096/1784698238969-6ald5wo6ets.webp";
  
  console.log("Testing fetch with browser headers...");
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
      'Referer': 'http://localhost:3000/',
      'Sec-Fetch-Dest': 'image',
      'Sec-Fetch-Mode': 'no-cors',
      'Sec-Fetch-Site': 'cross-site'
    }
  });

  console.log("Status:", res.status, res.statusText);
  console.log("Headers:", Object.fromEntries(res.headers.entries()));
}

test();
