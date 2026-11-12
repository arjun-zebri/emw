import { Skeleton, SkeletonLines } from "@/components/ui/Skeleton";

/** A vendor page before its listing arrives: the back link, the cover on the left, the name and details on the right. */
export function VendorSkeleton() {
  return (
    <div className="pt-[var(--header-h)]" aria-busy="true">
      <div className="shell">
        <Skeleton className="my-5 h-[0.9rem] w-20" />
        <div className="grid grid-cols-1 gap-y-8 lg:grid-cols-12 lg:gap-x-[clamp(2rem,4vw,4.5rem)]">
          <Skeleton className="aspect-[4/5] w-full lg:col-span-7 lg:max-h-[calc(100svh-var(--header-h)-2rem)]" />
          <div className="lg:col-span-5 lg:col-start-8 lg:pt-1">
            <Skeleton className="h-[clamp(2.5rem,4.4vw,4.75rem)] w-4/5" />
            <Skeleton className="mt-5 h-4 w-3/5" />
            <Skeleton className="mt-4 h-6 w-2/5" />
            <SkeletonLines lines={3} className="mt-10 text-[1.5rem]" />
            <Skeleton className="mt-10 h-12 w-full sm:w-48" />
            <div className="mt-12 space-y-4 border-t hairline pt-6">
              {[0, 1, 2].map((i) => (
                <div key={i} className="flex gap-6">
                  <Skeleton className="h-4 w-24 shrink-0" />
                  <Skeleton className="h-4 flex-1" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
