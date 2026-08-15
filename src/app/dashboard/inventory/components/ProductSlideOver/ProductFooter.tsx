import { Loader2 } from 'lucide-react';
import UiverseGlowButton from '@/components/ui/UiverseGlowButton';

interface ProductFooterProps {
  isPending: boolean;
  hasUnsavedChanges: boolean;
  onSave: () => void;
  onCancel: () => void;
}

export default function ProductFooter({ isPending, hasUnsavedChanges, onSave, onCancel }: ProductFooterProps) {
  return (
    <div className="sticky bottom-0 bg-white border-t border-dove/10 p-6 flex justify-end gap-3 z-20 shrink-0">
      <button
        type="button"
        onClick={onCancel}
        disabled={isPending}
        className="px-6 py-2.5 rounded-inputs text-sm font-medium text-graphite hover:text-ink hover:bg-fog transition-colors disabled:opacity-50"
      >
        Cancel
      </button>
      
      <div className="relative">
        <UiverseGlowButton 
          onClick={onSave} 
          disabled={isPending || !hasUnsavedChanges}
        >
          {isPending ? (
            <span className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" /> Saving...
            </span>
          ) : (
            'Save Changes'
          )}
        </UiverseGlowButton>
      </div>
    </div>
  );
}
