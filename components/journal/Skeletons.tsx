import { Skeleton, SkeletonLines } from "@/components/ui/Skeleton";

/** The journal before its posts arrive: the lead spread, then a row of cards. */
export function JournalSkeleton() {
  return (
    <div aria-busy="true">
      <div className="grid grid-cols-1 items-end gap-x-[clamp(1.5rem,4vw,4.5rem)] gap-y-6 lg:grid-cols-12">
        <Skeleton className="aspect-[3/2] w-full lg:col-span-7" />
        <div className="lg:col-span-5 lg:pb-2">
          <Skeleton className="h-[clamp(1.75rem,2.6vw,2.6rem)] w-4/5" />
          <SkeletonLines lines={2} className="mt-5 max-w-[40ch]" />
          <Skeleton className="mt-6 h-3.5 w-32" />
        </div>
      </div>
      <CardsSkeleton className="mt-[clamp(3rem,6vw,5rem)]" />
    </div>
  );
}

export function CardsSkeleton({ className }: { className?: string }) {
  return (
    <div aria-busy="true" className={`grid grid-cols-1 gap-x-[clamp(1rem,1.6vw,1.5rem)] gap-y-12 md:grid-cols-2 lg:grid-cols-3 ${className ?? ""}`}>
      {[0, 1, 2].map((i) => (
        <div key={i} className={i === 2 ? "max-lg:hidden" : i === 1 ? "max-md:hidden" : undefined}>
          <Skeleton className="aspect-[4/5] w-full" />
          <Skeleton className="mt-4 h-5 w-3/4" />
          <Skeleton className="mt-2.5 h-3.5 w-28" />
        </div>
      ))}
    </div>
  );
}

/** A post before it arrives: the title, standfirst and line, the cover, and the opening paragraphs. */
export function PostSkeleton() {
  return (
    <div aria-busy="true" className="pt-[clamp(2rem,5vw,4.5rem)]">
      <div className="shell">
        <div className="mx-auto max-w-[42rem]">
          <Skeleton className="h-[clamp(2.5rem,5.2vw,5rem)] w-full" />
          <Skeleton className="mt-3 h-[clamp(2.5rem,5.2vw,5rem)] w-3/5" />
          <SkeletonLines lines={2} className="mt-7 max-w-[40ch] text-[1.25rem]" />
          <Skeleton className="mt-7 h-3.5 w-48" />
        </div>
      </div>
      <div className="shell mt-[clamp(2rem,4vw,3.5rem)]">
        <Skeleton className="mx-auto aspect-[3/2] max-h-[88vh] w-full max-w-[81.25rem]" />
      </div>
      <div className="shell mt-[clamp(2.5rem,5vw,4rem)]">
        <SkeletonLines lines={5} className="mx-auto max-w-[42rem] text-[1.0625rem] leading-[1.8]" />
      </div>
    </div>
  );
}
