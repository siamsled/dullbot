import { useRef, useState } from 'react';
import { Plus, X, ScanLine, Image as ImageIcon, Trash2 } from 'lucide-react';
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
  images: { url: string; displayUrl: string }[];
  shopId: string;
  setPreviewMedia: (v: { url: string; type: 'image' | 'video'; title?: string } | null) => void;
  setScanningTarget: (v: string | null) => void;
  setActiveTab: (tab: 'Inventory') => void;
}

export default function ProductVariants({
  variants, setVariants, showVariantBuilder, setShowVariantBuilder,
  variantOptionName, setVariantOptionName, variantOptionValues, setVariantOptionValues,
  generateVariants, addVariant, images, shopId, setPreviewMedia, setScanningTarget, setActiveTab
}: ProductVariantsProps) {
  
  const [variantImageTarget, setVariantImageTarget] = useState<string | null>(null);
  const variantFileInputRef = useRef<HTMLInputElement>(null);
  
  const activeVariants = variants.filter(v => !v._deleted);

  return (
    <div className="p-6 space-y-8 animate-in fade-in">
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-medium text-ash uppercase tracking-wider">Variant Options</h3>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={addVariant}
              className="text-xs text-graphite hover:text-ink flex items-center gap-1 transition-colors px-3 py-1.5 rounded-lg hover:bg-fog font-medium"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Variant
            </button>
            <button
              type="button"
              onClick={() => setShowVariantBuilder(v => !v)}
              className={`text-xs flex items-center gap-1 transition-colors px-3 py-1.5 rounded-lg font-medium ${showVariantBuilder ? 'bg-ink text-white' : 'text-graphite hover:text-ink hover:bg-fog'}`}
            >
              {showVariantBuilder ? 'Close Generator' : 'Generate Options'}
            </button>
          </div>
        </div>

        {showVariantBuilder && (
          <div className="bg-fog rounded-xl p-5 space-y-4 border border-dove/10 animate-in slide-in-from-top-2">
            <p className="text-sm text-ash font-medium">Define option types and values to instantly generate a variant grid.</p>
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                value={variantOptionName}
                onChange={e => setVariantOptionName(e.target.value)}
                placeholder="Option name (e.g. Size, Color)"
                className="flex-1 bg-white border border-transparent rounded-inputs px-4 py-2.5 text-sm text-ink focus:border-ink/20 focus:outline-none placeholder:text-dove"
              />
              <input
                value={variantOptionValues}
                onChange={e => setVariantOptionValues(e.target.value)}
                placeholder="Values (comma separated: S, M, L, XL)"
                className="flex-[2] bg-white border border-transparent rounded-inputs px-4 py-2.5 text-sm text-ink focus:border-ink/20 focus:outline-none placeholder:text-dove"
              />
              <button
                type="button"
                onClick={generateVariants}
                className="px-6 py-2.5 rounded-inputs bg-ink text-white text-sm font-medium hover:bg-black transition-colors"
              >
                Generate
              </button>
            </div>
          </div>
        )}

        {activeVariants.length > 0 && (
          <div className="border border-dove/10 rounded-xl overflow-hidden bg-white mt-6">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-fog border-b border-dove/10">
                    <th className="px-4 py-3 text-[11px] font-bold text-ash uppercase tracking-wider w-12">Img</th>
                    <th className="px-4 py-3 text-[11px] font-bold text-ash uppercase tracking-wider min-w-[200px]">Variant Name</th>
                    <th className="px-4 py-3 text-[11px] font-bold text-ash uppercase tracking-wider min-w-[150px]">SKU</th>
                    <th className="px-4 py-3 text-[11px] font-bold text-ash uppercase tracking-wider min-w-[120px]">Price (৳)</th>
                    <th className="px-4 py-3 text-[11px] font-bold text-ash uppercase tracking-wider min-w-[100px]">Stock</th>
                    <th className="px-4 py-3 text-[11px] font-bold text-ash uppercase tracking-wider w-12"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dove/10">
                  {activeVariants.map((v) => (
                    <tr key={v.id} className="hover:bg-fog/30 transition-colors">
                      <td className="px-4 py-3 align-middle">
                        <div className="relative flex items-center shrink-0">
                          {v.image_url ? (
                            <div className="relative w-10 h-10 rounded-lg overflow-hidden border border-dove/20 shrink-0 group/vimg cursor-pointer">
                              <img
                                src={v.displayUrl || v.image_url}
                                alt={v.name}
                                className="w-full h-full object-cover"
                                onClick={() => setPreviewMedia({ url: v.displayUrl || v.image_url!, type: 'image', title: `Variant Photo: ${v.name}` })}
                              />
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); setVariants(prev => prev.map(x => x.id === v.id ? { ...x, image_url: null, displayUrl: null } : x)); }}
                                className="absolute inset-0 bg-black/60 opacity-0 group-hover/vimg:opacity-100 flex items-center justify-center text-white transition-opacity cursor-pointer"
                                title="Remove Variant Image"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ) : (
                            <div className="relative">
                              <button
                                type="button"
                                onClick={() => setVariantImageTarget(variantImageTarget === v.id ? null : v.id)}
                                className="w-10 h-10 rounded-lg border border-dashed border-dove/30 hover:border-ink/30 flex items-center justify-center text-ash hover:text-ink transition-colors cursor-pointer shrink-0 bg-fog"
                                title="Attach Variant Image"
                              >
                                <ImageIcon className="w-4 h-4" />
                              </button>

                              {variantImageTarget === v.id && (
                                <div className="absolute z-30 left-0 top-12 w-56 bg-white border border-dove/20 rounded-cards shadow-dropdown p-3 space-y-3">
                                  <p className="text-[10px] font-bold text-ash uppercase tracking-wider">Pick from Photos</p>
                                  {images.length > 0 ? (
                                    <div className="grid grid-cols-4 gap-2">
                                      {images.map((imgItem, iIdx) => {
                                        const srcUrl = imgItem.displayUrl || imgItem.url;
                                        return (
                                          <button
                                            key={srcUrl || iIdx}
                                            type="button"
                                            onClick={() => {
                                              setVariants(prev => prev.map(x => x.id === v.id ? { ...x, image_url: imgItem.url, displayUrl: imgItem.displayUrl } : x));
                                              setVariantImageTarget(null);
                                            }}
                                            className="w-10 h-10 rounded-md overflow-hidden border border-dove/10 hover:border-ink hover:ring-2 hover:ring-ink/20 transition-all cursor-pointer"
                                          >
                                            <img src={srcUrl} alt="Product photo" className="w-full h-full object-cover" />
                                          </button>
                                        );
                                      })}
                                    </div>
                                  ) : (
                                    <p className="text-xs text-dove">No product photos uploaded yet.</p>
                                  )}

                                  <div className="pt-2 border-t border-dove/10">
                                    <button
                                      type="button"
                                      onClick={() => { variantFileInputRef.current?.click(); }}
                                      className="w-full py-1.5 text-xs text-center text-ink bg-fog hover:bg-dove/10 rounded-md font-medium transition-colors cursor-pointer"
                                    >
                                      + Upload New Photo
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                      
                      <td className="px-4 py-3 align-middle">
                        <input
                          value={v.name}
                          onChange={e => setVariants(prev => prev.map(x => x.id === v.id ? { ...x, name: e.target.value } : x))}
                          placeholder="Variant name"
                          className="w-full bg-transparent border border-transparent hover:bg-fog focus:bg-white rounded-md px-2 py-1.5 text-sm text-ink focus:border-ink/20 focus:outline-none transition-colors"
                        />
                      </td>
                      
                      <td className="px-4 py-3 align-middle">
                        <div className="relative flex items-center group/sku">
                          <input
                            value={v.sku ?? ''}
                            onChange={e => setVariants(prev => prev.map(x => x.id === v.id ? { ...x, sku: e.target.value } : x))}
                            placeholder="SKU"
                            className="w-full bg-transparent border border-transparent hover:bg-fog focus:bg-white rounded-md pl-2 pr-7 py-1.5 text-sm text-ink focus:border-ink/20 focus:outline-none transition-colors uppercase"
                          />
                          <button
                            type="button"
                            onClick={() => setScanningTarget(v.id)}
                            className="absolute right-1 p-1 text-dove hover:text-ink opacity-0 group-hover/sku:opacity-100 transition-all cursor-pointer"
                            title="Scan Barcode for SKU"
                          >
                            <ScanLine className="w-4 h-4" />
                          </button>
                        </div>
                      </td>

                      <td className="px-4 py-3 align-middle">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={v.price_override ?? ''}
                          onChange={e => setVariants(prev => prev.map(x => x.id === v.id ? { ...x, price_override: parseFloat(e.target.value) || null } : x))}
                          placeholder="Inherit"
                          className="w-full bg-transparent border border-transparent hover:bg-fog focus:bg-white rounded-md px-2 py-1.5 text-sm text-ink focus:border-ink/20 focus:outline-none transition-colors"
                        />
                      </td>

                      <td className="px-4 py-3 align-middle">
                        {v._isNew ? (
                          <input
                            type="number"
                            min="0"
                            value={v.stock}
                            onChange={e => setVariants(prev => prev.map(x => x.id === v.id ? { ...x, stock: parseInt(e.target.value, 10) || 0 } : x))}
                            placeholder="Initial"
                            className="w-20 bg-transparent border border-transparent hover:bg-fog focus:bg-white rounded-md px-2 py-1.5 text-sm text-ink focus:border-ink/20 focus:outline-none transition-colors"
                          />
                        ) : (
                          <div className="flex items-center gap-2 group/stock">
                            <span className="text-sm font-medium text-ink px-2">{v.stock}</span>
                            <button 
                              type="button"
                              onClick={() => setActiveTab('Inventory')}
                              className="text-[10px] text-ink/60 bg-fog hover:bg-ink/10 px-2 py-1 rounded transition-colors opacity-0 group-hover/stock:opacity-100"
                            >
                              Adjust
                            </button>
                          </div>
                        )}
                      </td>

                      <td className="px-4 py-3 align-middle text-right">
                        <button
                          type="button"
                          onClick={() => setVariants(prev => prev.map(x => x.id === v.id ? { ...x, _deleted: true } : x))}
                          className="p-1.5 text-graphite hover:text-rust transition-colors rounded-md hover:bg-rust/10"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <input
              ref={variantFileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={async (e) => {
                if (e.target.files && e.target.files[0] && variantImageTarget) {
                  const file = e.target.files[0];
                  const targetId = variantImageTarget;
                  const blobUrl = URL.createObjectURL(file);
                  setVariants(prev => prev.map(x => x.id === targetId ? { ...x, image_url: blobUrl, displayUrl: blobUrl } : x));
                  setVariantImageTarget(null);

                  const formData = new FormData();
                  formData.append('file', file);
                  formData.append('shopId', shopId);
                  try {
                    const res = await fetch('/api/inventory/upload-image', { method: 'POST', body: formData });
                    const data = await res.json();
                    if (data.url) {
                      setVariants(prev => prev.map(x => x.id === targetId ? { ...x, image_url: data.url, displayUrl: blobUrl } : x));
                    }
                  } catch (err) {
                    console.error('Variant image upload failed:', err);
                  }
                }
              }}
            />
          </div>
        )}
      </section>
    </div>
  );
}
