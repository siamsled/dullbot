import { X } from 'lucide-react';
import { Product } from './productForm.types';

type Tab = 'Overview' | 'Media' | 'Variants' | 'Inventory' | 'Activity';

interface ProductHeaderProps {
  product?: Product;
  isNew: boolean;
  name: string; // From form state, so it updates in real time
  sku: string; // From form state
  images: { url: string }[];
  isActive: boolean;
  hasUnsavedChanges: boolean;
  activeTab: Tab;
  setActiveTab: (tab: Tab) => void;
  onClose: () => void;
  // Badge counts
  mediaCount: number;
  variantsCount: number;
  totalStock: number;
  activityCount: number;
}

export default function ProductHeader({
  product,
  isNew,
  name,
  sku,
  images,
  isActive,
  hasUnsavedChanges,
  activeTab,
  setActiveTab,
  onClose,
  mediaCount,
  variantsCount,
  totalStock,
  activityCount
}: ProductHeaderProps) {
  
  const displayTitle = name.trim() || (isNew ? 'New Product' : 'Untitled Product');
  const primaryImage = images.length > 0 ? images[0].url : null;

  const tabs: { id: Tab; label: string; badge?: string | number }[] = [
    { id: 'Overview', label: 'Overview' },
    { id: 'Media', label: 'Media', badge: mediaCount > 0 ? mediaCount : undefined },
    { id: 'Variants', label: 'Variants', badge: variantsCount > 0 ? variantsCount : undefined },
    { id: 'Inventory', label: 'Inventory', badge: `${totalStock} in stock` },
    { id: 'Activity', label: 'Activity', badge: activityCount > 0 ? activityCount : undefined },
  ];

  return (
    <div className="bg-white border-b border-dove/10 sticky top-0 z-20 flex flex-col shrink-0">
      <div className="px-6 py-4 flex items-start justify-between gap-4">
        <div className="flex items-center gap-4 min-w-0">
          {primaryImage ? (
            <img src={primaryImage} alt="" className="w-12 h-12 rounded-lg object-cover border border-dove/10 shrink-0 bg-fog" />
          ) : (
            <div className="w-12 h-12 rounded-lg border border-dove/10 bg-fog shrink-0" />
          )}
          
          <div className="min-w-0 flex flex-col justify-center">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-ink truncate">{displayTitle}</h2>
              {hasUnsavedChanges && (
                <span className="flex items-center gap-1 text-[10px] uppercase font-bold tracking-wider text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                  Unsaved changes
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-0.5 text-xs text-ash">
              <span className="truncate">{sku || 'No SKU'}</span>
              <span className="text-dove">•</span>
              <span className={isActive ? 'text-green-600 font-medium' : 'text-ash font-medium'}>
                {isActive ? 'Live' : 'Hidden'}
              </span>
            </div>
          </div>
        </div>
        
        <button
          type="button"
          onClick={onClose}
          className="p-2 -mr-2 text-ash hover:text-ink hover:bg-fog rounded-full transition-colors shrink-0"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="px-6 flex items-center gap-6 overflow-x-auto no-scrollbar border-t border-dove/5 pt-1">
        {tabs.map(tab => {
          const isSelected = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`pb-3 pt-2 text-sm font-medium transition-colors border-b-2 whitespace-nowrap flex items-center gap-2 ${
                isSelected 
                  ? 'border-ink text-ink' 
                  : 'border-transparent text-ash hover:text-ink'
              }`}
            >
              {tab.label}
              {tab.badge !== undefined && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                  isSelected ? 'bg-ink/5 text-ink' : 'bg-fog text-graphite'
                }`}>
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
