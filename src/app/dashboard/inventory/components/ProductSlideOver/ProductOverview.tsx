import { useState } from 'react';
import { ChevronDown, AlertCircle } from 'lucide-react';

interface ProductOverviewProps {
  name: string;
  setName: (v: string) => void;
  description: string;
  setDescription: (v: string) => void;
  category: string;
  setCategory: (v: string) => void;
  categoryInput: string;
  setCategoryInput: (v: string) => void;
  showCategoryDropdown: boolean;
  setShowCategoryDropdown: (v: boolean) => void;
  existingCategories: string[];
  tags: string[];
  setTags: (tags: string[]) => void;
  tagInput: string;
  setTagInput: (v: string) => void;
  price: string;
  setPrice: (v: string) => void;
  compareAtPrice: string;
  setCompareAtPrice: (v: string) => void;
  costPrice: string;
  setCostPrice: (v: string) => void;
  sku: string;
  setSku: (v: string) => void;
  isActive: boolean;
  setIsActive: (v: boolean) => void;
  errors: Record<string, string>;
  suppliers: { id: string; name: string }[];
  defaultSupplierId: string;
  setDefaultSupplierId: (v: string) => void;
}

export default function ProductOverview(props: ProductOverviewProps) {
  const {
    name, setName, description, setDescription,
    category, setCategory, categoryInput, setCategoryInput, showCategoryDropdown, setShowCategoryDropdown, existingCategories,
    tags, setTags, tagInput, setTagInput,
    price, setPrice, compareAtPrice, setCompareAtPrice, costPrice, setCostPrice,
    sku, setSku, isActive, setIsActive,
    errors, suppliers, defaultSupplierId, setDefaultSupplierId
  } = props;

  const filteredCategories = existingCategories.filter(
    c => c.toLowerCase().includes(categoryInput.toLowerCase()) && c !== category
  );

  const handleAddTag = (t: string) => {
    const trimmed = t.trim();
    if (trimmed && !tags.includes(trimmed)) setTags([...tags, trimmed]);
    setTagInput('');
  };

  return (
    <div className="p-6 space-y-8 animate-in fade-in">
      
      {/* Basic Info */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-medium text-ash uppercase tracking-wider">Core Details</h3>
          <div className="flex items-center gap-2 bg-fog p-1 rounded-lg">
            <button
              type="button"
              onClick={() => setIsActive(false)}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${!isActive ? 'bg-white shadow-sm text-ink' : 'text-ash hover:text-ink'}`}
            >
              Hidden
            </button>
            <button
              type="button"
              onClick={() => setIsActive(true)}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${isActive ? 'bg-white shadow-sm text-green-600' : 'text-ash hover:text-ink'}`}
            >
              Live
            </button>
          </div>
        </div>
        
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-medium text-ash flex items-center justify-between">
              <span>Name <span className="text-rust">*</span></span>
              {errors.name && <span className="text-[11px] text-rust flex items-center gap-1"><AlertCircle className="w-3 h-3"/>{errors.name}</span>}
            </label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Everyday Canvas Tote Bag"
              className={`w-full bg-fog border ${errors.name ? 'border-rust/30 focus:border-rust/50' : 'border-transparent focus:border-ink/20'} rounded-inputs px-4 py-2.5 text-sm text-ink focus:outline-none`}
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-ash">Description</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Tell your customers about this product..."
              rows={4}
              className="w-full bg-fog border border-transparent rounded-inputs px-4 py-2.5 text-sm text-ink focus:border-ink/20 focus:outline-none resize-none"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-ash">SKU</label>
              <input
                type="text"
                value={sku}
                onChange={e => setSku(e.target.value)}
                placeholder="e.g. TOTE-001"
                className="w-full bg-fog border border-transparent rounded-inputs px-4 py-2.5 text-sm text-ink focus:border-ink/20 focus:outline-none uppercase"
              />
            </div>
            
            <div className="space-y-1 relative">
              <label className="text-xs font-medium text-ash">Category</label>
              {category ? (
                <div className="flex items-center justify-between bg-fog px-4 py-2.5 rounded-inputs border border-transparent">
                  <span className="text-sm text-ink">{category}</span>
                  <button type="button" onClick={() => { setCategory(''); setCategoryInput(''); }} className="text-xs text-rust hover:underline">
                    Remove
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <input
                    type="text"
                    value={categoryInput}
                    onChange={e => { setCategoryInput(e.target.value); setShowCategoryDropdown(true); }}
                    onFocus={() => setShowCategoryDropdown(true)}
                    onBlur={() => setTimeout(() => setShowCategoryDropdown(false), 200)}
                    placeholder="Search or add category…"
                    className="w-full bg-fog border border-transparent rounded-inputs px-4 py-2.5 text-sm text-ink focus:border-ink/20 focus:outline-none"
                  />
                  {showCategoryDropdown && (categoryInput.trim() || filteredCategories.length > 0) && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-dove/20 shadow-lg rounded-xl overflow-hidden z-20 py-1 max-h-48 overflow-y-auto">
                      {categoryInput.trim() && (
                        <button
                          type="button"
                          onClick={() => { setCategory(categoryInput.trim()); setShowCategoryDropdown(false); }}
                          className="w-full text-left px-4 py-2 text-sm text-ink hover:bg-fog"
                        >
                          Add new: <span className="font-semibold">"{categoryInput}"</span>
                        </button>
                      )}
                      {filteredCategories.map(c => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => { setCategory(c); setShowCategoryDropdown(false); }}
                          className="w-full text-left px-4 py-2 text-sm text-ink hover:bg-fog"
                        >
                          {c}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
          
          <div className="space-y-1">
            <label className="text-xs font-medium text-ash flex items-center justify-between">
              <span>Tags</span>
              <span className="text-[10px] text-dove">{tags.length} tags</span>
            </label>
            <div className="bg-fog p-1.5 rounded-inputs border border-transparent focus-within:border-ink/20 flex flex-wrap gap-1.5 items-center min-h-[44px]">
              {tags.map(t => (
                <span key={t} className="bg-white border border-dove/10 text-ink text-[11px] px-2 py-1 rounded-md flex items-center gap-1 shadow-sm">
                  {t}
                  <button type="button" onClick={() => setTags(tags.filter(x => x !== t))} className="text-ash hover:text-rust ml-0.5">
                    &times;
                  </button>
                </span>
              ))}
              <input
                type="text"
                value={tagInput}
                onChange={e => setTagInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' || e.key === ',') {
                    e.preventDefault();
                    handleAddTag(tagInput);
                  } else if (e.key === 'Backspace' && !tagInput && tags.length > 0) {
                    setTags(tags.slice(0, -1));
                  }
                }}
                onBlur={() => handleAddTag(tagInput)}
                placeholder={tags.length === 0 ? "e.g. new arrival, summer..." : ""}
                className="flex-1 min-w-[120px] bg-transparent text-sm text-ink focus:outline-none px-2 py-1 placeholder:text-dove"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="space-y-4">
        <h3 className="text-xs font-medium text-ash uppercase tracking-wider">Pricing</h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-1">
            <label className="text-xs font-medium text-ash flex items-center justify-between">
              <span>Price <span className="text-rust">*</span></span>
              {errors.price && <span className="text-[10px] text-rust flex items-center gap-1"><AlertCircle className="w-3 h-3"/></span>}
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-ash font-medium">৳</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={price}
                onChange={e => setPrice(e.target.value)}
                className={`w-full bg-fog border ${errors.price ? 'border-rust/30 focus:border-rust/50' : 'border-transparent focus:border-ink/20'} rounded-inputs pl-8 pr-4 py-2.5 text-sm text-ink focus:outline-none`}
              />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-ash">Compare-at Price</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-ash font-medium">৳</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={compareAtPrice}
                onChange={e => setCompareAtPrice(e.target.value)}
                className="w-full bg-fog border border-transparent rounded-inputs pl-8 pr-4 py-2.5 text-sm text-ink focus:border-ink/20 focus:outline-none line-through decoration-ash"
              />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-ash">Cost per item</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-ash font-medium">৳</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={costPrice}
                onChange={e => setCostPrice(e.target.value)}
                className="w-full bg-fog border border-transparent rounded-inputs pl-8 pr-4 py-2.5 text-sm text-ink focus:border-ink/20 focus:outline-none"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Supplier */}
      {suppliers.length > 0 && (
        <section className="space-y-4">
          <h3 className="text-xs font-medium text-ash uppercase tracking-wider">Procurement</h3>
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
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-graphite pointer-events-none" />
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
