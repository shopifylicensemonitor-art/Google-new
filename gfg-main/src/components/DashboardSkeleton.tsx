import { Skeleton } from '@/components/ui/skeleton';

export function DashboardSkeleton() {
  return (
    <div className="space-y-6 max-w-[1440px] mx-auto pb-6 animate-pulse">
      {/* Header Skeleton */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64 rounded-lg" />
          <Skeleton className="h-4 w-80 rounded-md" />
        </div>
        <div className="flex items-center gap-3">
          <Skeleton className="h-9 w-36 rounded-lg" />
          <Skeleton className="h-9 w-32 rounded-lg" />
        </div>
      </div>

      {/* Top Row: Attention + Key Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Needs Attention Bento Card */}
        <div className="lg:col-span-1 bg-card border border-border/60 rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <Skeleton className="h-5 w-36 rounded-md" />
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
          <div className="space-y-3">
            <Skeleton className="h-16 w-full rounded-lg" />
            <Skeleton className="h-16 w-full rounded-lg" />
          </div>
        </div>

        {/* 3 Metric Cards */}
        <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-card border border-border/60 rounded-xl p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <Skeleton className="h-10 w-10 rounded-lg" />
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
              <div className="space-y-2 mt-4">
                <Skeleton className="h-3.5 w-24 rounded-md" />
                <Skeleton className="h-8 w-20 rounded-md" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Content Area: Activity Feed + Recent Replies */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Activity Feed */}
        <div className="lg:col-span-2 bg-card border border-border/60 rounded-xl shadow-sm overflow-hidden flex flex-col">
          <div className="px-6 py-4 border-b border-border/60 flex items-center justify-between">
            <Skeleton className="h-5 w-32 rounded-md" />
            <Skeleton className="h-4 w-24 rounded-md" />
          </div>
          <div className="p-6 space-y-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex gap-4 items-start">
                <Skeleton className="h-8 w-8 rounded-full shrink-0" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-48 rounded-md" />
                  <Skeleton className="h-3 w-3/4 rounded-md" />
                  <Skeleton className="h-2.5 w-20 rounded-md" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Replies Panel */}
        <div className="lg:col-span-1 bg-card border border-border/60 rounded-xl shadow-sm overflow-hidden flex flex-col h-[480px]">
          <div className="px-5 py-4 border-b border-border/60 flex items-center justify-between">
            <Skeleton className="h-5 w-32 rounded-md" />
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
          <div className="p-4 space-y-4 flex-1">
            {[1, 2, 3].map((i) => (
              <div key={i} className="space-y-2 pt-2 first:pt-0">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-4 w-28 rounded-md" />
                  <Skeleton className="h-3 w-12 rounded-md" />
                </div>
                <Skeleton className="h-3 w-full rounded-md" />
                <Skeleton className="h-3 w-4/5 rounded-md" />
                <Skeleton className="h-4 w-20 rounded-full" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Campaigns Table & Dispatch Queue */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-card border border-border/60 rounded-xl p-5 space-y-4">
          <Skeleton className="h-5 w-48 rounded-md" />
          <div className="space-y-3 pt-2">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-12 w-full rounded-lg" />
            ))}
          </div>
        </div>
        <div className="lg:col-span-1 bg-card border border-border/60 rounded-xl p-5 space-y-4">
          <Skeleton className="h-5 w-36 rounded-md" />
          <div className="space-y-3 pt-2">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-10 w-full rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
