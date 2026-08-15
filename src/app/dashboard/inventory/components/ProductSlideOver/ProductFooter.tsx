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
    <div className="sticky bottom-0 bg-white/70 dark:bg-zinc-950/70 backdrop-blur-xl border-t border-zinc-200/50 dark:border-zinc-800/50 p-5 sm:p-6 flex justify-end items-center gap-3 z-20 shrink-0 shadow-xs">
      <button
        type="button"
        onClick={onCancel}
        disabled={isPending}
        className="px-5 py-2.5 rounded-xl text-sm font-semibold text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100/80 dark:hover:bg-zinc-800/80 transition-all cursor-pointer disabled:opacity-50 active:scale-[0.98]"
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
