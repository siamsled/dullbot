import { OrdersListSkeleton } from '@/components/ui/SkeletonLoaders';

export default function OrdersLoading() {
  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between pb-4 border-b border-dove/10 animate-pulse">
        <div className="space-y-2">
          <div className="h-7 w-32 bg-dove/25 rounded-xl" />
          <div className="h-3.5 w-64 bg-dove/15 rounded-md" />
        </div>
        <div className="h-9 w-32 bg-fog rounded-xl border border-dove/15" />
      </div>
      <OrdersListSkeleton count={4} />
    </div>
  );
}
