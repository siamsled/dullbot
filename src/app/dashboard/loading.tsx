import { Loader2 } from 'lucide-react';

export default function DashboardLoading() {
  return (
    <div className="h-full w-full flex items-center justify-center p-8">
      <div className="flex flex-col items-center gap-3 text-ash">
        <Loader2 className="w-8 h-8 animate-spin" />
        <p className="text-sm font-medium">Loading...</p>
      </div>
    </div>
  );
}
