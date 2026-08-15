import { useState, useEffect } from 'react';
import { Product, ContextMediaItem } from '../productForm.types';

export function useProductMedia(product?: Product, shopId?: string) {
  const [images, setImages] = useState<{ url: string; displayUrl: string }[]>(() => {
    let initialUrls: string[] = [];
    if ((product as any)?.product_images && (product as any).product_images.length > 0) {
      initialUrls = (product as any).product_images
        .filter((i: any) => !i.variant_id)
        .sort((a: any, b: any) => (a.position ?? 0) - (b.position ?? 0))
        .map((i: any) => i.url);
    } else {
      initialUrls = product?.images ?? [];
    }
    return initialUrls.map(u => ({ url: u, displayUrl: u }));
  });

  const [contextMedia, setContextMedia] = useState<ContextMediaItem[]>([]);
  
  const [uploadingImages, setUploadingImages] = useState(false);
  const [imageErrors, setImageErrors] = useState<string[]>([]);
  
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [mediaErrors, setMediaErrors] = useState<string[]>([]);

  useEffect(() => {
    if (product) {
      let initialUrls: string[] = [];
      if ((product as any)?.product_images && (product as any).product_images.length > 0) {
        initialUrls = (product as any).product_images
          .filter((i: any) => !i.variant_id)
          .sort((a: any, b: any) => (a.position ?? 0) - (b.position ?? 0))
          .map((i: any) => i.url);
      } else {
        initialUrls = product.images ?? [];
      }
      setImages(initialUrls.map(u => ({ url: u, displayUrl: u })));
      // Note: Context media is currently fetched in the parent component and passed in, or fetched here. 
      // We'll expose setContextMedia so the parent can set it on load.
    }
  }, [product]);

  const uploadFiles = async (files: File[], isContext: boolean = false) => {
    if (!shopId) return;

    if (isContext) {
      setUploadingMedia(true);
      setMediaErrors([]);
    } else {
      setUploadingImages(true);
      setImageErrors([]);
    }

    const validFiles = Array.from(files).filter(f => {
      const isVideo = f.type.startsWith('video/');
      const maxMb = isVideo ? 25 : 10;
      return f.size <= maxMb * 1024 * 1024;
    });

    if (validFiles.length < files.length) {
      const err = `Some files skipped (must be < 10MB for images, 25MB for video)`;
      if (isContext) setMediaErrors(prev => [...prev, err]);
      else setImageErrors(prev => [...prev, err]);
    }

    if (validFiles.length === 0) {
      if (isContext) setUploadingMedia(false);
      else setUploadingImages(false);
      return;
    }

    const localItems = validFiles.map(file => ({
      file,
      displayUrl: URL.createObjectURL(file),
      isVideo: file.type.startsWith('video/')
    }));

    if (isContext) {
      const newMediaItems: ContextMediaItem[] = localItems.map(item => ({
        url: item.displayUrl,
        displayUrl: item.displayUrl,
        media_type: item.isVideo ? 'video' : 'image',
        tags: [],
        _isNew: true,
      }));
      setContextMedia(prev => [...prev, ...newMediaItems]);
    } else {
      setImages(prev => [...prev, ...localItems.map(item => ({ url: item.displayUrl, displayUrl: item.displayUrl }))]);
    }

    const errors: string[] = [];

    await Promise.all(
      localItems.map(async item => {
        const file = item.file;
        const fd = new FormData();
        fd.append('file', file);
        fd.append('shopId', shopId);

        try {
          const res = await fetch('/api/inventory/upload-image', { method: 'POST', body: fd });
          let data: { url?: string; error?: string } = {};

          try {
            data = await res.json();
          } catch {
            if (res.status === 413) {
              throw new Error(`"${file.name}" exceeds max upload size (${(file.size / 1024 / 1024).toFixed(1)}MB). Max size is ${item.isVideo ? '25MB' : '10MB'}.`);
            }
            throw new Error(`Upload of "${file.name}" failed with server status ${res.status}.`);
          }

          if (!res.ok || !data.url) {
            throw new Error(data.error ?? `Upload of "${file.name}" failed (${res.status})`);
          }

          const remoteUrl = data.url;

          if (isContext) {
            setContextMedia(prev =>
              prev.map(x => (x.displayUrl === item.displayUrl ? { ...x, url: remoteUrl } : x))
            );
          } else {
            setImages(prev =>
              prev.map(x => (x.displayUrl === item.displayUrl ? { ...x, url: remoteUrl } : x))
            );
          }
        } catch (err) {
          const errMsg = err instanceof Error ? err.message : `Upload of "${file.name}" failed`;
          errors.push(errMsg);

          // Remove failed item from optimistic list so broken blob isn't left behind
          if (isContext) {
            setContextMedia(prev => prev.filter(x => x.displayUrl !== item.displayUrl));
          } else {
            setImages(prev => prev.filter(x => x.displayUrl !== item.displayUrl));
          }
        }
      })
    );

    if (errors.length > 0) {
      if (isContext) setMediaErrors(prev => [...prev, ...errors]);
      else setImageErrors(prev => [...prev, ...errors]);
    }

    if (isContext) setUploadingMedia(false);
    else setUploadingImages(false);
  };

  const hasUnsavedChanges = (() => {
    // For images, check if counts differ or URLs differ. 
    // Ignore blob URLs (they are unsaved).
    let initialUrls: string[] = [];
    if ((product as any)?.product_images && (product as any).product_images.length > 0) {
      initialUrls = (product as any).product_images
        .filter((i: any) => !i.variant_id)
        .sort((a: any, b: any) => (a.position ?? 0) - (b.position ?? 0))
        .map((i: any) => i.url);
    } else {
      initialUrls = product?.images ?? [];
    }

    const currentUrls = images.filter(i => !i.url.startsWith('blob:')).map(i => i.url);
    if (initialUrls.length !== currentUrls.length) return true;
    for (let i = 0; i < initialUrls.length; i++) {
      if (initialUrls[i] !== currentUrls[i]) return true;
    }
    
    // Context media changes
    const hasNewContext = contextMedia.some(m => m._isNew);
    if (hasNewContext) return true;
    
    // We don't strictly track context tags here if not passed initially, but assuming new media is the main change.
    return false;
  })();

  const getPayload = () => {
    return {
      images: images.filter(i => !i.url.startsWith('blob:')).map(i => i.url),
      contextMedia: contextMedia.filter(m => !m.url.startsWith('blob:')).map(m => ({
        url: m.url,
        media_type: m.media_type,
        tags: m.tags
      }))
    };
  };

  return {
    state: {
      images,
      contextMedia,
      uploadingImages,
      imageErrors,
      uploadingMedia,
      mediaErrors,
      hasUnsavedChanges
    },
    setters: {
      setImages,
      setContextMedia,
      setImageErrors,
      setMediaErrors
    },
    uploadFiles,
    getPayload
  };
}
