import { Skeleton } from '@/components/ui/skeleton';

export function InboxSkeleton() {
  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-7rem)] bg-card rounded-xl border border-border shadow-sm overflow-hidden animate-pulse">
      {/* Left List Pane Skeleton */}
      <div className="w-full lg:w-96 border-r border-border flex flex-col h-full bg-card">
        {/* Search & Filter Header */}
        <div className="p-3 border-b border-border space-y-3">
          <Skeleton className="h-9 w-full rounded-lg" />
          <div className="flex gap-2 overflow-x-auto pb-1">
            <Skeleton className="h-6 w-14 rounded-full shrink-0" />
            <Skeleton className="h-6 w-16 rounded-full shrink-0" />
            <Skeleton className="h-6 w-18 rounded-full shrink-0" />
            <Skeleton className="h-6 w-20 rounded-full shrink-0" />
          </div>
        </div>

        {/* Message Item List Skeletons */}
        <div className="flex-1 overflow-y-auto p-3 space-y-3 divide-y divide-border/20">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="pt-3 first:pt-0 space-y-2">
              <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-32 rounded-md" />
                <Skeleton className="h-3 w-12 rounded-md" />
              </div>
              <Skeleton className="h-3.5 w-48 rounded-md" />
              <Skeleton className="h-3 w-full rounded-md" />
              <div className="flex items-center justify-between pt-1">
                <Skeleton className="h-4 w-16 rounded-full" />
                <Skeleton className="h-3.5 w-20 rounded-md" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right Detail Pane Skeleton */}
      <div className="hidden lg:flex flex-1 flex-col h-full bg-background/50">
        {/* Header */}
        <div className="p-4 border-b border-border bg-card flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-40 rounded-md" />
              <Skeleton className="h-3 w-56 rounded-md" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-20 rounded-lg" />
            <Skeleton className="h-8 w-20 rounded-lg" />
          </div>
        </div>

        {/* Message Body */}
        <div className="flex-1 p-6 space-y-4 overflow-y-auto">
          <Skeleton className="h-5 w-3/4 rounded-md" />
          <div className="space-y-2 pt-2">
            <Skeleton className="h-3.5 w-full rounded-md" />
            <Skeleton className="h-3.5 w-full rounded-md" />
            <Skeleton className="h-3.5 w-5/6 rounded-md" />
            <Skeleton className="h-3.5 w-2/3 rounded-md" />
          </div>
        </div>

        {/* Reply Box Skeleton */}
        <div className="p-4 border-t border-border bg-card space-y-3">
          <Skeleton className="h-24 w-full rounded-lg" />
          <div className="flex items-center justify-between">
            <Skeleton className="h-8 w-28 rounded-lg" />
            <Skeleton className="h-8 w-24 rounded-lg" />
          </div>
        </div>
      </div>
    </div>
  );
}
