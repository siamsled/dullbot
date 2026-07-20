'use client';

import { useState, useTransition, useRef, useCallback, useEffect } from 'react';
import {
  X, Upload, Trash2, GripVertical, Plus, Minus, Loader2,
  Package, ChevronDown, AlertCircle, RotateCcw, Check, ScanLine
} from 'lucide-react';
import dynamic from 'next/dynamic';
const BarcodeScanner = dynamic(() => import('./BarcodeScanner'), { ssr: false });

import {
  addProduct, updateProduct, addVariants, updateVariant, deleteVariant,
  manualStockAdjust, restockProduct, getStockMovements, type ProductInput, type VariantInput,
  getProductMedia, saveProductMedia,
} from '../actions';

// ─── Types ────────────────────────────────────────────────────────────────────

export type Product = {
  id: string;
  name: string;
  description?: string | null;
  price: number;
  compare_at_price?: number | null;
  cost_price?: number | null;
  currency: string;
  stock_quantity: number;
  sku?: string | null;
  category?: string | null;
  tags?: string[] | null;
  images?: string[] | null;
  low_stock_threshold?: number | null;
  default_supplier_id?: string | null;
  is_active: boolean;
  draft: boolean;
  source?: string;
  updated_at?: string | null;
};

export type Variant = {
  id: string;
  product_id: string;
  name: string;
  sku?: string | null;
  price_override?: number | null;
  stock: number;
};

type StockMovement = {
  id: string;
  change_type: string;
  quantity_delta: number;
  resulting_stock: number;
  note?: string | null;
  created_at: string;
  suppliers?: { name?: string } | null;
  cost_per_unit?: number | null;
};

interface Props {
  isNew: boolean;
  product?: Product;
  variants?: Variant[];
  suppliers: { id: string; name: string }[];
  existingCategories: string[];
  shopId: string;
  onClose: () => void;
  onSaved: (product: Product, isNew: boolean) => void;
  onMovementAdded?: () => void;
}

const CATEGORIES_PLACEHOLDER = 'Search or add category…';

// ─── Image upload helper ──────────────────────────────────────────────────────

async function uploadImage(file: File, shopId: string): Promise<string> {
  const fd = new FormData();
  fd.append('file', file);
  fd.append('shopId', shopId);
  const res = await fetch('/api/inventory/upload-image', { method: 'POST', body: fd });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? 'Upload failed');
  return data.url as string;
}

// ─── Video duration helper ───────────────────────────────────────────────────

function getVideoDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.onloadedmetadata = () => {
      window.URL.revokeObjectURL(video.src);
      resolve(video.duration);
    };
    video.onerror = () => {
      reject(new Error('Failed to load video metadata'));
    };
    video.src = URL.createObjectURL(file);
  });
}

export type ContextMediaItem = {
  id?: string;
  url: string;
  media_type: 'image' | 'video';
  tags: string[];
  _isNew?: boolean;
};

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ProductSlideOver({
  isNew,
  product,
  variants: initialVariants = [],
  suppliers,
  existingCategories,
  shopId,
  onClose,
  onSaved,
  onMovementAdded,
}: Props) {
  const [isPending, startTransition] = useTransition();

  // Form state
  const [images, setImages] = useState<string[]>(product?.images ?? []);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [imageErrors, setImageErrors] = useState<string[]>([]);
  const [dragOver, setDragOver] = useState(false);

  const [name, setName] = useState(product?.name ?? '');
  const [description, setDescription] = useState(product?.description ?? '');
  const [category, setCategory] = useState(product?.category ?? '');
  const [categoryInput, setCategoryInput] = useState(product?.category ?? '');
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [tags, setTags] = useState<string[]>(product?.tags ?? []);
  const [tagInput, setTagInput] = useState('');

  const [price, setPrice] = useState(product?.price?.toString() ?? '');
  const [compareAtPrice, setCompareAtPrice] = useState(product?.compare_at_price?.toString() ?? '');
  const [costPrice, setCostPrice] = useState(product?.cost_price?.toString() ?? '');
  const [sku, setSku] = useState(product?.sku ?? '');
  const [showSkuScanner, setShowSkuScanner] = useState(false);
  const [stock, setStock] = useState(product?.stock_quantity?.toString() ?? '0');
  const [lowStockThreshold, setLowStockThreshold] = useState(product?.low_stock_threshold?.toString() ?? '5');
  const [defaultSupplierId, setDefaultSupplierId] = useState(product?.default_supplier_id ?? '');
  const [isActive, setIsActive] = useState(product?.is_active ?? true);

  // Variants
  const [variants, setVariants] = useState<(Variant & { _isNew?: boolean; _deleted?: boolean })[]>(initialVariants);
  const [showVariantBuilder, setShowVariantBuilder] = useState(initialVariants.length > 0);
  const [variantOptionName, setVariantOptionName] = useState('');
  const [variantOptionValues, setVariantOptionValues] = useState('');

  // Stock movements (for detail view)
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [movementsLoaded, setMovementsLoaded] = useState(false);

  // Manual adjust
  const [adjustDelta, setAdjustDelta] = useState('');
  const [adjustNote, setAdjustNote] = useState('');
  const [adjustError, setAdjustError] = useState('');

  // Restock
  const [showRestockForm, setShowRestockForm] = useState(false);
  const [restockQty, setRestockQty] = useState('');
  const [restockSupplierId, setRestockSupplierId] = useState('');
  const [restockCost, setRestockCost] = useState('');
  const [restockNote, setRestockNote] = useState('');

  // Validation
  const [errors, setErrors] = useState<Record<string, string>>({});

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [contextMedia, setContextMedia] = useState<ContextMediaItem[]>([]);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [mediaErrors, setMediaErrors] = useState<string[]>([]);
  const mediaInputRef = useRef<HTMLInputElement>(null);
  const [mediaDragOver, setMediaDragOver] = useState(false);
  const isScraped = product?.source === 'scraped';

  // Load movements and context media on detail view
  useEffect(() => {
    if (!isNew && product?.id) {
      if (!movementsLoaded) {
        getStockMovements(product.id).then(data => {
          setMovements(data as StockMovement[]);
          setMovementsLoaded(true);
        });
      }
      getProductMedia(product.id).then(data => {
        setContextMedia(data as ContextMediaItem[]);
      });
    }
  }, [isNew, product?.id, movementsLoaded]);

  // Image handling
  const handleImageFiles = useCallback(async (files: FileList | File[]) => {
    const arr = Array.from(files);
    const errors: string[] = [];
    const valid: File[] = [];
    for (const f of arr) {
      if (!f.type.startsWith('image/')) errors.push(`${f.name}: not an image`);
      else if (f.size > 10 * 1024 * 1024) errors.push(`${f.name}: exceeds 10MB`);
      else valid.push(f);
    }
    setImageErrors(errors);
    if (!valid.length) return;

    setUploadingImages(true);
    try {
      const urls = await Promise.all(valid.map(f => uploadImage(f, shopId)));
      setImages(prev => [...prev, ...urls]);
    } catch (err) {
      setImageErrors(prev => [...prev, err instanceof Error ? err.message : 'Upload failed']);
    } finally {
      setUploadingImages(false);
    }
  }, [shopId]);

  // Context Media handling
  const handleContextMediaFiles = useCallback(async (files: FileList | File[]) => {
    const arr = Array.from(files);
    const errors: string[] = [];
    const valid: { file: File; media_type: 'image' | 'video' }[] = [];
    
    for (const f of arr) {
      if (f.type.startsWith('video/')) {
        if (f.size > 25 * 1024 * 1024) {
          errors.push(`${f.name}: exceeds 25MB`);
        } else {
          try {
            const duration = await getVideoDuration(f);
            if (duration > 60) {
              errors.push(`${f.name}: exceeds 60 seconds (is ${Math.round(duration)}s)`);
            } else {
              valid.push({ file: f, media_type: 'video' });
            }
          } catch (e) {
            errors.push(`${f.name}: invalid video format or unable to read duration`);
          }
        }
      } else if (f.type.startsWith('image/')) {
        if (f.size > 10 * 1024 * 1024) {
          errors.push(`${f.name}: exceeds 10MB`);
        } else {
          valid.push({ file: f, media_type: 'image' });
        }
      } else {
        errors.push(`${f.name}: only images and videos are supported`);
      }
    }
    
    setMediaErrors(errors);
    if (!valid.length) return;
    
    setUploadingMedia(true);
    try {
      const items = await Promise.all(
        valid.map(async ({ file, media_type }) => {
          const url = await uploadImage(file, shopId);
          return {
            url,
            media_type,
            tags: [],
            _isNew: true,
          } as ContextMediaItem;
        })
      );
      setContextMedia(prev => [...prev, ...items]);
    } catch (err) {
      setMediaErrors(prev => [...prev, err instanceof Error ? err.message : 'Upload failed']);
    } finally {
      setUploadingMedia(false);
    }
  }, [shopId]);

  // Variant generation
  const generateVariants = () => {
    if (!variantOptionName.trim() || !variantOptionValues.trim()) return;
    const values = variantOptionValues.split(',').map(v => v.trim()).filter(Boolean);
    const newVariants: (Variant & { _isNew?: boolean })[] = values.map(v => ({
      id: `new-${Date.now()}-${Math.random()}`,
      product_id: product?.id ?? '',
      name: `${variantOptionName}: ${v}`,
      sku: '',
      price_override: null,
      stock: 0,
      _isNew: true,
    }));
    setVariants(prev => [...prev, ...newVariants]);
    setVariantOptionName('');
    setVariantOptionValues('');
  };

  // Tags
  const addTag = (t: string) => {
    const trimmed = t.trim();
    if (trimmed && !tags.includes(trimmed)) setTags(prev => [...prev, trimmed]);
    setTagInput('');
  };

  // Validation
  const validate = () => {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = 'Product name is required';
    const p = parseFloat(price);
    if (!price || isNaN(p) || p <= 0) e.price = 'A valid price is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // Save
  const handleSave = () => {
    if (!validate()) return;

    startTransition(async () => {
      const totalVariantStock = variants.filter(v => !v._deleted).reduce((s, v) => s + (v.stock || 0), 0);
      const hasVariants = variants.filter(v => !v._deleted).length > 0;

      const input: ProductInput = {
        name: name.trim(),
        description: description.trim() || undefined,
        price: parseFloat(price),
        compare_at_price: compareAtPrice ? parseFloat(compareAtPrice) : null,
        cost_price: costPrice ? parseFloat(costPrice) : null,
        stock_quantity: hasVariants ? totalVariantStock : parseInt(stock, 10) || 0,
        sku: sku.trim() || null,
        category: category.trim() || null,
        tags: tags.length ? tags : null,
        images: images.length ? images : null,
        low_stock_threshold: parseInt(lowStockThreshold, 10) || 5,
        default_supplier_id: defaultSupplierId || null,
        is_active: isActive,
        draft: product?.draft ?? false,
      };

      if (isNew) {
        const res = await addProduct(input);
        if (res?.error) { setErrors({ _form: res.error }); return; }

        // Add variants if any
        const newVariants = variants.filter(v => v._isNew);
        if (newVariants.length && res?.productId) {
          await addVariants(res.productId, newVariants as VariantInput[]);
        }

        // Save context media
        if (res?.productId) {
          await saveProductMedia(res.productId, contextMedia.map(m => ({ url: m.url, media_type: m.media_type, tags: m.tags })));
        }

        onSaved({ id: res?.productId ?? '', ...input, currency: 'BDT', draft: false, is_active: input.is_active ?? true }, true);
        onMovementAdded?.();
      } else {
        await updateProduct(product!.id, input);

        // Handle variant changes
        for (const v of variants) {
          if (v._isNew && !v._deleted) {
            await addVariants(product!.id, [v as VariantInput]);
          } else if (!v._isNew && !v._deleted) {
            await updateVariant(v.id, { name: v.name, sku: v.sku, price_override: v.price_override, stock: v.stock });
          } else if (v._deleted && !v._isNew) {
            await deleteVariant(v.id);
          }
        }

        // Save context media
        await saveProductMedia(product!.id, contextMedia.map(m => ({ url: m.url, media_type: m.media_type, tags: m.tags })));

        onSaved({ ...product!, ...input }, false);
        onMovementAdded?.();
      }
    });
  };

  // Manual adjust submit
  const handleAdjust = () => {
    const delta = parseInt(adjustDelta, 10);
    if (isNaN(delta) || delta === 0) { setAdjustError('Enter a non-zero quantity'); return; }
    if (!adjustNote.trim()) { setAdjustError('A reason note is required'); return; }
    setAdjustError('');
    startTransition(async () => {
      const res = await manualStockAdjust(product!.id, delta, adjustNote);
      if (res?.error) { setAdjustError(res.error); return; }
      setAdjustDelta('');
      setAdjustNote('');
      if (res && 'resultingStock' in res) {
        onSaved({ ...product!, stock_quantity: res.resultingStock ?? 0 }, false);
      }
      onMovementAdded?.();
      // Refresh movements
      getStockMovements(product!.id).then(data => setMovements(data as StockMovement[]));
    });
  };

  // Restock submit
  const handleRestock = () => {
    const qty = parseInt(restockQty, 10);
    if (isNaN(qty) || qty <= 0) return;
    startTransition(async () => {
      const res = await restockProduct(
        product!.id,
        qty,
        restockNote || 'Restock',
        null,
        restockSupplierId || null,
        restockCost ? parseFloat(restockCost) : null
      );
      setShowRestockForm(false);
      setRestockQty('');
      setRestockNote('');
      setRestockCost('');
      setRestockSupplierId('');
      if (res && 'resultingStock' in res) {
        onSaved({ ...product!, stock_quantity: res.resultingStock ?? 0 }, false);
      }
      onMovementAdded?.();
      getStockMovements(product!.id).then(data => setMovements(data as StockMovement[]));
    });
  };

  const filteredCategories = existingCategories.filter(
    c => c.toLowerCase().includes(categoryInput.toLowerCase()) && c !== category
  );

  const totalVariantStock = variants.filter(v => !v._deleted).reduce((s, v) => s + (v.stock || 0), 0);
  const activeVariants = variants.filter(v => !v._deleted);
  const hasVariants = activeVariants.length > 0;

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div className="flex-1 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div className="w-full max-w-2xl bg-white shadow-subtle overflow-y-auto flex flex-col">
        {/* Header */}
        <div className="sticky top-0 bg-white z-10 flex items-center justify-between px-6 py-4 border-b border-dove/10">
          <h2 className="text-base font-medium text-ink">
            {isNew ? 'Add Product' : (isNew === false && product?.draft ? 'Review Draft' : `Edit: ${product?.name}`)}
          </h2>
          <div className="flex items-center gap-3">
            {!isNew && !isScraped && (
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <span className="text-xs text-ash">Draft</span>
                <button
                  type="button"
                  onClick={() => setIsActive(v => !v)}
                  className={`relative w-10 h-5 rounded-full transition-colors ${isActive ? 'bg-ink' : 'bg-dove/40'}`}
                >
                  <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${isActive ? 'left-5' : 'left-0.5'}`} />
                </button>
                <span className="text-xs text-ash">Live</span>
              </label>
            )}
            <button onClick={onClose} className="p-1.5 rounded-lg text-graphite hover:text-ink hover:bg-fog transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-dove/10">

          {/* ── 1. Images ─────────────────────────────────────────────── */}
          <section className="p-6 space-y-4">
            <h3 className="text-xs font-medium text-ash uppercase tracking-wider">Images</h3>

            <div
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={e => {
                e.preventDefault();
                setDragOver(false);
                handleImageFiles(e.dataTransfer.files);
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
                onChange={e => { if (e.target.files) handleImageFiles(e.target.files); }}
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
                {images.map((url, idx) => (
                  <div key={url} className="relative group">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={url}
                      alt={`Product ${idx + 1}`}
                      className="w-20 h-20 object-cover rounded-images border border-dove/10"
                    />
                    {idx === 0 && (
                      <span className="absolute top-1 left-1 bg-ink text-white text-[10px] px-1.5 py-0.5 rounded-tags">
                        Primary
                      </span>
                    )}
                    <button
                      onClick={() => setImages(prev => prev.filter((_, i) => i !== idx))}
                      className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 text-white hidden group-hover:flex items-center justify-center"
                    >
                      <X className="w-3 h-3" />
                    </button>
                    <div className="absolute bottom-1 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab">
                      <GripVertical className="w-4 h-4 text-white drop-shadow" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* ── 1.5. Context Media (Phase 13) ───────────────────────── */}
          <section className="p-6 space-y-4 border-t border-dove/10">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-medium text-ink uppercase tracking-wider">Context Media</h3>
                <p className="text-[11px] text-ash mt-0.5">Used by AI to answer query details (e.g. real photos/videos)</p>
              </div>
            </div>

            <div
              onDragOver={e => { e.preventDefault(); setMediaDragOver(true); }}
              onDragLeave={() => setMediaDragOver(false)}
              onDrop={e => {
                e.preventDefault();
                setMediaDragOver(false);
                handleContextMediaFiles(e.dataTransfer.files);
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
                onChange={e => { if (e.target.files) handleContextMediaFiles(e.target.files); }}
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
                {contextMedia.map((item, idx) => (
                  <div key={item.url} className="flex gap-4 p-3 bg-fog rounded-cards border border-dove/10 relative group">
                    <div className="w-16 h-16 shrink-0 relative bg-dove/10 rounded-images overflow-hidden flex items-center justify-center">
                      {item.media_type === 'video' ? (
                        <video src={item.url} className="w-full h-full object-cover" muted playsInline />
                      ) : (
                        <img src={item.url} alt="Context media" className="w-full h-full object-cover" />
                      )}
                      <span className="absolute bottom-0 right-0 bg-black/60 text-white text-[9px] px-1 rounded-tl">
                        {item.media_type}
                      </span>
                    </div>

                    <div className="flex-1 space-y-1">
                      <label className="text-[11px] font-medium text-ash">AI Lookup Tags (comma separated)</label>
                      <input
                        type="text"
                        value={item.tags.join(', ')}
                        placeholder="e.g. #realpic, model wearing, blue color"
                        onChange={(e) => {
                          const val = e.target.value;
                          setContextMedia(prev => prev.map((x, i) => {
                            if (i !== idx) return x;
                            const newTags = val.split(',').map(t => t.trim()).filter(Boolean);
                            return { ...x, tags: newTags };
                          }));
                        }}
                        className="w-full bg-white border border-dove/20 rounded-inputs px-3 py-1.5 text-xs text-ink focus:border-ink/20 focus:outline-none placeholder:text-dove"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => setContextMedia(prev => prev.filter((_, i) => i !== idx))}
                      className="absolute top-2 right-2 w-6 h-6 rounded-full bg-white border border-dove/20 hover:border-rust/30 text-ash hover:text-rust flex items-center justify-center transition-colors cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* ── 2. Core Details ───────────────────────────────────────── */}
          <section className="p-6 space-y-4">
            <h3 className="text-xs font-medium text-ash uppercase tracking-wider">Core Details</h3>

            <div className="space-y-1">
              <label className="text-xs font-medium text-ash">Name <span className="text-rust">*</span></label>
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Product name"
                className={`w-full bg-fog border rounded-inputs px-4 py-2.5 text-sm text-ink focus:outline-none placeholder:text-dove ${
                  errors.name ? 'border-red-400 focus:border-red-400' : 'border-transparent focus:border-ink/20'
                }`}
              />
              {errors.name && <p className="text-xs text-rust flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.name}</p>}
            </div>

            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <label className="text-xs font-medium text-ash">Description</label>
                <span className="text-xs text-dove">{description.length} chars</span>
              </div>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Detailed product description — this feeds the AI sales context directly. Include size, material, key features."
                rows={5}
                className="w-full bg-fog border border-transparent rounded-inputs px-4 py-2.5 text-sm text-ink focus:border-ink/20 focus:outline-none placeholder:text-dove resize-none"
              />
            </div>

            {/* Category */}
            <div className="space-y-1 relative">
              <label className="text-xs font-medium text-ash">Category</label>
              <input
                value={categoryInput}
                onChange={e => { setCategoryInput(e.target.value); setShowCategoryDropdown(true); }}
                onFocus={() => setShowCategoryDropdown(true)}
                onBlur={() => setTimeout(() => setShowCategoryDropdown(false), 150)}
                placeholder={CATEGORIES_PLACEHOLDER}
                className="w-full bg-fog border border-transparent rounded-inputs px-4 py-2.5 text-sm text-ink focus:border-ink/20 focus:outline-none placeholder:text-dove"
              />
              {showCategoryDropdown && (filteredCategories.length > 0 || categoryInput) && (
                <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-subtle border border-dove/10 max-h-40 overflow-y-auto">
                  {filteredCategories.map(c => (
                    <button
                      key={c}
                      onMouseDown={() => { setCategory(c); setCategoryInput(c); setShowCategoryDropdown(false); }}
                      className="w-full text-left px-4 py-2 text-sm text-ink hover:bg-fog transition-colors"
                    >
                      {c}
                    </button>
                  ))}
                  {categoryInput && !existingCategories.includes(categoryInput) && (
                    <button
                      onMouseDown={() => { setCategory(categoryInput); setShowCategoryDropdown(false); }}
                      className="w-full text-left px-4 py-2 text-sm text-ink hover:bg-fog transition-colors flex items-center gap-2"
                    >
                      <Plus className="w-3 h-3 text-graphite" />
                      Add &quot;{categoryInput}&quot;
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Tags */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-ash">Tags</label>
              <div className="flex flex-wrap gap-1.5">
                {tags.map(t => (
                  <span key={t} className="flex items-center gap-1 bg-fog text-ash text-xs px-2.5 py-1 rounded-tags">
                    {t}
                    <button onClick={() => setTags(prev => prev.filter(x => x !== t))} className="ml-0.5 hover:text-rust">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
                <input
                  value={tagInput}
                  onChange={e => setTagInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag(tagInput); } }}
                  onBlur={() => { if (tagInput.trim()) addTag(tagInput); }}
                  placeholder="Add tag, press Enter"
                  className="bg-fog border border-transparent rounded-inputs px-3 py-1 text-xs text-ink focus:border-ink/20 focus:outline-none placeholder:text-dove min-w-[120px]"
                />
              </div>
            </div>
          </section>

          {/* ── 3. Pricing & Stock ────────────────────────────────────── */}
          <section className="p-6 space-y-4">
            <h3 className="text-xs font-medium text-ash uppercase tracking-wider">Pricing & Stock</h3>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-medium text-ash">Price (৳) <span className="text-rust">*</span></label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={price}
                  onChange={e => setPrice(e.target.value)}
                  placeholder="0.00"
                  className={`w-full bg-fog border rounded-inputs px-4 py-2.5 text-sm text-ink focus:outline-none placeholder:text-dove ${
                    errors.price ? 'border-red-400' : 'border-transparent focus:border-ink/20'
                  }`}
                />
                {errors.price && <p className="text-xs text-rust">{errors.price}</p>}
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-ash">Compare-at Price</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={compareAtPrice}
                  onChange={e => setCompareAtPrice(e.target.value)}
                  placeholder="Original price (sale display)"
                  className="w-full bg-fog border border-transparent rounded-inputs px-4 py-2.5 text-sm text-ink focus:border-ink/20 focus:outline-none placeholder:text-dove"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-ash">Cost Price</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={costPrice}
                  onChange={e => setCostPrice(e.target.value)}
                  placeholder="For valuation (not shown to customers)"
                  className="w-full bg-fog border border-transparent rounded-inputs px-4 py-2.5 text-sm text-ink focus:border-ink/20 focus:outline-none placeholder:text-dove"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-ash">SKU</label>
                <div className="flex gap-2">
                  <input
                    value={sku}
                    onChange={e => setSku(e.target.value)}
                    placeholder="e.g. PROD-001"
                    className="flex-1 bg-fog border border-transparent rounded-inputs px-4 py-2.5 text-sm text-ink focus:border-ink/20 focus:outline-none placeholder:text-dove"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSkuScanner(true)}
                    className="w-[42px] h-[42px] rounded-inputs border border-dove/20 flex items-center justify-center text-graphite hover:text-ink hover:border-ink/30 bg-white transition-colors cursor-pointer shrink-0"
                    title="Scan Barcode"
                  >
                    <ScanLine className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Stock and threshold — only editable if no variants */}
            {!hasVariants && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-ash">Stock Quantity</label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setStock(s => String(Math.max(0, parseInt(s, 10) - 1)))}
                      className="w-8 h-8 rounded-inputs border border-dove/20 flex items-center justify-center text-graphite hover:text-ink hover:border-ink/30 transition-colors"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <input
                      type="number"
                      min="0"
                      value={stock}
                      onChange={e => setStock(e.target.value)}
                      className="w-16 text-center bg-fog border border-transparent rounded-inputs px-2 py-2 text-sm text-ink focus:border-ink/20 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setStock(s => String(parseInt(s, 10) + 1))}
                      className="w-8 h-8 rounded-inputs border border-dove/20 flex items-center justify-center text-graphite hover:text-ink hover:border-ink/30 transition-colors"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-ash">Low Stock Threshold</label>
                  <input
                    type="number"
                    min="0"
                    value={lowStockThreshold}
                    onChange={e => setLowStockThreshold(e.target.value)}
                    className="w-full bg-fog border border-transparent rounded-inputs px-4 py-2.5 text-sm text-ink focus:border-ink/20 focus:outline-none"
                  />
                </div>
              </div>
            )}

            {hasVariants && (
              <div className="bg-fog rounded-xl px-4 py-3 flex items-center justify-between">
                <span className="text-sm text-ash">Total variant stock:</span>
                <span className="text-sm font-medium text-ink">{totalVariantStock} units</span>
              </div>
            )}

            {/* Default supplier */}
            {suppliers.length > 0 && (
              <div className="space-y-1">
                <label className="text-xs font-medium text-ash">Default Supplier</label>
                <div className="relative">
                  <select
                    value={defaultSupplierId}
                    onChange={e => setDefaultSupplierId(e.target.value)}
                    className="w-full bg-fog border border-transparent rounded-inputs px-4 py-2.5 pr-8 text-sm text-ink focus:outline-none appearance-none"
                  >
                    <option value="">No default supplier</option>
                    {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-graphite pointer-events-none" />
                </div>
              </div>
            )}
          </section>

          {/* ── 4. Variants ───────────────────────────────────────────── */}
          <section className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-medium text-ash uppercase tracking-wider">Variants</h3>
              <button
                type="button"
                onClick={() => setShowVariantBuilder(v => !v)}
                className="text-xs text-graphite hover:text-ink flex items-center gap-1 transition-colors"
              >
                <Plus className="w-3 h-3" />
                {showVariantBuilder ? 'Hide' : 'Add Variants'}
              </button>
            </div>

            {showVariantBuilder && (
              <div className="bg-fog rounded-xl p-4 space-y-3">
                <p className="text-xs text-ash">Define option types and values to generate a variant grid.</p>
                <div className="flex gap-2">
                  <input
                    value={variantOptionName}
                    onChange={e => setVariantOptionName(e.target.value)}
                    placeholder="Option name (e.g. Size)"
                    className="flex-1 bg-white border border-transparent rounded-inputs px-3 py-2 text-sm text-ink focus:border-ink/20 focus:outline-none placeholder:text-dove"
                  />
                  <input
                    value={variantOptionValues}
                    onChange={e => setVariantOptionValues(e.target.value)}
                    placeholder="Values (S, M, L, XL)"
                    className="flex-1 bg-white border border-transparent rounded-inputs px-3 py-2 text-sm text-ink focus:border-ink/20 focus:outline-none placeholder:text-dove"
                  />
                  <button
                    type="button"
                    onClick={generateVariants}
                    className="px-4 py-2 rounded-inputs bg-ink text-white text-xs font-medium hover:bg-black transition-colors"
                  >
                    Generate
                  </button>
                </div>
              </div>
            )}

            {activeVariants.length > 0 && (
              <div className="space-y-2">
                {activeVariants.map((v, idx) => (
                  <div key={v.id} className="flex gap-2 items-center">
                    <div className="flex-1 grid grid-cols-3 gap-2">
                      <input
                        value={v.name}
                        onChange={e => setVariants(prev => prev.map((x, i) => i === variants.indexOf(v) ? { ...x, name: e.target.value } : x))}
                        placeholder="Variant name"
                        className="bg-fog border border-transparent rounded-inputs px-3 py-2 text-xs text-ink focus:border-ink/20 focus:outline-none placeholder:text-dove"
                      />
                      <input
                        value={v.sku ?? ''}
                        onChange={e => setVariants(prev => prev.map((x, i) => i === variants.indexOf(v) ? { ...x, sku: e.target.value } : x))}
                        placeholder="SKU"
                        className="bg-fog border border-transparent rounded-inputs px-3 py-2 text-xs text-ink focus:border-ink/20 focus:outline-none placeholder:text-dove"
                      />
                      <input
                        type="number"
                        min="0"
                        value={v.stock}
                        onChange={e => setVariants(prev => prev.map((x, i) => i === variants.indexOf(v) ? { ...x, stock: parseInt(e.target.value, 10) || 0 } : x))}
                        placeholder="Stock"
                        className="bg-fog border border-transparent rounded-inputs px-3 py-2 text-xs text-ink focus:border-ink/20 focus:outline-none placeholder:text-dove"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => setVariants(prev => prev.map(x => x.id === v.id ? { ...x, _deleted: true } : x))}
                      className="p-1.5 text-graphite hover:text-rust transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* ── 5. Stock Adjustments (edit only) ──────────────────────── */}
          {!isNew && (
            <section className="p-6 space-y-5">
              <h3 className="text-xs font-medium text-ash uppercase tracking-wider">Stock Management</h3>

              {/* Manual adjust */}
              <div className="bg-fog rounded-xl p-4 space-y-3">
                <p className="text-xs font-medium text-ink">Manual Adjustment</p>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={adjustDelta}
                    onChange={e => setAdjustDelta(e.target.value)}
                    placeholder="+10 or -5"
                    className="w-24 bg-white border border-transparent rounded-inputs px-3 py-2 text-sm text-ink focus:border-ink/20 focus:outline-none placeholder:text-dove"
                  />
                  <input
                    value={adjustNote}
                    onChange={e => setAdjustNote(e.target.value)}
                    placeholder="Reason (required)"
                    className="flex-1 bg-white border border-transparent rounded-inputs px-3 py-2 text-sm text-ink focus:border-ink/20 focus:outline-none placeholder:text-dove"
                  />
                  <button
                    type="button"
                    onClick={handleAdjust}
                    disabled={isPending}
                    className="px-4 py-2 rounded-inputs bg-ink text-white text-xs font-medium hover:bg-black transition-colors disabled:opacity-50"
                  >
                    {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Apply'}
                  </button>
                </div>
                {adjustError && <p className="text-xs text-rust flex items-center gap-1"><AlertCircle className="w-3 h-3" />{adjustError}</p>}
              </div>

              {/* Restock */}
              <div className="bg-fog rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-ink">Restock</p>
                  <button
                    type="button"
                    onClick={() => setShowRestockForm(v => !v)}
                    className="text-xs text-graphite hover:text-ink transition-colors"
                  >
                    {showRestockForm ? 'Cancel' : 'New Restock'}
                  </button>
                </div>

                {showRestockForm && (
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="number"
                        min="1"
                        value={restockQty}
                        onChange={e => setRestockQty(e.target.value)}
                        placeholder="Quantity"
                        className="bg-white border border-transparent rounded-inputs px-3 py-2 text-sm text-ink focus:border-ink/20 focus:outline-none placeholder:text-dove"
                      />
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={restockCost}
                        onChange={e => setRestockCost(e.target.value)}
                        placeholder="Cost per unit (৳)"
                        className="bg-white border border-transparent rounded-inputs px-3 py-2 text-sm text-ink focus:border-ink/20 focus:outline-none placeholder:text-dove"
                      />
                    </div>
                    {suppliers.length > 0 && (
                      <select
                        value={restockSupplierId}
                        onChange={e => setRestockSupplierId(e.target.value)}
                        className="w-full bg-white border border-transparent rounded-inputs px-3 py-2 text-sm text-ink focus:outline-none"
                      >
                        <option value="">Select supplier (optional)</option>
                        {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                      </select>
                    )}
                    <input
                      value={restockNote}
                      onChange={e => setRestockNote(e.target.value)}
                      placeholder="Note (optional)"
                      className="w-full bg-white border border-transparent rounded-inputs px-3 py-2 text-sm text-ink focus:border-ink/20 focus:outline-none placeholder:text-dove"
                    />
                    <button
                      type="button"
                      onClick={handleRestock}
                      disabled={!restockQty || isPending}
                      className="w-full flex items-center justify-center gap-2 py-2 rounded-inputs bg-ink text-white text-xs font-medium hover:bg-black transition-colors disabled:opacity-50"
                    >
                      {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
                      Confirm Restock
                    </button>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* ── 6. Stock Movements Log (edit only) ────────────────────── */}
          {!isNew && (
            <section className="p-6 space-y-3">
              <h3 className="text-xs font-medium text-ash uppercase tracking-wider">Stock Movement History</h3>

              {!movementsLoaded ? (
                <div className="flex items-center gap-2 text-ash text-sm">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Loading history…
                </div>
              ) : movements.length === 0 ? (
                <p className="text-sm text-dove">No stock movements recorded yet.</p>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {movements.map(m => {
                    const isPos = m.quantity_delta > 0;
                    return (
                      <div key={m.id} className="flex items-start justify-between py-2 border-b border-dove/10 last:border-0">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs bg-fog text-graphite px-1.5 py-0.5 rounded capitalize">
                              {m.change_type.replace('_', ' ')}
                            </span>
                            {m.note && <span className="text-xs text-ash truncate">{m.note}</span>}
                          </div>
                          {m.suppliers?.name && (
                            <span className="text-xs text-dove">via {m.suppliers.name}</span>
                          )}
                        </div>
                        <div className="text-right shrink-0 ml-3">
                          <p className={`text-sm font-medium ${isPos ? 'text-green-700' : 'text-rust'}`}>
                            {isPos ? '+' : ''}{m.quantity_delta}
                          </p>
                          <p className="text-xs text-dove">→ {m.resulting_stock}</p>
                          <p className="text-xs text-dove">
                            {new Date(m.created_at).toLocaleDateString('en-BD', { day: 'numeric', month: 'short' })}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white border-t border-dove/10 px-6 py-4 flex items-center justify-between">
          {errors._form && (
            <p className="text-xs text-rust flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />{errors._form}
            </p>
          )}
          <div className="flex gap-3 ml-auto">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-ash hover:text-ink transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isPending}
              className="flex items-center gap-2 px-6 py-2.5 rounded-buttons bg-ink text-white text-sm font-medium hover:bg-black transition-colors disabled:opacity-50"
            >
              {isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Check className="w-4 h-4" />
              )}
              {isNew ? 'Add Product' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
      {showSkuScanner && (
        <BarcodeScanner
          onResult={(text) => {
            setSku(text);
            setShowSkuScanner(false);
          }}
          onClose={() => setShowSkuScanner(false)}
        />
      )}
    </div>
  );
}
