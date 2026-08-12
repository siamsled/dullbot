import { ConversationListSkeleton, MessageThreadSkeleton } from '@/components/ui/SkeletonLoaders';

export default function InboxLoading() {
  return (
    <div className="h-full flex overflow-hidden bg-fog/30">
      <div className="w-80 border-r border-dove/10 bg-white hidden md:block shrink-0">
        <div className="p-4 border-b border-dove/10">
          <div className="h-5 w-24 bg-dove/25 rounded-md animate-pulse" />
        </div>
        <ConversationListSkeleton count={7} />
      </div>
      <div className="flex-1 flex flex-col bg-white min-w-0">
        <div className="h-16 px-6 border-b border-dove/10 flex items-center justify-between animate-pulse">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-dove/20" />
            <div className="space-y-1.5">
              <div className="h-4 w-32 bg-dove/25 rounded-md" />
              <div className="h-2.5 w-16 bg-dove/15 rounded-md" />
            </div>
          </div>
        </div>
        <MessageThreadSkeleton />
      </div>
    </div>
  );
}
