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

export function extractReplyContext(content: string): { quotedText: string | null; actualContent: string } {
  if (!content) return { quotedText: null, actualContent: '' };

  // Match 1: Customer replying to Bot: [Customer is replying to the following specific message from you: "..."] Customer's response: ...
  const match1 = content.match(/^\[Customer is replying to the following specific message from you: "([\s\S]*?)"\]\n*Customer's response: ([\s\S]*)$/);
  if (match1) {
    return { quotedText: match1[1], actualContent: match1[2] };
  }

  // Match 2: [Replying to bot's message: "..."] ...
  const match2 = content.match(/^\[Replying to bot's message: "([\s\S]*?)"\]\s*([\s\S]*)$/);
  if (match2) {
    return { quotedText: match2[1], actualContent: match2[2] };
  }

  // Match 3: [Replying to: "..."] ...
  const match3 = content.match(/^\[Replying to: "([\s\S]*?)"\]\s*([\s\S]*)$/);
  if (match3) {
    return { quotedText: match3[1], actualContent: match3[2] };
  }

  return { quotedText: null, actualContent: content };
}
