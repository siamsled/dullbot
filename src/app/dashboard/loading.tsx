import UiverseLoader from '@/components/ui/UiverseLoader';

export default function DashboardLoading() {
  return (
    <div className="h-full w-full flex items-center justify-center p-8 bg-fog/50 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-4 text-ash">
        <UiverseLoader className="w-10 h-10" />
        <p className="text-sm font-medium tracking-wide">Loading workspace...</p>
      </div>
    </div>
  );
}
