import { AnalyticsSkeleton } from '@/components/ui/SkeletonLoaders';

export default function AnalyticsLoading() {
  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between pb-4 border-b border-dove/10 animate-pulse">
        <div className="space-y-2">
          <div className="h-7 w-32 bg-dove/25 rounded-xl" />
          <div className="h-3.5 w-56 bg-dove/15 rounded-md" />
        </div>
      </div>
      <AnalyticsSkeleton />
    </div>
  );
}
