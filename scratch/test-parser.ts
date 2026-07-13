const aiResponseText = `জি, Classic Biker Leather Jacket আমাদের স্টকে আছে। এটা ১০০% জেনুইন ফুল-গ্রেইন লেদার দিয়ে তৈরি।

![Classic Biker Leather Jacket](https://rgcnhwzuhdifwrglclme.supabase.co/storage/v1/object/public/product-images/demo_jackets/jacket_1_biker_1783799686487.png)

|||

আপনি কি এটা রেগুলার ক্যাজুয়াল আউটফিটের সাথে পরার জন্য দেখছেন?`;

const markdownImageSplitRegex = /(!\[.*?\]\(.*?\))/g;
const markdownImageExtractRegex = /!\[.*?\]\((.*?)\)/;

const cleanedText = aiResponseText.trim();
const chunks = cleanedText ? cleanedText.split('|||').map(s => s.trim()).filter(Boolean) : [];

const segments: { type: 'text' | 'image', content: string }[] = [];
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

console.log(segments);
