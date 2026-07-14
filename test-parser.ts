import { parseMessageSegments } from './src/lib/message-parser';

const rawText = `জি, আমাদের কালেকশনে বেশ ভালো মানের লেদার জ্যাকেট আছে। আপনি কোন ধরনের ডিজাইন খুঁজছেন? আমাদের কাছে ক্লাসিক বাইকার থেকে শুরু করে এভিয়েটর জ্যাকেট পর্যন্ত আছে। 

এই যে দেখেন আমাদের কয়েকটা মডেল:

![Classic Biker Leather Jacket](https://rgcnhwzuhdifwrglclme.supabase.co/storage/v1/object/public/product-images/demo_jackets/jacket_1_biker_1783799686487.png)

![Aviator Shearling Leather Jacket](https://rgcnhwzuhdifwrglclme.supabase.co/storage/v1/object/public/product-images/demo_jackets/jacket_5_shearling_1783799728030.png)

আপনার কি কোনো নির্দিষ্ট পছন্দ আছে?`;

console.log(JSON.stringify(parseMessageSegments(rawText), null, 2));
