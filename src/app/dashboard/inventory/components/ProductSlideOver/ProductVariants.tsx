'use client';

import { useRef, useState } from 'react';
import { Plus, X, ScanLine, Image as ImageIcon, Trash2, Wand2, Hash, Check, Upload, ImagePlus } from 'lucide-react';
import { VariantWithState } from './hooks/useVariants';

interface ProductVariantsProps {
  variants: VariantWithState[];
  setVariants: (v: VariantWithState[] | ((prev: VariantWithState[]) => VariantWithState[])) => void;
  showVariantBuilder: boolean;
  setShowVariantBuilder: (v: boolean | ((prev: boolean) => boolean)) => void;
  variantOptionName: string;
  setVariantOptionName: (v: string) => void;
  variantOptionValues: string;
  setVariantOptionValues: (v: string) => void;
  generateVariants: () => void;
  addVariant: () => void;
  autoGenerateSkus?: (parentSku?: string | null, parentName?: string | null) => void;
  images: { url: string; displayUrl: string }[];
  shopId: string;
  parentSku?: string | null;
  parentName?: string | null;
  setPreviewMedia: (v: { url: string; type: 'image' | 'video'; title?: string } | null) => void;
  setScanningTarget: (v: string | null) => void;
  setActiveTab: (tab: 'Inventory') => void;
}

export default function ProductVariants({
  variants,
  setVariants,
  showVariantBuilder,
  setShowVariantBuilder,
  variantOptionName,
  setVariantOptionName,
  variantOptionValues,
  setVariantOptionValues,
  generateVariants,
  addVariant,
  autoGenerateSkus,
  images,
  shopId,
  parentSku,
  parentName,
  setPreviewMedia,
  setScanningTarget,
  setActiveTab,
}: ProductVariantsProps) {
  // Modal for linking photos to a variant
  const [selectedVariantIdForImages, setSelectedVariantIdForImages] = useState<string | null>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const variantFileInputRef = useRef<HTMLInputElement>(null);

  const activeVariants = variants.filter(v => !v._deleted);
  const activeVariantForModal = variants.find(v => v.id === selectedVariantIdForImages);

  const handleTogglePhotoForVariant = (variantId: string, imgUrl: string) => {
    setVariants(prev =>
      prev.map(v => {
        if (v.id !== variantId) return v;
        const currentUrls = v.image_urls ?? (v.image_url ? [v.image_url] : []);
        const exists = currentUrls.includes(imgUrl);
        const nextUrls = exists ? currentUrls.filter(u => u !== imgUrl) : [...currentUrls, imgUrl];
        return {
          ...v,
          image_url: nextUrls[0] ?? null,
          image_urls: nextUrls,
          displayUrl: nextUrls[0] ?? null,
          displayUrls: nextUrls,
        };
      })
    );
  };

  const handleRemoveAllPhotosFromVariant = (variantId: string) => {
    setVariants(prev =>
      prev.map(v => {
        if (v.id !== variantId) return v;
        return {
          ...v,
          image_url: null,
          image_urls: [],
          displayUrl: null,
          displayUrls: [],
        };
      })
    );
  };

  const handleSelectAllPhotosForVariant = (variantId: string) => {
    const allUrls = images.map(i => i.url);
    setVariants(prev =>
      prev.map(v => {
        if (v.id !== variantId) return v;
        return {
          ...v,
          image_url: allUrls[0] ?? null,
          image_urls: allUrls,
          displayUrl: allUrls[0] ?? null,
          displayUrls: allUrls,
        };
      })
    );
  };

  const handleTriggerAutoSkus = () => {
    if (autoGenerateSkus) {
      autoGenerateSkus(parentSku, parentName);
    }
  };

  return (
    <div className="p-6 space-y-8 animate-in fade-in">
      <section className="space-y-4">
        {/* Header toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Variant Options</h3>
            <p className="text-xs text-zinc-400 mt-0.5">Manage variant options, SKUs, pricing overrides, and link photos.</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            {activeVariants.length > 0 && autoGenerateSkus && (
              <button
                type="button"
                onClick={handleTriggerAutoSkus}
                className="text-xs text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white bg-zinc-100/80 dark:bg-zinc-800/80 hover:bg-zinc-200/70 dark:hover:bg-zinc-700/70 border border-zinc-200/60 dark:border-zinc-700/60 flex items-center gap-1.5 transition-all px-3 py-1.5 rounded-xl font-medium cursor-pointer shadow-xs active:scale-[0.98]"
                title="Auto-generate SKUs based on parent SKU and variant attributes"
              >
                <Hash className="w-3.5 h-3.5 text-zinc-400" />
                Auto SKUs
              </button>
            )}

            <button
              type="button"
              onClick={() => setShowVariantBuilder(v => !v)}
              className={`text-xs flex items-center gap-1.5 transition-all px-3 py-1.5 rounded-xl font-medium cursor-pointer shadow-xs active:scale-[0.98] ${
                showVariantBuilder
                  ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-950'
                  : 'text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white bg-zinc-100/80 dark:bg-zinc-800/80 hover:bg-zinc-200/70 dark:hover:bg-zinc-700/70 border border-zinc-200/60 dark:border-zinc-700/60'
              }`}
            >
              <Wand2 className="w-3.5 h-3.5 text-zinc-400" />
              {showVariantBuilder ? 'Close' : 'Generate Options'}
            </button>

            <button
              type="button"
              onClick={addVariant}
              className="text-xs text-zinc-900 dark:text-white bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200/80 dark:hover:bg-zinc-700 border border-zinc-300/80 dark:border-zinc-700 flex items-center gap-1 transition-all px-3 py-1.5 rounded-xl font-semibold cursor-pointer shadow-xs active:scale-[0.98]"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Variant
            </button>
          </div>
        </div>

        {/* Generator Panel */}
        {showVariantBuilder && (
          <div className="bg-zinc-50/80 dark:bg-zinc-900/60 rounded-2xl p-5 space-y-4 border border-zinc-200/60 dark:border-zinc-800/60 animate-in slide-in-from-top-2">
            <div>
              <p className="text-sm text-zinc-800 dark:text-zinc-200 font-semibold">Option Generator</p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">Define option types and comma-separated values to automatically build variant rows and generate clean SKUs.</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                value={variantOptionName}
                onChange={e => setVariantOptionName(e.target.value)}
                placeholder="Option name (e.g. Color, Size, Material)"
                className="flex-1 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-zinc-900 dark:text-zinc-100 focus:border-zinc-400 dark:focus:border-zinc-600 focus:outline-none placeholder:text-zinc-400"
              />
              <input
                value={variantOptionValues}
                onChange={e => setVariantOptionValues(e.target.value)}
                placeholder="Values (e.g. Red, Black, White, Navy)"
                className="flex-[2] bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-zinc-900 dark:text-zinc-100 focus:border-zinc-400 dark:focus:border-zinc-600 focus:outline-none placeholder:text-zinc-400"
              />
              <button
                type="button"
                onClick={generateVariants}
                className="px-6 py-2.5 rounded-xl bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 text-sm font-semibold hover:opacity-90 transition-all cursor-pointer shadow-xs shrink-0"
              >
                Generate
              </button>
            </div>
          </div>
        )}

        {/* Variants Table Card */}
        {activeVariants.length > 0 && (
          <div className="border border-zinc-200/70 dark:border-zinc-800/80 rounded-2xl bg-white dark:bg-zinc-950/60 mt-6 shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-zinc-50/80 dark:bg-zinc-900/60 border-b border-zinc-200/60 dark:border-zinc-800/60 text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                    <th className="px-4 py-3.5 w-16 text-center">Photos</th>
                    <th className="px-4 py-3.5 min-w-[200px]">Variant Name</th>
                    <th className="px-4 py-3.5 min-w-[170px]">SKU</th>
                    <th className="px-4 py-3.5 min-w-[130px]">Price (৳)</th>
                    <th className="px-4 py-3.5 min-w-[110px]">Stock</th>
                    <th className="px-4 py-3.5 w-12 text-right"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200/50 dark:divide-zinc-800/50">
                  {activeVariants.map(v => {
                    const linkedImages = v.image_urls && v.image_urls.length > 0 ? v.image_urls : v.image_url ? [v.image_url] : [];
                    const photoCount = linkedImages.length;
                    const primaryThumb = linkedImages[0];

                    return (
                      <tr key={v.id} className="hover:bg-zinc-50/60 dark:hover:bg-zinc-900/40 transition-colors">
                        {/* Photos Multi-thumbnail cell */}
                        <td className="px-4 py-3 align-middle text-center">
                          <button
                            type="button"
                            onClick={() => setSelectedVariantIdForImages(v.id)}
                            className="relative inline-flex items-center justify-center cursor-pointer group/thumb focus-visible:outline-none"
                            title={photoCount > 0 ? `${photoCount} photo${photoCount > 1 ? 's' : ''} linked. Click to manage photos.` : 'Click to link photos to this variant'}
                          >
                            {photoCount > 0 && primaryThumb ? (
                              <div className="relative w-10 h-10 rounded-xl overflow-hidden border border-zinc-200/80 dark:border-zinc-700/80 shadow-xs group-hover/thumb:ring-2 group-hover/thumb:ring-indigo-500/40 transition-all">
                                <img src={primaryThumb} alt={v.name} className="w-full h-full object-cover" />
                                {photoCount > 1 && (
                                  <span className="absolute bottom-0 right-0 bg-zinc-950/80 backdrop-blur-xs text-white text-[9px] font-bold font-mono px-1 rounded-tl-md">
                                    +{photoCount - 1}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <div className="w-10 h-10 rounded-xl border border-dashed border-zinc-300 dark:border-zinc-700 bg-zinc-50/60 dark:bg-zinc-900/60 group-hover/thumb:border-indigo-500 group-hover/thumb:bg-indigo-50/30 flex items-center justify-center text-zinc-400 group-hover/thumb:text-indigo-600 transition-all shadow-xs">
                                <ImagePlus className="w-4 h-4" />
                              </div>
                            )}
                          </button>
                        </td>

                        {/* Variant Name */}
                        <td className="px-4 py-3 align-middle">
                          <input
                            value={v.name}
                            onChange={e => setVariants(prev => prev.map(x => (x.id === v.id ? { ...x, name: e.target.value } : x)))}
                            placeholder="Variant name (e.g. Red / M)"
                            className="w-full bg-transparent border border-transparent hover:bg-zinc-100/60 dark:hover:bg-zinc-800/60 focus:bg-white dark:focus:bg-zinc-900 rounded-xl px-2.5 py-1.5 text-sm text-zinc-900 dark:text-zinc-100 focus:border-zinc-300 dark:focus:border-zinc-700 focus:outline-none transition-colors"
                          />
                        </td>

                        {/* SKU */}
                        <td className="px-4 py-3 align-middle">
                          <div className="relative flex items-center group/sku">
                            <input
                              value={v.sku ?? ''}
                              onChange={e => setVariants(prev => prev.map(x => (x.id === v.id ? { ...x, sku: e.target.value.toUpperCase() } : x)))}
                              placeholder="SKU"
                              className="w-full bg-transparent border border-transparent hover:bg-zinc-100/60 dark:hover:bg-zinc-800/60 focus:bg-white dark:focus:bg-zinc-900 rounded-xl pl-2.5 pr-7 py-1.5 text-sm font-mono text-zinc-900 dark:text-zinc-100 focus:border-zinc-300 dark:focus:border-zinc-700 focus:outline-none transition-colors uppercase placeholder:normal-case placeholder:font-sans"
                            />
                            <button
                              type="button"
                              onClick={() => setScanningTarget(v.id)}
                              className="absolute right-1.5 p-1 text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 opacity-0 group-hover/sku:opacity-100 transition-all cursor-pointer rounded-md hover:bg-zinc-200/50 dark:hover:bg-zinc-800"
                              title="Scan Barcode for SKU"
                            >
                              <ScanLine className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>

                        {/* Price override */}
                        <td className="px-4 py-3 align-middle">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={v.price_override ?? ''}
                            onChange={e => setVariants(prev => prev.map(x => (x.id === v.id ? { ...x, price_override: parseFloat(e.target.value) || null } : x)))}
                            placeholder="Inherit"
                            className="w-full bg-transparent border border-transparent hover:bg-zinc-100/60 dark:hover:bg-zinc-800/60 focus:bg-white dark:focus:bg-zinc-900 rounded-xl px-2.5 py-1.5 text-sm text-zinc-900 dark:text-zinc-100 focus:border-zinc-300 dark:focus:border-zinc-700 focus:outline-none transition-colors"
                          />
                        </td>

                        {/* Stock */}
                        <td className="px-4 py-3 align-middle">
                          {v._isNew ? (
                            <input
                              type="number"
                              min="0"
                              value={v.stock}
                              onChange={e => setVariants(prev => prev.map(x => (x.id === v.id ? { ...x, stock: parseInt(e.target.value, 10) || 0 } : x)))}
                              placeholder="Initial"
                              className="w-20 bg-transparent border border-transparent hover:bg-zinc-100/60 dark:hover:bg-zinc-800/60 focus:bg-white dark:focus:bg-zinc-900 rounded-xl px-2.5 py-1.5 text-sm font-mono text-zinc-900 dark:text-zinc-100 focus:border-zinc-300 dark:focus:border-zinc-700 focus:outline-none transition-colors"
                            />
                          ) : (
                            <div className="flex items-center gap-2 group/stock">
                              <span className="text-sm font-semibold font-mono text-zinc-900 dark:text-zinc-100 px-2.5">{v.stock}</span>
                              <button
                                type="button"
                                onClick={() => setActiveTab('Inventory')}
                                className="text-[10px] font-semibold text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 px-2 py-1 rounded-lg transition-all opacity-0 group-hover/stock:opacity-100 cursor-pointer shadow-2xs"
                              >
                                Adjust
                              </button>
                            </div>
                          )}
                        </td>

                        {/* Delete variant */}
                        <td className="px-4 py-3 align-middle text-right">
                          <button
                            type="button"
                            onClick={() => setVariants(prev => prev.map(x => (x.id === v.id ? { ...x, _deleted: true } : x)))}
                            className="p-1.5 text-zinc-400 hover:text-rose-600 transition-colors rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
                            title="Delete variant"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      {/* ── Fixed Modal Dialog for Linking Multiple Photos to a Variant (NEVER CUT OFF) ── */}
      {selectedVariantIdForImages && activeVariantForModal && (
        <div
          className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200"
          onClick={() => setSelectedVariantIdForImages(null)}
        >
          <div
            className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-3xl shadow-2xl max-w-xl w-full p-6 space-y-6 animate-in zoom-in-95 duration-200 relative overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-4 pb-4 border-b border-zinc-200/70 dark:border-zinc-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/50 dark:border-indigo-800/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                  <ImageIcon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                    Photos for <span className="text-indigo-600 dark:text-indigo-400">{activeVariantForModal.name}</span>
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">Select photos from your product gallery or upload new photos for this variant.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedVariantIdForImages(null)}
                className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Photo Selection Grid */}
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-zinc-500 uppercase tracking-wider text-[11px]">
                  Product Gallery ({images.length} photo{images.length !== 1 ? 's' : ''})
                </span>
                {images.length > 0 && (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleSelectAllPhotosForVariant(activeVariantForModal.id)}
                      className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-medium cursor-pointer"
                    >
                      Select All
                    </button>
                    <span className="text-zinc-300 dark:text-zinc-700">·</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveAllPhotosFromVariant(activeVariantForModal.id)}
                      className="text-xs text-zinc-500 hover:text-rose-600 hover:underline font-medium cursor-pointer"
                    >
                      Clear All
                    </button>
                  </div>
                )}
              </div>

              {images.length > 0 ? (
                <div className="grid grid-cols-4 sm:grid-cols-5 gap-3 max-h-60 overflow-y-auto p-1">
                  {images.map((imgItem, idx) => {
                    const srcUrl = imgItem.displayUrl || imgItem.url;
                    const linkedUrls = activeVariantForModal.image_urls ?? (activeVariantForModal.image_url ? [activeVariantForModal.image_url] : []);
                    const isSelected = linkedUrls.includes(imgItem.url);

                    return (
                      <button
                        key={imgItem.url || idx}
                        type="button"
                        onClick={() => handleTogglePhotoForVariant(activeVariantForModal.id, imgItem.url)}
                        className={`relative aspect-square rounded-2xl overflow-hidden border-2 transition-all cursor-pointer shadow-xs group/card ${
                          isSelected
                            ? 'border-indigo-600 dark:border-indigo-500 ring-2 ring-indigo-500/30'
                            : 'border-zinc-200/80 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-600'
                        }`}
                      >
                        <img src={srcUrl} alt="Product media" className="w-full h-full object-cover" />
                        <div
                          className={`absolute inset-0 transition-opacity flex items-center justify-center ${
                            isSelected ? 'bg-indigo-950/40 opacity-100' : 'bg-black/40 opacity-0 group-hover/card:opacity-100'
                          }`}
                        >
                          <div
                            className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${
                              isSelected ? 'bg-indigo-600 text-white scale-100 shadow-md' : 'bg-white/80 text-zinc-900 scale-90'
                            }`}
                          >
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="p-8 rounded-2xl bg-zinc-50 dark:bg-zinc-950 border border-dashed border-zinc-200 dark:border-zinc-800 text-center space-y-1">
                  <p className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">No photos in product gallery yet.</p>
                  <p className="text-[11px] text-zinc-400">Upload a photo below to add it to both the product and this variant.</p>
                </div>
              )}
            </div>

            {/* Direct Upload Section */}
            <div className="pt-4 border-t border-zinc-200/70 dark:border-zinc-800 flex items-center justify-between gap-4">
              <div>
                <button
                  type="button"
                  onClick={() => variantFileInputRef.current?.click()}
                  disabled={isUploadingPhoto}
                  className="px-4 py-2 text-xs font-semibold text-zinc-800 dark:text-zinc-200 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-xl transition-all flex items-center gap-2 cursor-pointer shadow-xs disabled:opacity-50"
                >
                  <Upload className="w-3.5 h-3.5" />
                  {isUploadingPhoto ? 'Uploading...' : 'Upload New Photo'}
                </button>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-xs font-medium text-zinc-500">
                  {(activeVariantForModal.image_urls ?? (activeVariantForModal.image_url ? [activeVariantForModal.image_url] : [])).length} selected
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedVariantIdForImages(null)}
                  className="px-5 py-2 text-xs font-semibold text-white bg-zinc-900 dark:bg-white dark:text-zinc-950 rounded-xl hover:opacity-90 transition-all cursor-pointer shadow-xs"
                >
                  Done
                </button>
              </div>
            </div>

            {/* Hidden File Input for Variant Image Upload */}
            <input
              ref={variantFileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={async e => {
                if (e.target.files && e.target.files[0] && selectedVariantIdForImages) {
                  const file = e.target.files[0];
                  const targetId = selectedVariantIdForImages;
                  const blobUrl = URL.createObjectURL(file);

                  // Immediately display optimistically
                  setVariants(prev =>
                    prev.map(x => {
                      if (x.id !== targetId) return x;
                      const currentUrls = x.image_urls ?? (x.image_url ? [x.image_url] : []);
                      const nextUrls = [...currentUrls, blobUrl];
                      return {
                        ...x,
                        image_url: nextUrls[0] ?? null,
                        image_urls: nextUrls,
                        displayUrl: nextUrls[0] ?? null,
                        displayUrls: nextUrls,
                      };
                    })
                  );

                  setIsUploadingPhoto(true);
                  const formData = new FormData();
                  formData.append('file', file);
                  formData.append('shopId', shopId);

                  try {
                    const res = await fetch('/api/inventory/upload-image', { method: 'POST', body: formData });
                    let data: { url?: string; error?: string } = {};
                    try {
                      data = await res.json();
                    } catch {
                      if (res.status === 413) {
                        throw new Error(`File is too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Max is 10MB.`);
                      }
                      throw new Error(`Upload failed with status ${res.status}`);
                    }

                    if (data.url) {
                      setVariants(prev =>
                        prev.map(x => {
                          if (x.id !== targetId) return x;
                          const currentUrls = (x.image_urls ?? []).map(u => (u === blobUrl ? data.url! : u));
                          return {
                            ...x,
                            image_url: currentUrls[0] ?? null,
                            image_urls: currentUrls,
                            displayUrl: currentUrls[0] ?? null,
                            displayUrls: currentUrls,
                          };
                        })
                      );
                    }
                  } catch (err) {
                    console.error('Variant image upload failed:', err);
                    // Remove optimistic blob if failed
                    setVariants(prev =>
                      prev.map(x => {
                        if (x.id !== targetId) return x;
                        const currentUrls = (x.image_urls ?? []).filter(u => u !== blobUrl);
                        return {
                          ...x,
                          image_url: currentUrls[0] ?? null,
                          image_urls: currentUrls,
                          displayUrl: currentUrls[0] ?? null,
                          displayUrls: currentUrls,
                        };
                      })
                    );
                  } finally {
                    setIsUploadingPhoto(false);
                  }
                }
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
