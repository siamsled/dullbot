import { useRef, useState } from 'react';
import { Upload, Trash2, GripVertical, Loader2, AlertCircle, Play, X, Image as ImageIcon } from 'lucide-react';
import { ContextMediaItem } from './productForm.types';

function TagsInput({ 
  initialValue, 
  onChange 
}: { 
  initialValue: string[]; 
  onChange: (tags: string[]) => void 
}) {
  const [text, setText] = useState(() => initialValue.join(', '));

  const handleChange = (val: string) => {
    setText(val);
    const parsed = val.split(',').map(t => t.trim()).filter(Boolean);
    onChange(parsed);
  };

  return (
    <input
      type="text"
      value={text}
      placeholder="e.g. #realpic, model wearing, blue color"
      onChange={(e) => handleChange(e.target.value)}
      className="w-full bg-white border border-dove/20 rounded-inputs px-3 py-1.5 text-xs text-ink focus:border-ink/20 focus:outline-none placeholder:text-dove relative z-10"
    />
  );
}

interface ProductMediaProps {
  images: { url: string; displayUrl: string }[];
  setImages: (images: { url: string; displayUrl: string }[] | ((prev: { url: string; displayUrl: string }[]) => { url: string; displayUrl: string }[])) => void;
  contextMedia: ContextMediaItem[];
  setContextMedia: (media: ContextMediaItem[] | ((prev: ContextMediaItem[]) => ContextMediaItem[])) => void;
  uploadFiles: (files: File[], isContext?: boolean) => Promise<void>;
  uploadingImages: boolean;
  imageErrors: string[];
  uploadingMedia: boolean;
  mediaErrors: string[];
  setPreviewMedia: (v: { url: string; type: 'image' | 'video'; title?: string } | null) => void;
}

export default function ProductMedia({
  images, setImages, contextMedia, setContextMedia, uploadFiles,
  uploadingImages, imageErrors, uploadingMedia, mediaErrors, setPreviewMedia
}: ProductMediaProps) {
  const [dragOver, setDragOver] = useState(false);
  const [mediaDragOver, setMediaDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="p-6 space-y-8 animate-in fade-in">
      
      {/* Product Images */}
      <section className="space-y-4">
        <h3 className="text-xs font-medium text-ash uppercase tracking-wider">Images</h3>
        <div
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={e => {
            e.preventDefault();
            setDragOver(false);
            if (e.dataTransfer.files) uploadFiles(Array.from(e.dataTransfer.files), false);
          }}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-cards p-6 text-center cursor-pointer transition-colors ${
            dragOver ? 'border-ink bg-fog' : 'border-dove/40 hover:border-ink/30 hover:bg-fog/50'
          }`}
        >
          {uploadingImages ? (
            <Loader2 className="w-6 h-6 text-graphite mx-auto animate-spin" />
          ) : (
            <>
              <Upload className="w-6 h-6 text-dove mx-auto mb-2" />
              <p className="text-sm text-ash">Drop images or click to upload</p>
              <p className="text-xs text-dove mt-1">PNG, JPG, WEBP · 10MB max per image</p>
            </>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={e => { if (e.target.files) uploadFiles(Array.from(e.target.files), false); }}
          />
        </div>

        {imageErrors.length > 0 && (
          <div className="space-y-1">
            {imageErrors.map((err, i) => (
              <p key={i} className="flex items-center gap-1.5 text-xs text-rust">
                <AlertCircle className="w-3 h-3 shrink-0" />
                {err}
              </p>
            ))}
          </div>
        )}

        {images.length > 0 && (
          <div className="flex flex-wrap gap-3">
            {images.map((imgItem, idx) => {
              const srcUrl = imgItem.displayUrl || imgItem.url;
              return (
                <div
                  key={srcUrl}
                  className="relative group cursor-pointer"
                  onClick={() => setPreviewMedia({ url: srcUrl, type: 'image', title: `Product Photo ${idx + 1}` })}
                >
                  <img
                    src={srcUrl}
                    alt={`Product ${idx + 1}`}
                    className="w-20 h-20 object-cover rounded-images border border-dove/20 shadow-sm hover:opacity-90 transition-opacity"
                  />
                  {idx === 0 && (
                    <span className="absolute top-1 left-1 bg-ink text-white text-[10px] px-1.5 py-0.5 rounded-tags">
                      Primary
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setImages(prev => prev.filter((_, i) => i !== idx)); }}
                    className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 text-white hidden group-hover:flex items-center justify-center cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                  <div className="absolute bottom-1 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab">
                    <GripVertical className="w-4 h-4 text-white drop-shadow" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Context Media */}
      <section className="space-y-4 border-t border-dove/10 pt-6">
        <div>
          <h3 className="text-xs font-medium text-ink uppercase tracking-wider">Context Media</h3>
          <p className="text-[11px] text-ash mt-0.5">Used by AI to answer query details (e.g. real photos/videos)</p>
        </div>

        <div
          onDragOver={e => { e.preventDefault(); setMediaDragOver(true); }}
          onDragLeave={() => setMediaDragOver(false)}
          onDrop={e => {
            e.preventDefault();
            setMediaDragOver(false);
            if (e.dataTransfer.files) uploadFiles(Array.from(e.dataTransfer.files), true);
          }}
          onClick={() => mediaInputRef.current?.click()}
          className={`border-2 border-dashed rounded-cards p-6 text-center cursor-pointer transition-colors ${
            mediaDragOver ? 'border-ink bg-fog' : 'border-dove/40 hover:border-ink/30 hover:bg-fog/50'
          }`}
        >
          {uploadingMedia ? (
            <Loader2 className="w-6 h-6 text-graphite mx-auto animate-spin" />
          ) : (
            <>
              <Upload className="w-6 h-6 text-dove mx-auto mb-2" />
              <p className="text-sm text-ash">Drop files or click to upload</p>
              <p className="text-xs text-dove mt-1">PNG, JPG, WEBP (10MB max) · MP4, WEBM (25MB & 60s max)</p>
            </>
          )}
          <input
            ref={mediaInputRef}
            type="file"
            accept="image/*,video/*"
            multiple
            className="hidden"
            onChange={e => { if (e.target.files) uploadFiles(Array.from(e.target.files), true); }}
          />
        </div>

        {mediaErrors.length > 0 && (
          <div className="space-y-1">
            {mediaErrors.map((err, i) => (
              <p key={i} className="flex items-center gap-1.5 text-xs text-rust">
                <AlertCircle className="w-3 h-3 shrink-0" />
                {err}
              </p>
            ))}
          </div>
        )}

        {contextMedia.length > 0 && (
          <div className="space-y-3">
            {contextMedia.map((item, idx) => {
              const mediaUrl = item.displayUrl || item.url;
              return (
                <div key={item.url || idx} className="flex gap-4 p-3 bg-fog rounded-cards border border-dove/10 relative group items-center">
                  <div
                    className="w-16 h-16 shrink-0 relative bg-black/5 rounded-images overflow-hidden flex items-center justify-center border border-dove/20 cursor-pointer group/thumb hover:ring-2 hover:ring-ink/20 transition-all"
                    onClick={() => setPreviewMedia({ url: mediaUrl, type: item.media_type, title: `Context Media (${item.media_type})` })}
                    title="Click to preview full size"
                  >
                    {item.media_type === 'video' ? (
                      <div className="relative w-full h-full bg-black flex items-center justify-center">
                        <video src={`${mediaUrl}#t=0.1`} className="w-full h-full object-cover opacity-80" muted playsInline preload="metadata" />
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                          <Play className="w-5 h-5 text-white fill-white drop-shadow" />
                        </div>
                      </div>
                    ) : (
                      <img src={mediaUrl} alt="Context media" className="w-full h-full object-cover group-hover/thumb:scale-105 transition-transform" />
                    )}
                    <span className="absolute bottom-0.5 right-0.5 bg-black/75 text-white text-[9px] font-medium px-1 rounded">
                      {item.media_type}
                    </span>
                  </div>

                  <div className="flex-1 space-y-1">
                    <label className="text-[11px] font-medium text-ash">AI Lookup Tags (comma separated)</label>
                    <TagsInput
                      initialValue={item.tags}
                      onChange={(newTags) => {
                        setContextMedia(prev => prev.map((x, i) => {
                          if (i !== idx) return x;
                          return { ...x, tags: newTags };
                        }));
                      }}
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => setContextMedia(prev => prev.filter((_, i) => i !== idx))}
                    className="p-2 text-dove hover:text-rust rounded-full hover:bg-white transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </section>

    </div>
  );
}
