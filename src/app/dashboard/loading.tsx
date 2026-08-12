import UiverseLoader from '@/components/ui/UiverseLoader';

export default function DashboardLoading() {
  return (
    <div className="h-full w-full min-h-[60vh] flex items-center justify-center p-8 bg-fog/50 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-6 text-ash">
        <UiverseLoader size="md" />
        <p className="text-sm font-medium tracking-wide text-graphite animate-pulse">Loading workspace...</p>
      </div>
    </div>
  );
}
