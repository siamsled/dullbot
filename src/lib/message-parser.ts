export function parseMessageSegments(content: string): { type: 'text' | 'image' | 'audio' | 'video', content: string }[] {
  if (!content) return [];

  let cleaned = content.trim();

  // Strip system/caption tags if present at root
  cleaned = cleaned.replace(/^\[IMAGE_WITH_CAPTION\]\s*/i, '');
  cleaned = cleaned.replace(/^\[Product Image\]\s*/i, '');
  cleaned = cleaned.replace(/^\[Voice Message\]\s*/i, '');

  const segments: { type: 'text' | 'image' | 'audio' | 'video', content: string }[] = [];

  const markdownImageSplitRegex = /(!\[.*?\]\(.*?\))/g;
  const markdownImageExtractRegex = /!\[.*?\]\((.*?)\)/;

  const chunks = cleaned.split('|||').map(s => s.trim()).filter(Boolean);

  for (const chunk of chunks) {
    let piece = chunk.trim();

    // 1. Explicit media prefixes
    if (piece.startsWith('IMAGE:')) {
      const url = piece.substring(6).trim();
      if (url) segments.push({ type: 'image', content: url });
      continue;
    }
    if (piece.startsWith('AUDIO:')) {
      const url = piece.substring(6).trim();
      if (url) segments.push({ type: 'audio', content: url });
      continue;
    }
    if (piece.startsWith('VIDEO:')) {
      const url = piece.substring(6).trim();
      if (url) segments.push({ type: 'video', content: url });
      continue;
    }

    // 2. Direct Media URLs (including FB CDN, IG CDN, Supabase, Cloudinary, S3)
    const isVideoHost = /https?:\/\/[^\s]+?\.(mp4|mov|avi|mkv|webm)(\?[^\s]*)?$/i.test(piece);
    const isAudioHost = /https?:\/\/[^\s]+?\.(mp3|wav|m4a|ogg)(\?[^\s]*)?$/i.test(piece);
    const isImageHost = /https?:\/\/[^\s]+?(fbcdn\.net|fbsbx\.com|cdninstagram\.com|supabase\.co\/storage|cloudinary\.com|s3\.[^\/]+|[^\s]+?\.(png|jpg|jpeg|gif|webp|heic))(\?[^\s]*)?$/i.test(piece);

    if (isVideoHost) {
      segments.push({ type: 'video', content: piece });
    } else if (isAudioHost) {
      segments.push({ type: 'audio', content: piece });
    } else if (isImageHost) {
      segments.push({ type: 'image', content: piece });
    } else {
      // 3. Markdown images embedded in text
      const parts = piece.split(markdownImageSplitRegex);
      for (const part of parts) {
        if (!part) continue;

        const imgMatch = part.match(markdownImageExtractRegex);
        if (imgMatch) {
          const url = imgMatch[1];
          if (/\.(mp4|mov|avi|mkv|webm)(\?.*)?$/i.test(url)) {
            segments.push({ type: 'video', content: url });
          } else {
            segments.push({ type: 'image', content: url });
          }
        } else {
          const cleanText = part
            .replace(/^\[IMAGE_WITH_CAPTION\]\s*/i, '')
            .replace(/^\[Product Image\]\s*/i, '')
            .replace(/^\[Voice Message\]\s*/i, '')
            .trim();

          if (cleanText) {
            segments.push({ type: 'text', content: cleanText });
          }
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
