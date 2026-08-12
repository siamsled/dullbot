import { InventoryTableSkeleton } from '@/components/ui/SkeletonLoaders';

export default function InventoryLoading() {
  return <InventoryTableSkeleton count={6} />;
}
