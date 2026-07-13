export function parseMessageSegments(content: string): { type: 'text' | 'image' | 'audio', content: string }[] {
  if (!content) return [];
  if (content.startsWith('IMAGE:')) return [{ type: 'image', content: content.substring(6) }];
  if (content.startsWith('AUDIO:')) return [{ type: 'audio', content: content.substring(6) }];

  const markdownImageSplitRegex = /(!\[.*?\]\(.*?\))/g;
  const markdownImageExtractRegex = /!\[.*?\]\((.*?)\)/;
  
  const cleanedText = content.trim();
  const chunks = cleanedText ? cleanedText.split('|||').map(s => s.trim()).filter(Boolean) : [];
  
  const segments: { type: 'text' | 'image' | 'audio', content: string }[] = [];
  for (const chunk of chunks) {
    const parts = chunk.split(markdownImageSplitRegex);
    for (const part of parts) {
      if (!part) continue;
      
      const imgMatch = part.match(markdownImageExtractRegex);
      if (imgMatch) {
        segments.push({ type: 'image', content: imgMatch[1] });
      } else {
        const trimmedText = part.trim();
        if (trimmedText) {
          segments.push({ type: 'text', content: trimmedText });
        }
      }
    }
  }
  return segments;
}

const res = parseMessageSegments(`আছে ভাই, স্টকেই আছে। 🙂 এইটা আমাদের সবচেয়ে ক্লাসিক আর পপুলার কালেকশন। ১০০% জেনুইন ফুল-গ্রেইন লেদার দিয়ে বানানো, কোয়ালিটি নিয়ে একদম চিন্তা করবেন না, প্রিমিয়াম ফিল পাবেন। ||| ![Classic Biker Leather Jacket](https://rgcnhwzuhdifwrglclme.supabase.co/storage/v1/object/public/product-images/demo_jackets/jacket_1_biker_1783799686487.png) ঝামেলা নাই, এইটা নিলে ঠকবেন না। বাজেট কত ভাবছেন বা অন্য কোনো কনফিউশন আছে? দামী জিনিস তো, একটু ভালো করে দেখে নিতে পারেন। 👍`);

console.log(res);
