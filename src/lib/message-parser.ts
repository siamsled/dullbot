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
