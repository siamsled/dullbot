import { Loader2, AlertCircle } from 'lucide-react';
import { StockMovement } from './productForm.types';

interface ProductActivityProps {
  isNew: boolean;
  movements: StockMovement[];
  movementsLoaded: boolean;
}

export default function ProductActivity({ isNew, movements, movementsLoaded }: ProductActivityProps) {
  if (isNew) {
    return (
      <div className="p-6 h-[400px] flex items-center justify-center flex-col gap-2 text-ash text-sm animate-in fade-in">
        <AlertCircle className="w-6 h-6 text-dove" />
        <p>No activity yet.</p>
        <p className="text-xs text-dove text-center max-w-sm">
          Once this product is saved, inventory movements will be recorded here.
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 animate-in fade-in">
      <h3 className="text-xs font-medium text-ash uppercase tracking-wider">Stock Movement Timeline</h3>

      {!movementsLoaded ? (
        <div className="flex items-center justify-center gap-2 text-ash text-sm py-12">
          <Loader2 className="w-5 h-5 animate-spin" />
          Loading activity…
        </div>
      ) : movements.length === 0 ? (
        <div className="flex items-center justify-center flex-col gap-2 text-ash text-sm py-12 border border-dashed border-dove/20 rounded-xl">
          <p>No stock movements recorded.</p>
        </div>
      ) : (
        <div className="relative border-l-2 border-dove/10 ml-3 space-y-8 pb-8">
          {movements.map((m, idx) => {
            const isPos = m.quantity_delta > 0;
            return (
              <div key={m.id} className="relative pl-6">
                <span className={`absolute -left-[9px] top-1 w-4 h-4 rounded-full border-2 border-white ${
                  isPos ? 'bg-green-500' : 'bg-rust'
                }`} />
                
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-ink capitalize">
                        {m.change_type.replace('_', ' ')}
                      </span>
                      {m.suppliers?.name && (
                        <span className="text-[11px] text-dove bg-fog px-1.5 py-0.5 rounded">
                          via {m.suppliers.name}
                        </span>
                      )}
                    </div>
                    {m.note && <p className="text-sm text-ash mt-1">{m.note}</p>}
                    
                    <p className="text-[11px] text-dove mt-1.5 font-medium">
                      {new Date(m.created_at).toLocaleString('en-BD', {
                        day: 'numeric', month: 'short', year: 'numeric',
                        hour: 'numeric', minute: '2-digit'
                      })}
                    </p>
                  </div>
                  
                  <div className="text-right shrink-0 bg-fog px-3 py-1.5 rounded-lg border border-dove/10">
                    <p className={`text-lg font-semibold tracking-tight ${isPos ? 'text-green-700' : 'text-rust'}`}>
                      {isPos ? '+' : ''}{m.quantity_delta}
                    </p>
                    <p className="text-[10px] text-ash font-medium uppercase tracking-wider mt-0.5">
                      → {m.resulting_stock}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
