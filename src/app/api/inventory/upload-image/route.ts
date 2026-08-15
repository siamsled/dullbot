import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import sharp from 'sharp';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const BUCKET = 'product-images';
const ALLOWED_IMAGES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'];
const ALLOWED_VIDEOS = ['video/mp4', 'video/quicktime', 'video/webm', 'video/ogg', 'video/x-matroska', 'video/avi', 'video/mpeg', 'video/mov'];

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const shopId = formData.get('shopId') as string | null;

    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 });

    const isImage = file.type.startsWith('image/') || ALLOWED_IMAGES.includes(file.type);
    const isVideo = file.type.startsWith('video/') || ALLOWED_VIDEOS.includes(file.type);

    if (!isImage && !isVideo) {
      return NextResponse.json({ error: `Invalid file type: ${file.type || 'unknown'}. Only images and videos are accepted.` }, { status: 400 });
    }

    const maxSize = isVideo ? 25 * 1024 * 1024 : 10 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json({ error: `File too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Maximum is ${isVideo ? '25MB' : '10MB'}.` }, { status: 400 });
    }

    let buffer = Buffer.from(await file.arrayBuffer());
    let uploadContentType = file.type || (isVideo ? 'video/mp4' : 'image/jpeg');
    let ext = file.name.split('.').pop() ?? (isVideo ? 'mp4' : 'jpg');

    if (isImage) {
      try {
        const pipeline = sharp(buffer);
        const metadata = await pipeline.metadata();
        
        if (metadata.width && metadata.width > 1920) {
          pipeline.resize({ width: 1920, fit: 'inside', withoutEnlargement: true });
        }
        
        buffer = await pipeline
          .webp({ quality: 85 })
          .toBuffer();
          
        uploadContentType = 'image/webp';
        ext = 'webp';
      } catch (sharpError) {
        console.error('Sharp compression failed, uploading raw image:', sharpError);
        uploadContentType = file.type || 'image/jpeg';
      }
    } else if (isVideo) {
      uploadContentType = file.type || 'video/mp4';
    }

    const filename = `${shopId ?? 'global'}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    const { error } = await supabaseAdmin.storage
      .from(BUCKET)
      .upload(filename, buffer, {
        contentType: uploadContentType,
        upsert: false,
      });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const { data: { publicUrl } } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(filename);

    return NextResponse.json({ url: publicUrl });
  } catch (err) {
    console.error('Image upload error:', err);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}
